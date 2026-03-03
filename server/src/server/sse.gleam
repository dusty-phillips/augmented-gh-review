import gleam/bytes_tree
import gleam/erlang/process.{type Subject}
import gleam/http
import gleam/http/request
import gleam/http/response
import gleam/int
import gleam/json
import gleam/list
import gleam/otp/actor
import gleam/string
import gleam/string_tree
import mist
import server/analyzer
import server/github
import shared/pr
import wisp

/// Messages the SSE actor can receive
pub type SseMsg {
  /// Analysis completed successfully
  AnalysisDone(pr.AnalysisResult)
  /// Analysis failed with an error message
  AnalysisError(String)
  /// Send a heartbeat to keep the connection alive
  Heartbeat
}

/// State for the SSE actor
pub type SseState {
  SseState(heartbeat_count: Int, self: Subject(SseMsg))
}

/// Check if this is an SSE analysis request and handle it at the Mist level.
/// Returns Ok(response) if handled, Error(Nil) if it should be passed to Wisp.
pub fn maybe_handle_sse(
  req: request.Request(mist.Connection),
) -> Result(response.Response(mist.ResponseData), Nil) {
  case request.path_segments(req) {
    ["api", "prs", number_str, "analyze-stream"] -> {
      case req.method {
        http.Get -> {
          case get_query_value(req, "repo") {
            Error(_) -> {
              Ok(json_error_response("Missing repo query parameter", 400))
            }
            Ok(repo) -> {
              case int.parse(number_str) {
                Error(_) -> {
                  Ok(json_error_response("Invalid PR number", 400))
                }
                Ok(number) -> {
                  Ok(handle_sse_analyze(req, repo, number))
                }
              }
            }
          }
        }
        _ -> Error(Nil)
      }
    }
    _ -> Error(Nil)
  }
}

fn json_error_response(
  msg: String,
  status: Int,
) -> response.Response(mist.ResponseData) {
  let body =
    json.object([#("error", json.string(msg))])
    |> json.to_string
  response.new(status)
  |> response.set_body(mist.Bytes(
    bytes_tree.from_string(body),
  ))
}

fn get_query_value(
  req: request.Request(mist.Connection),
  key: String,
) -> Result(String, Nil) {
  case request.get_query(req) {
    Ok(params) -> list.key_find(params, key)
    Error(_) -> Error(Nil)
  }
}

fn handle_sse_analyze(
  req: request.Request(mist.Connection),
  repo: String,
  number: Int,
) -> response.Response(mist.ResponseData) {
  let initial_resp =
    response.new(200)
    |> response.set_header("access-control-allow-origin", "*")
    |> response.set_header("access-control-allow-methods", "GET")

  mist.server_sent_events(
    request: req,
    initial_response: initial_resp,
    init: fn(subject) {
      // Start the analysis in a background process
      let _pid =
        process.spawn(fn() {
          run_analysis(subject, repo, number)
        })

      // Schedule first heartbeat
      let _ = process.send_after(subject, 3000, Heartbeat)

      Ok(actor.initialised(SseState(heartbeat_count: 0, self: subject)))
    },
    loop: fn(state, msg, conn) {
      case msg {
        AnalysisDone(analysis) -> {
          // Send the analysis result as an SSE event
          let body =
            pr.encode_analysis_result(analysis)
            |> json.to_string
          let event =
            mist.event(string_tree.from_string(body))
            |> mist.event_name("analysis_complete")
          let _ = mist.send_event(conn, event)

          // Send a "done" event to signal the client to close
          let done_event =
            mist.event(string_tree.from_string(""))
            |> mist.event_name("done")
          let _ = mist.send_event(conn, done_event)

          actor.stop()
        }
        AnalysisError(error_msg) -> {
          // Send error as an SSE event
          let body =
            json.object([#("error", json.string(error_msg))])
            |> json.to_string
          let event =
            mist.event(string_tree.from_string(body))
            |> mist.event_name("analysis_error")
          let _ = mist.send_event(conn, event)

          let done_event =
            mist.event(string_tree.from_string(""))
            |> mist.event_name("done")
          let _ = mist.send_event(conn, done_event)

          actor.stop()
        }
        Heartbeat -> {
          let new_count = state.heartbeat_count + 1
          let body =
            json.object([
              #("count", json.int(new_count)),
              #("message", json.string("Analyzing...")),
            ])
            |> json.to_string
          let event =
            mist.event(string_tree.from_string(body))
            |> mist.event_name("heartbeat")
          let _ = mist.send_event(conn, event)

          // Schedule next heartbeat
          let _ = process.send_after(state.self, 3000, Heartbeat)

          actor.continue(SseState(..state, heartbeat_count: new_count))
        }
      }
    },
  )
}

fn run_analysis(subject: Subject(SseMsg), repo: String, number: Int) -> Nil {
  case github.get_pr_detail(repo, number) {
    Error(msg) -> {
      process.send(subject, AnalysisError("GitHub fetch failed: " <> msg))
    }
    Ok(pr_detail) -> {
      wisp.log_info(
        "SSE: Analyzing PR #"
        <> int.to_string(number)
        <> " ("
        <> int.to_string(string.length(pr_detail.diff))
        <> " chars of diff)",
      )
      case analyzer.analyze_pr(pr_detail) {
        Ok(analysis) -> {
          wisp.log_info(
            "SSE: Analysis complete for PR #" <> int.to_string(number),
          )
          process.send(subject, AnalysisDone(analysis))
        }
        Error(msg) -> {
          wisp.log_error("SSE: Analysis failed: " <> msg)
          process.send(subject, AnalysisError(msg))
        }
      }
    }
  }
}
