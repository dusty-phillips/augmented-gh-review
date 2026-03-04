import gleam/dynamic/decode
import gleam/http
import gleam/int
import gleam/json
import gleam/list
import gleam/string
import server/analyzer
import server/github
import shared/pr
import wisp.{type Request, type Response}

const index_html = "<!DOCTYPE html>
<html>
<head>
<meta charset=\"utf-8\">
<title>Augmented Review</title>
<link rel=\"stylesheet\" href=\"https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200&display=swap\" />
<link rel=\"stylesheet\" href=\"https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/styles/atom-one-light.min.css\">
<script src=\"https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/highlight.min.js\"></script>
<style>
@keyframes spin { to { transform: rotate(360deg); } }
.hover-underline:hover { text-decoration: underline !important; }
</style>
</head>
<body><div id=\"app\"></div><script type=\"module\" src=\"/static/client.js\"></script></body>
</html>"

pub fn handle_request(req: Request) -> Response {
  use req <- middleware(req)

  case wisp.path_segments(req) {
    // GET / -> serve index HTML
    [] ->
      case req.method {
        http.Get -> wisp.html_response(index_html, 200)
        _ -> wisp.method_not_allowed(allowed: [http.Get])
      }

    // API routes
    ["api", ..rest] -> handle_api(req, rest)

    // Static files
    ["static", ..] -> wisp.not_found()

    // SPA fallback: serve index HTML for all non-API, non-static routes
    _ -> wisp.html_response(index_html, 200)
  }
}

fn middleware(req: Request, next: fn(Request) -> Response) -> Response {
  let req = wisp.method_override(req)
  use <- wisp.log_request(req)
  use <- wisp.serve_static(req, under: "/static", from: static_directory())

  next(req)
}

fn static_directory() -> String {
  let assert Ok(priv) = wisp.priv_directory("server")
  priv <> "/static"
}

fn handle_api(req: Request, path: List(String)) -> Response {
  case path {
    // GET /api/prs?repo=<repo>
    ["prs"] ->
      case req.method {
        http.Get -> handle_list_prs(req)
        _ -> wisp.method_not_allowed(allowed: [http.Get])
      }

    // GET /api/prs/:number?repo=<repo>
    ["prs", number_str] ->
      case req.method {
        http.Get -> handle_get_pr_detail(req, number_str)
        _ -> wisp.method_not_allowed(allowed: [http.Get])
      }

    // POST /api/prs/:number/analyze?repo=<repo>
    ["prs", number_str, "analyze"] ->
      case req.method {
        http.Post -> handle_analyze_pr(req, number_str)
        _ -> wisp.method_not_allowed(allowed: [http.Post])
      }

    // GET/POST /api/prs/:number/comments?repo=<repo>
    ["prs", number_str, "comments"] ->
      case req.method {
        http.Get -> handle_get_pr_comments(req, number_str)
        http.Post -> handle_post_pr_comment(req, number_str)
        _ -> wisp.method_not_allowed(allowed: [http.Get, http.Post])
      }

    // POST /api/prs/:number/review?repo=<repo>
    ["prs", number_str, "review"] ->
      case req.method {
        http.Post -> handle_submit_review(req, number_str)
        _ -> wisp.method_not_allowed(allowed: [http.Post])
      }

    _ -> wisp.not_found()
  }
}

