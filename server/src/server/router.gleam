import gleam/bytes_tree
import gleam/dynamic/decode
import gleam/http
import gleam/int
import gleam/json
import gleam/list
import gleam/result
import gleam/string
import server/analyzer
import server/github
import shared/pr
import shellout
import simplifile
import wisp.{type Request, type Response}

const index_html = "<!DOCTYPE html>
<html>
<head>
<meta charset=\"utf-8\">
<title>Augmented Review</title>
<link rel=\"stylesheet\" href=\"https://unpkg.com/open-props\" />
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

// ---------------------------------------------------------------------------
// Shared helpers
// ---------------------------------------------------------------------------

/// JSON error response helper
fn json_error(msg: String, status: Int) -> Response {
  json.object([#("error", json.string(msg))])
  |> json.to_string
  |> wisp.json_response(status)
}

/// JSON success response helper
fn json_ok() -> Response {
  json.object([#("ok", json.bool(True))])
  |> json.to_string
  |> wisp.json_response(200)
}

/// Parse PR number from URL segment, returning a Response error on failure
fn parse_pr_number(number_str: String) -> Result(Int, Response) {
  int.parse(number_str)
  |> result.map_error(fn(_) {
    json_error("Invalid PR number: " <> number_str, 400)
  })
}

/// Unwrap a Result where both branches are the same type
fn unwrap_response(result: Result(Response, Response)) -> Response {
  case result {
    Ok(response) -> response
    Error(response) -> response
  }
}

// ---------------------------------------------------------------------------
// Routing
// ---------------------------------------------------------------------------

pub fn handle_request(req: Request) -> Response {
  use req <- middleware(req)

  case wisp.path_segments(req) {
    // GET / -> serve index HTML
    [] ->
      case req.method {
        http.Get -> wisp.html_response(index_html, 200)
        _ -> wisp.method_not_allowed(allowed: [http.Get])
      }

    // Image proxy for authenticated GitHub assets
    ["api", "image-proxy"] ->
      case req.method {
        http.Get -> handle_image_proxy(req)
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

    // POST /api/prs/:number/reply?repo=<repo>
    ["prs", number_str, "reply"] ->
      case req.method {
        http.Post -> handle_reply(req, number_str)
        _ -> wisp.method_not_allowed(allowed: [http.Post])
      }

    _ -> wisp.not_found()
  }
}

fn get_repo_param(req: Request) -> Result(String, Response) {
  wisp.get_query(req)
  |> list.key_find("repo")
  |> result.map_error(fn(_) {
    json_error("Missing 'repo' query parameter", 400)
  })
}

// ---------------------------------------------------------------------------
// Handlers
// ---------------------------------------------------------------------------

fn handle_list_prs(req: Request) -> Response {
  {
    use repo <- result.try(get_repo_param(req))
    use groups <- result.try(
      github.list_all_pr_groups(repo)
      |> result.map_error(fn(msg) { json_error(msg, 500) }),
    )
    Ok(
      pr.encode_pr_groups(groups)
      |> json.to_string
      |> wisp.json_response(200),
    )
  }
  |> unwrap_response
}

fn handle_get_pr_detail(req: Request, number_str: String) -> Response {
  {
    use repo <- result.try(get_repo_param(req))
    use number <- result.try(parse_pr_number(number_str))
    use detail <- result.try(
      github.get_pr_detail(repo, number)
      |> result.map_error(fn(msg) { json_error(msg, 500) }),
    )
    Ok(
      pr.encode_pr_detail(detail)
      |> json.to_string
      |> wisp.json_response(200),
    )
  }
  |> unwrap_response
}

fn handle_analyze_pr(req: Request, number_str: String) -> Response {
  {
    use repo <- result.try(get_repo_param(req))
    use number <- result.try(parse_pr_number(number_str))
    use pr_detail <- result.try(
      github.get_pr_detail(repo, number)
      |> result.map_error(fn(msg) {
        wisp.log_error("GitHub fetch failed: " <> msg)
        json_error(msg, 500)
      }),
    )
    wisp.log_info(
      "Analyzing PR #"
      <> number_str
      <> " ("
      <> int.to_string(string.length(pr_detail.diff))
      <> " chars of diff)",
    )
    use analysis <- result.try(
      analyzer.analyze_pr(pr_detail)
      |> result.map_error(fn(msg) {
        wisp.log_error("Analysis failed: " <> msg)
        json_error(msg, 500)
      }),
    )
    wisp.log_info("Analysis complete for PR #" <> number_str)
    Ok(
      pr.encode_analysis_result(analysis)
      |> json.to_string
      |> wisp.json_response(200),
    )
  }
  |> unwrap_response
}

fn handle_get_pr_comments(req: Request, number_str: String) -> Response {
  {
    use repo <- result.try(get_repo_param(req))
    use number <- result.try(parse_pr_number(number_str))
    use comments <- result.try(
      github.get_pr_comments(repo, number)
      |> result.map_error(fn(msg) { json_error(msg, 500) }),
    )
    Ok(
      pr.encode_pr_comment_list(comments)
      |> json.to_string
      |> wisp.json_response(200),
    )
  }
  |> unwrap_response
}

fn handle_post_pr_comment(req: Request, number_str: String) -> Response {
  use body_str <- wisp.require_string_body(req)
  {
    use repo <- result.try(get_repo_param(req))
    use number <- result.try(parse_pr_number(number_str))
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
    use #(comment_body, path, line) <- result.try(
      json.parse(body_str, comment_decoder)
      |> result.map_error(fn(_) { json_error("Invalid JSON body", 400) }),
    )
    use _ <- result.try(
      github.post_pr_review_comment(repo, number, comment_body, path, line)
      |> result.map_error(fn(msg) { json_error(msg, 500) }),
    )
    Ok(json_ok())
  }
  |> unwrap_response
}

fn handle_submit_review(req: Request, number_str: String) -> Response {
  use body_str <- wisp.require_string_body(req)
  {
    use repo <- result.try(get_repo_param(req))
    use number <- result.try(parse_pr_number(number_str))
    let review_decoder = {
      use event <- decode.field("event", decode.string)
      use review_body <- decode.field("body", decode.string)
      decode.success(#(event, review_body))
    }
    use #(event, review_body) <- result.try(
      json.parse(body_str, review_decoder)
      |> result.map_error(fn(_) { json_error("Invalid JSON body", 400) }),
    )
    use _ <- result.try(
      github.submit_pr_review(repo, number, event, review_body)
      |> result.map_error(fn(msg) { json_error(msg, 500) }),
    )
    Ok(json_ok())
  }
  |> unwrap_response
}

fn handle_reply(req: Request, number_str: String) -> Response {
  use body_str <- wisp.require_string_body(req)
  {
    use repo <- result.try(get_repo_param(req))
    use number <- result.try(parse_pr_number(number_str))
    let reply_decoder = {
      use comment_id <- decode.field("comment_id", decode.int)
      use reply_body <- decode.field("body", decode.string)
      decode.success(#(comment_id, reply_body))
    }
    use #(comment_id, reply_body) <- result.try(
      json.parse(body_str, reply_decoder)
      |> result.map_error(fn(_) { json_error("Invalid JSON body", 400) }),
    )
    use _ <- result.try(
      github.reply_to_comment(repo, number, comment_id, reply_body)
      |> result.map_error(fn(msg) { json_error(msg, 500) }),
    )
    Ok(json_ok())
  }
  |> unwrap_response
}

// ---------------------------------------------------------------------------
// Image proxy
// ---------------------------------------------------------------------------

fn validate_github_url(req: Request) -> Result(String, Response) {
  let query = wisp.get_query(req)
  use url <- result.try(
    list.key_find(query, "url")
    |> result.map_error(fn(_) { json_error("Missing url parameter", 400) }),
  )
  case
    string.starts_with(url, "https://github.com/")
    || string.starts_with(url, "https://user-images.githubusercontent.com/")
    || string.starts_with(url, "https://avatars.githubusercontent.com/")
  {
    True -> Ok(url)
    False -> Error(json_error("Only GitHub URLs allowed", 400))
  }
}

fn fetch_github_image(url: String) -> Result(BitArray, Response) {
  use token <- result.try(
    shellout.command(run: "gh", with: ["auth", "token"], in: ".", opt: [])
    |> result.map_error(fn(_) { wisp.internal_server_error() }),
  )
  let trimmed_token = string.trim(token)
  let tmp_path =
    "/tmp/augmented_review_" <> wisp.random_string(16) <> ".tmp"
  use _ <- result.try(
    shellout.command(
      run: "curl",
      with: [
        "-sL", "-o", tmp_path, "-H",
        "Authorization: token " <> trimmed_token, url,
      ],
      in: ".",
      opt: [],
    )
    |> result.map_error(fn(_) {
      let _ = simplifile.delete(tmp_path)
      wisp.not_found()
    }),
  )
  let bits_result =
    simplifile.read_bits(tmp_path)
    |> result.map_error(fn(_) {
      let _ = simplifile.delete(tmp_path)
      wisp.not_found()
    })
  let _ = simplifile.delete(tmp_path)
  bits_result
}

fn detect_content_type(url: String) -> String {
  let ext =
    url
    |> string.lowercase
    |> string.split(".")
    |> list.last
    |> result.unwrap("")
  case ext {
    "gif" -> "image/gif"
    "jpg" | "jpeg" -> "image/jpeg"
    "svg" -> "image/svg+xml"
    "webp" -> "image/webp"
    "mp4" -> "video/mp4"
    "webm" -> "video/webm"
    _ -> "image/png"
  }
}

fn handle_image_proxy(req: Request) -> Response {
  {
    use url <- result.try(validate_github_url(req))
    use bits <- result.try(fetch_github_image(url))
    let content_type = detect_content_type(url)
    Ok(
      wisp.response(200)
      |> wisp.set_header("content-type", content_type)
      |> wisp.set_header("cache-control", "public, max-age=3600")
      |> wisp.set_body(wisp.Bytes(bytes_tree.from_bit_array(bits))),
    )
  }
  |> unwrap_response
}
