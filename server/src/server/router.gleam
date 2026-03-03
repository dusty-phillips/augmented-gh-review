import gleam/http
import gleam/int
import gleam/json
import gleam/list
import server/github
import shared/pr
import wisp.{type Request, type Response}

const index_html = "<!DOCTYPE html>
<html>
<head><meta charset=\"utf-8\"><title>Augmented Review</title></head>
<body><div id=\"app\"></div><script type=\"module\" src=\"/static/client.mjs\"></script></body>
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

    // Everything else
    _ -> wisp.not_found()
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
    ["prs", _number_str, "analyze"] ->
      case req.method {
        http.Post -> {
          let body =
            json.object([#("status", json.string("not_implemented"))])
            |> json.to_string
          wisp.json_response(body, 200)
        }
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
      case github.list_review_prs(repo) {
        Ok(prs) -> {
          let body =
            pr.encode_pull_request_list(prs)
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