fn get_repo_param(req: Request) -> Result(String, Response) {
  let query = wisp.get_query(req)
  case list.key_find(query, "repo") {
    Ok(repo) -> Ok(repo)
    Error(_) -> {
      let body =
        json.object([#("error", json.string("Missing 'repo' query parameter"))])
        |> json.to_string
      Error(wisp.json_response(body, 400))
    }
  }
}

fn handle_list_prs(req: Request) -> Response {
  case get_repo_param(req) {
    Error(resp) -> resp
    Ok(repo) -> {
      case github.list_all_pr_groups(repo) {
        Ok(groups) -> {
          let body =
            pr.encode_pr_groups(groups)
            |> json.to_string
          wisp.json_response(body, 200)
        }
        Error(msg) -> {
          let body =
            json.object([#("error", json.string(msg))])
            |> json.to_string
          wisp.json_response(body, 500)
        }
      }
    }
  }
}

fn handle_get_pr_detail(req: Request, number_str: String) -> Response {
  case get_repo_param(req) {
    Error(resp) -> resp
    Ok(repo) -> {
      case int.parse(number_str) {
        Error(_) -> {
          let body =
            json.object([
              #("error", json.string("Invalid PR number: " <> number_str)),
            ])
            |> json.to_string
          wisp.json_response(body, 400)
        }
        Ok(number) -> {
          case github.get_pr_detail(repo, number) {
            Ok(detail) -> {
              let body =
                pr.encode_pr_detail(detail)
                |> json.to_string
              wisp.json_response(body, 200)
            }
            Error(msg) -> {
              let body =
                json.object([#("error", json.string(msg))])
                |> json.to_string
              wisp.json_response(body, 500)
            }
          }
        }
      }
    }
  }
}

fn handle_analyze_pr(req: Request, number_str: String) -> Response {
  case get_repo_param(req) {
    Error(resp) -> resp
    Ok(repo) -> {
      case int.parse(number_str) {
        Error(_) -> {
          let body =
            json.object([
              #("error", json.string("Invalid PR number: " <> number_str)),
            ])
            |> json.to_string
          wisp.json_response(body, 400)
        }
        Ok(number) -> {
          // Fetch the full PR detail (metadata + diff)
          case github.get_pr_detail(repo, number) {
            Error(msg) -> {
              wisp.log_error("GitHub fetch failed: " <> msg)
              let body =
                json.object([#("error", json.string(msg))])
                |> json.to_string
              wisp.json_response(body, 500)
            }
            Ok(pr_detail) -> {
              wisp.log_info("Analyzing PR #" <> number_str <> " (" <> int.to_string(string.length(pr_detail.diff)) <> " chars of diff)")
              case analyzer.analyze_pr(pr_detail) {
                Ok(analysis) -> {
                  wisp.log_info("Analysis complete for PR #" <> number_str)
                  let body =
                    pr.encode_analysis_result(analysis)
                    |> json.to_string
                  wisp.json_response(body, 200)
                }
                Error(msg) -> {
                  wisp.log_error("Analysis failed: " <> msg)
                  let body =
                    json.object([#("error", json.string(msg))])
                    |> json.to_string
                  wisp.json_response(body, 500)
                }
              }
            }
          }
        }
      }
    }
  }
}

fn handle_get_pr_comments(req: Request, number_str: String) -> Response {
  case get_repo_param(req) {
    Error(resp) -> resp
    Ok(repo) -> {
      case int.parse(number_str) {
        Error(_) -> {
          let body =
            json.object([
              #("error", json.string("Invalid PR number: " <> number_str)),
            ])
            |> json.to_string
          wisp.json_response(body, 400)
        }
        Ok(number) -> {
          case github.get_pr_comments(repo, number) {
            Ok(comments) -> {
              let body =
                pr.encode_pr_comment_list(comments)
                |> json.to_string
              wisp.json_response(body, 200)
            }
            Error(msg) -> {
              let body =
                json.object([#("error", json.string(msg))])
                |> json.to_string
              wisp.json_response(body, 500)
            }
          }
        }
      }
    }
  }
}

fn handle_submit_review(req: Request, number_str: String) -> Response {
  case get_repo_param(req) {
    Error(resp) -> resp
    Ok(repo) -> {
      case int.parse(number_str) {
        Error(_) -> {
          let body =
            json.object([
              #("error", json.string("Invalid PR number: " <> number_str)),
            ])
            |> json.to_string
          wisp.json_response(body, 400)
        }
        Ok(number) -> {
          use body_str <- wisp.require_string_body(req)
          let review_decoder = {
            use event <- decode.field("event", decode.string)
            use review_body <- decode.field("body", decode.string)
            decode.success(#(event, review_body))
          }
          case json.parse(body_str, review_decoder) {
            Error(_) -> {
              let err_body =
                json.object([
                  #("error", json.string("Invalid JSON body")),
                ])
                |> json.to_string
              wisp.json_response(err_body, 400)
            }
            Ok(#(event, review_body)) -> {
              case github.submit_pr_review(repo, number, event, review_body) {
                Ok(Nil) -> {
                  let resp_body =
                    json.object([#("ok", json.bool(True))])
                    |> json.to_string
                  wisp.json_response(resp_body, 200)
                }
                Error(msg) -> {
                  let err_body =
                    json.object([#("error", json.string(msg))])
                    |> json.to_string
                  wisp.json_response(err_body, 500)
                }
              }
            }
          }
        }
      }
    }
  }
}

fn handle_post_pr_comment(req: Request, number_str: String) -> Response {
  case get_repo_param(req) {
    Error(resp) -> resp
    Ok(repo) -> {
      case int.parse(number_str) {
        Error(_) -> {
          let body =
            json.object([
              #("error", json.string("Invalid PR number: " <> number_str)),
            ])
            |> json.to_string
          wisp.json_response(body, 400)
        }
        Ok(number) -> {
          use body_str <- wisp.require_string_body(req)
          let comment_decoder = {
            use body <- decode.field("body", decode.string)
            use path <- decode.field(
              "path",
              decode.one_of(decode.string, [decode.success("")]),
            )
            use line <- decode.field(
              "line",
              decode.one_of(decode.int, [decode.success(0)]),
            )
            decode.success(#(body, path, line))
          }
          case json.parse(body_str, comment_decoder) {
            Error(_) -> {
              let err_body =
                json.object([
                  #("error", json.string("Invalid JSON body")),
                ])
                |> json.to_string
              wisp.json_response(err_body, 400)
            }
            Ok(#(comment_body, path, line)) -> {
              case github.post_pr_review_comment(repo, number, comment_body, path, line) {
                Ok(Nil) -> {
                  let resp_body =
                    json.object([#("ok", json.bool(True))])
                    |> json.to_string
                  wisp.json_response(resp_body, 200)
                }
                Error(msg) -> {
                  let err_body =
                    json.object([#("error", json.string(msg))])
                    |> json.to_string
                  wisp.json_response(err_body, 500)
                }
              }
            }
          }
        }
      }
    }
  }
}
