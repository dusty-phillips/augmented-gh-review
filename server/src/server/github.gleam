import gleam/dynamic/decode
import gleam/int
import gleam/json
import gleam/result
import gleam/string
import shared/pr.{type PrDetail, type PrFile, type PullRequest, PrDetail, PrFile, PullRequest}
import shellout

/// Parse the `author` field from gh CLI JSON output, which is an object like `{"login": "username"}`.
fn author_decoder() -> decode.Decoder(String) {
  decode.at(["login"], decode.string)
}

/// Decoder for a single PR from `gh pr list` JSON output.
fn gh_pull_request_decoder() -> decode.Decoder(PullRequest) {
  use number <- decode.field("number", decode.int)
  use title <- decode.field("title", decode.string)
  use author <- decode.field("author", author_decoder())
  use url <- decode.field("url", decode.string)
  use created_at <- decode.field("createdAt", decode.string)
  use review_decision <- decode.field(
    "reviewDecision",
    decode.one_of(decode.string, [decode.success("")]),
  )
  use draft <- decode.field("isDraft", decode.bool)
  decode.success(PullRequest(
    number: number,
    title: title,
    author: author,
    url: url,
    created_at: created_at,
    review_decision: review_decision,
    draft: draft,
  ))
}

/// Decoder for `gh pr view` JSON output (for detail view).
fn gh_pr_detail_decoder() -> decode.Decoder(
  #(Int, String, String, String, String, List(PrFile)),
) {
  use number <- decode.field("number", decode.int)
  use title <- decode.field("title", decode.string)
  use author <- decode.field("author", author_decoder())
  use url <- decode.field("url", decode.string)
  use body <- decode.field(
    "body",
    decode.one_of(decode.string, [decode.success("")]),
  )
  use files <- decode.field("files", decode.list(gh_pr_file_decoder()))
  decode.success(#(number, title, author, url, body, files))
}

/// Decoder for individual file objects from gh CLI output.
fn gh_pr_file_decoder() -> decode.Decoder(PrFile) {
  use path <- decode.field("path", decode.string)
  use additions <- decode.field("additions", decode.int)
  use deletions <- decode.field("deletions", decode.int)
  decode.success(PrFile(path: path, additions: additions, deletions: deletions))
}

/// List PRs where review is requested from the current user.
pub fn list_review_prs(
  repo: String,
) -> Result(List(PullRequest), String) {
  let args = [
    "pr", "list", "-R", repo, "--search", "review-requested:@me", "--json",
    "number,title,author,url,createdAt,reviewDecision,isDraft",
  ]
  case shellout.command(run: "gh", with: args, in: ".", opt: []) {
    Ok(output) -> {
      let decoder = decode.list(gh_pull_request_decoder())
      case json.parse(output, decoder) {
        Ok(prs) -> Ok(prs)
        Error(err) -> Error("Failed to parse PR list JSON: " <> string.inspect(err))
      }
    }
    Error(#(code, msg)) ->
      Error(
        "gh pr list failed (exit " <> int.to_string(code) <> "): " <> msg,
      )
  }
}

/// Get detailed information about a specific PR, including the diff.
pub fn get_pr_detail(
  repo: String,
  number: Int,
) -> Result(PrDetail, String) {
  let number_str = int.to_string(number)

  // First call: get PR metadata and files
  let view_args = [
    "pr", "view", "-R", repo, number_str, "--json",
    "number,title,author,url,body,files",
  ]
  let view_result =
    shellout.command(run: "gh", with: view_args, in: ".", opt: [])

  // Second call: get the diff
  let diff_args = ["pr", "diff", "-R", repo, number_str]
  let diff_result =
    shellout.command(run: "gh", with: diff_args, in: ".", opt: [])

  use view_output <- result.try(
    view_result
    |> result.map_error(fn(err) {
      let #(code, msg) = err
      "gh pr view failed (exit " <> int.to_string(code) <> "): " <> msg
    }),
  )

  use diff_output <- result.try(
    diff_result
    |> result.map_error(fn(err) {
      let #(code, msg) = err
      "gh pr diff failed (exit " <> int.to_string(code) <> "): " <> msg
    }),
  )

  use #(num, title, author, url, body, files) <- result.try(
    json.parse(view_output, gh_pr_detail_decoder())
    |> result.map_error(fn(err) {
      "Failed to parse PR detail JSON: " <> string.inspect(err)
    }),
  )

  Ok(PrDetail(
    number: num,
    title: title,
    author: author,
    url: url,
    body: body,
    files: files,
    diff: diff_output,
  ))
}

/// Get the list of files changed in a specific PR.
pub fn get_pr_files(
  repo: String,
  number: Int,
) -> Result(List(PrFile), String) {
  let number_str = int.to_string(number)
  let args = [
    "pr", "view", "-R", repo, number_str, "--json", "files",
  ]
  case shellout.command(run: "gh", with: args, in: ".", opt: []) {
    Ok(output) -> {
      let decoder = decode.at(["files"], decode.list(gh_pr_file_decoder()))
      case json.parse(output, decoder) {
        Ok(files) -> Ok(files)
        Error(err) ->
          Error("Failed to parse PR files JSON: " <> string.inspect(err))
      }
    }
    Error(#(code, msg)) ->
      Error(
        "gh pr view failed (exit " <> int.to_string(code) <> "): " <> msg,
      )
  }
}
