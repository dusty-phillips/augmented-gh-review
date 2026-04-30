import client/event_source
import client/model.{
  type Msg, CommentPosted, GotAnalysis, GotGithubComments, GotPrDetail, GotPrs,
  RefreshPrs, RefreshedPrs, ReviewSubmitted, SseAnalysisComplete,
  SseAnalysisError, SseConnectionError, SseHeartbeat,
}
import gleam/dynamic/decode
import gleam/int
import gleam/json
import gleam/option
import gleam/result
import lustre/effect
import modem
import plinth/javascript/global
import rsvp
import shared/pr

pub fn fetch_prs(repo: String) -> effect.Effect(Msg) {
  rsvp.get(
    "/api/prs?repo=" <> repo,
    rsvp.expect_json(pr.pr_groups_decoder(), GotPrs),
  )
}

/// Like `fetch_prs`, but dispatches `RefreshedPrs` so the update loop can
/// merge the response with existing state instead of replacing it wholesale.
/// Used by the silent background refresh.
pub fn refresh_prs(repo: String) -> effect.Effect(Msg) {
  rsvp.get(
    "/api/prs?repo=" <> repo,
    rsvp.expect_json(pr.pr_groups_decoder(), RefreshedPrs),
  )
}

pub fn fetch_pr_detail(repo: String, number: Int) -> effect.Effect(Msg) {
  rsvp.get(
    "/api/prs/" <> int.to_string(number) <> "?repo=" <> repo,
    rsvp.expect_json(pr.pr_detail_decoder(), GotPrDetail),
  )
}

pub fn analyze_pr(repo: String, number: Int) -> effect.Effect(Msg) {
  rsvp.post(
    "/api/prs/" <> int.to_string(number) <> "/analyze?repo=" <> repo,
    json.object([]),
    rsvp.expect_json(pr.analysis_result_decoder(), GotAnalysis),
  )
}

pub fn fetch_github_comments(
  repo: String,
  number: Int,
) -> effect.Effect(Msg) {
  rsvp.get(
    "/api/prs/"
      <> int.to_string(number)
      <> "/comments?repo="
      <> repo,
    rsvp.expect_json(
      decode.list(pr.pr_comment_decoder()),
      GotGithubComments,
    ),
  )
}

/// Start an SSE connection to stream the analysis
pub fn analyze_pr_stream(repo: String, number: Int) -> effect.Effect(Msg) {
  effect.from(fn(dispatch) {
    let url =
      "/api/prs/"
      <> int.to_string(number)
      <> "/analyze-stream?repo="
      <> repo

    let _source =
      event_source.connect(
        url,
        fn(event_name, data) {
          case event_name {
            "analysis_complete" -> dispatch(SseAnalysisComplete(data))
            "analysis_error" -> dispatch(SseAnalysisError(data))
            "heartbeat" -> dispatch(SseHeartbeat(data))
            _ -> Nil
          }
        },
        fn(error_msg) { dispatch(SseConnectionError(error_msg)) },
      )

    Nil
  })
}

pub fn push_url(path: String) -> effect.Effect(Msg) {
  modem.push(path, option.None, option.None)
}

pub fn post_github_comment(
  repo: String,
  number: Int,
  body: String,
  path: String,
  line: Int,
) -> effect.Effect(Msg) {
  rsvp.post(
    "/api/prs/"
      <> int.to_string(number)
      <> "/comments?repo="
      <> repo,
    json.object([
      #("body", json.string(body)),
      #("path", json.string(path)),
      #("line", json.int(line)),
    ]),
    rsvp.expect_ok_response(fn(resp) {
      CommentPosted(result.map(resp, fn(_response) { Nil }))
    }),
  )
}

pub fn submit_review(
  repo: String,
  number: Int,
  event: String,
  body: String,
) -> effect.Effect(Msg) {
  rsvp.post(
    "/api/prs/"
      <> int.to_string(number)
      <> "/review?repo="
      <> repo,
    json.object([
      #("event", json.string(event)),
      #("body", json.string(body)),
    ]),
    rsvp.expect_ok_response(fn(resp) {
      ReviewSubmitted(result.map(resp, fn(_response) { Nil }))
    }),
  )
}

@external(javascript, "./scroll_ffi.mjs", "scrollToTop")
fn do_scroll_to_top() -> Nil

pub fn scroll_to_top() -> effect.Effect(Msg) {
  effect.from(fn(_dispatch) { do_scroll_to_top() })
}

/// Start a background timer that dispatches RefreshPrs every 2 minutes.
pub fn start_auto_refresh() -> effect.Effect(Msg) {
  effect.from(fn(dispatch) {
    let _timer_id = global.set_interval(120_000, fn() { dispatch(RefreshPrs) })
    Nil
  })
}

pub fn reply_to_comment(
  repo: String,
  number: Int,
  comment_id: Int,
  body: String,
) -> effect.Effect(Msg) {
  rsvp.post(
    "/api/prs/"
      <> int.to_string(number)
      <> "/reply?repo="
      <> repo,
    json.object([
      #("comment_id", json.int(comment_id)),
      #("body", json.string(body)),
    ]),
    rsvp.expect_ok_response(fn(resp) {
      CommentPosted(result.map(resp, fn(_response) { Nil }))
    }),
  )
}
