import gleam/dynamic/decode
import gleam/erlang/process
import gleam/int
import gleam/json
import gleam/list
import gleam/option
import gleam/result
import gleam/string
import server/error_format
import shared/pr.{
  type PrComment, type PrDetail, type PrFile, type PrGroups, type PullRequest,
  PrComment, PrDetail, PrFile, PrGroups, PullRequest,
}
import shellout
import simplifile
import wisp

/// JSON fields requested when listing PRs via `gh pr list`.
const pr_list_json_fields = "number,title,author,url,createdAt,reviewDecision,isDraft,statusCheckRollup,reviewRequests"

/// Run the `gh` CLI with the given arguments, mapping failures to a
/// human-readable error that includes the provided context string.
fn run_gh(args: List(String), context: String) -> Result(String, String) {
  shellout.command(run: "gh", with: args, in: ".", opt: [])
  |> result.map_error(fn(err) {
    let #(code, msg) = err
    context <> " failed (exit " <> int.to_string(code) <> "): " <> msg
  })
}

/// Generate a unique temporary file path to avoid race conditions.
fn unique_tmp_path(prefix: String) -> String {
  "/tmp/" <> prefix <> "_" <> wisp.random_string(16) <> ".json"
}

/// Parse the `author` field from gh CLI JSON output, which is an object like `{"login": "username"}`.
fn author_decoder() -> decode.Decoder(String) {
  decode.at(["login"], decode.string)
}

/// Compute overall checks status from a list of conclusion strings.
fn compute_checks_status(conclusions: List(String)) -> String {
  case conclusions {
    [] -> "unknown"
    _ -> {
      let has_failure =
        list.any(conclusions, fn(c) { c == "FAILURE" || c == "ERROR" })
      let has_pending =
        list.any(conclusions, fn(c) {
          c == "" || c == "PENDING" || c == "QUEUED" || c == "IN_PROGRESS"
        })
      case has_failure, has_pending {
        True, _ -> "failing"
        _, True -> "pending"
        _, _ -> "passing"
      }
    }
  }
}

/// A check's conclusion and details URL.
type CheckInfo {
  CheckInfo(conclusion: String, url: String)
}

/// Decoder for a single check from statusCheckRollup items.
/// CheckRun items have "conclusion" + "detailsUrl"; StatusContext items have "state" + "targetUrl".
fn check_info_decoder() -> decode.Decoder(CheckInfo) {
  decode.one_of(check_run_decoder(), [status_context_decoder()])
}

fn check_run_decoder() -> decode.Decoder(CheckInfo) {
  use conclusion <- decode.field(
    "conclusion",
    decode.one_of(decode.string, [decode.success("")]),
  )
  use url <- decode.optional_field("detailsUrl", "", decode.string)
  decode.success(CheckInfo(conclusion: conclusion, url: url))
}

fn status_context_decoder() -> decode.Decoder(CheckInfo) {
  use state <- decode.field("state", decode.string)
  use url <- decode.optional_field("targetUrl", "", decode.string)
  decode.success(CheckInfo(conclusion: state, url: url))
}

/// Find the URL of the first failing check, or empty string.
fn first_failing_url(checks: List(CheckInfo)) -> String {
  case
    list.find(checks, fn(c) {
      c.conclusion == "FAILURE" || c.conclusion == "ERROR"
    })
  {
    Ok(check) -> check.url
    Error(_) -> ""
  }
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
  use checks <- decode.field(
    "statusCheckRollup",
    decode.one_of(decode.list(check_info_decoder()), [
      decode.success([]),
    ]),
  )
  use reviewers <- decode.optional_field(
    "reviewRequests",
    [],
    decode.list(decode.at(["login"], decode.string)),
  )
  let conclusions = list.map(checks, fn(c) { c.conclusion })
  let checks_status = compute_checks_status(conclusions)
  let checks_url = first_failing_url(checks)
  decode.success(PullRequest(
    number: number,
    title: title,
    author: author,
    url: url,
    created_at: created_at,
    review_decision: review_decision,
    draft: draft,
    checks_status: checks_status,
    checks_url: checks_url,
    reviewers: reviewers,
  ))
}

/// Decoder for `gh pr view` JSON output (for detail view).
/// Decodes directly into PrDetail with an empty diff placeholder.
fn gh_pr_detail_decoder() -> decode.Decoder(PrDetail) {
  use number <- decode.field("number", decode.int)
  use title <- decode.field("title", decode.string)
  use author <- decode.field("author", author_decoder())
  use url <- decode.field("url", decode.string)
  use body <- decode.field(
    "body",
    decode.one_of(decode.string, [decode.success("")]),
  )
  use head_branch <- decode.field("headRefName", decode.string)
  use files <- decode.field("files", decode.list(gh_pr_file_decoder()))
  decode.success(PrDetail(
    number: number,
    title: title,
    author: author,
    url: url,
    body: body,
    head_branch: head_branch,
    files: files,
    diff: "",
  ))
}

/// Decoder for individual file objects from gh CLI output.
fn gh_pr_file_decoder() -> decode.Decoder(PrFile) {
  use path <- decode.field("path", decode.string)
  use additions <- decode.field("additions", decode.int)
  use deletions <- decode.field("deletions", decode.int)
  decode.success(PrFile(path: path, additions: additions, deletions: deletions))
}

/// Internal helper: list PRs with an optional `--search` filter.
fn list_prs(
  repo: String,
  search_filter: option.Option(String),
) -> Result(List(PullRequest), String) {
  let base_args = ["pr", "list", "-R", repo, "--limit", "100"]
  let search_args = case search_filter {
    option.Some(filter) -> ["--search", filter]
    option.None -> []
  }
  let args =
    list.flatten([base_args, search_args, ["--json", pr_list_json_fields]])

  use output <- result.try(run_gh(args, "gh pr list"))

  json.parse(output, decode.list(gh_pull_request_decoder()))
  |> result.map_error(fn(err) {
    "Failed to parse PR list JSON: " <> error_format.json_decode_error(err)
  })
}

/// List PRs where review is requested from the current user.
pub fn list_review_prs(repo: String) -> Result(List(PullRequest), String) {
  list_prs(repo, option.Some("review-requested:@me"))
}

/// List PRs created by the current user.
pub fn list_my_prs(repo: String) -> Result(List(PullRequest), String) {
  list_prs(repo, option.Some("author:@me"))
}

/// List all open PRs in the repo.
pub fn list_all_open_prs(repo: String) -> Result(List(PullRequest), String) {
  list_prs(repo, option.None)
}

/// Find the open "Production Release" PR, if any.
pub fn find_production_pr(
  repo: String,
) -> Result(option.Option(PullRequest), String) {
  case list_prs(repo, option.Some("Production Release in:title")) {
    Ok([first, ..]) -> Ok(option.Some(first))
    Ok([]) -> Ok(option.None)
    Error(msg) -> Error(msg)
  }
}

/// Fetch all PR groups (including production PR) concurrently.
pub fn list_all_pr_groups(repo: String) -> Result(PrGroups, String) {
  let created_subject = process.new_subject()
  let review_subject = process.new_subject()
  let all_subject = process.new_subject()
  let prod_subject = process.new_subject()

  process.spawn(fn() {
    process.send(created_subject, list_my_prs(repo))
  })
  process.spawn(fn() {
    process.send(review_subject, list_review_prs(repo))
  })
  process.spawn(fn() {
    process.send(all_subject, list_all_open_prs(repo))
  })
  process.spawn(fn() {
    process.send(prod_subject, find_production_pr(repo))
  })

  let timeout = 30_000
  let created_result = process.receive(created_subject, timeout)
  let review_result = process.receive(review_subject, timeout)
  let all_result = process.receive(all_subject, timeout)
  let prod_result = process.receive(prod_subject, timeout)

  use created <- result.try(case created_result {
    Ok(r) -> r
    Error(Nil) -> Error("Timeout fetching created-by-me PRs")
  })
  use review <- result.try(case review_result {
    Ok(r) -> r
    Error(Nil) -> Error("Timeout fetching review-requested PRs")
  })
  use all_open <- result.try(case all_result {
    Ok(r) -> r
    Error(Nil) -> Error("Timeout fetching all open PRs")
  })
  // Production PR is optional — don't fail if it times out
  let production_pr = case prod_result {
    Ok(Ok(pr)) -> pr
    _ -> option.None
  }

  Ok(PrGroups(
    created_by_me: created,
    review_requested: review,
    all_open: all_open,
    production_pr: production_pr,
  ))
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
    "number,title,author,url,body,headRefName,files",
  ]

  // Second call: get the diff
  let diff_args = ["pr", "diff", "-R", repo, number_str]

  use view_output <- result.try(run_gh(view_args, "gh pr view"))
  use diff_output <- result.try(run_gh(diff_args, "gh pr diff"))

  use detail <- result.try(
    json.parse(view_output, gh_pr_detail_decoder())
    |> result.map_error(fn(err) {
      "Failed to parse PR detail JSON: "
      <> error_format.json_decode_error(err)
    }),
  )

  Ok(PrDetail(..detail, diff: diff_output))
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

  use output <- result.try(run_gh(args, "gh pr view"))

  json.parse(output, decode.at(["files"], decode.list(gh_pr_file_decoder())))
  |> result.map_error(fn(err) {
    "Failed to parse PR files JSON: " <> error_format.json_decode_error(err)
  })
}

/// Decoder for review comments (line-level) from GitHub API.
fn gh_review_comment_decoder() -> decode.Decoder(PrComment) {
  use id <- decode.field("id", decode.int)
  use author <- decode.field("user", author_decoder())
  use body <- decode.field("body", decode.string)
  use path <- decode.field(
    "path",
    decode.one_of(decode.string, [decode.success("")]),
  )
  use line <- decode.field(
    "line",
    decode.one_of(decode.int, [decode.success(0)]),
  )
  use created_at <- decode.field("created_at", decode.string)
  use in_reply_to_id <- decode.optional_field(
    "in_reply_to_id",
    0,
    decode.int,
  )
  decode.success(PrComment(
    id: id,
    author: author,
    body: body,
    path: path,
    line: line,
    created_at: created_at,
    in_reply_to_id: in_reply_to_id,
  ))
}

/// Decoder for issue comments (general PR comments) from GitHub API.
fn gh_issue_comment_decoder() -> decode.Decoder(PrComment) {
  use id <- decode.field("id", decode.int)
  use author <- decode.field("user", author_decoder())
  use body <- decode.field("body", decode.string)
  use created_at <- decode.field("created_at", decode.string)
  decode.success(PrComment(
    id: id,
    author: author,
    body: body,
    path: "",
    line: 0,
    created_at: created_at,
    in_reply_to_id: 0,
  ))
}

/// Fetch all comments (review + issue) for a PR, sorted by created_at.
pub fn get_pr_comments(
  repo: String,
  number: Int,
) -> Result(List(PrComment), String) {
  let number_str = int.to_string(number)

  // Fetch review comments (line-level)
  let review_args = [
    "api", "repos/" <> repo <> "/pulls/" <> number_str <> "/comments",
  ]

  // Fetch issue comments (general)
  let issue_args = [
    "api", "repos/" <> repo <> "/issues/" <> number_str <> "/comments",
  ]

  use review_output <- result.try(
    run_gh(review_args, "gh api review comments"),
  )
  use issue_output <- result.try(
    run_gh(issue_args, "gh api issue comments"),
  )

  use review_comments <- result.try(
    json.parse(review_output, decode.list(gh_review_comment_decoder()))
    |> result.map_error(fn(err) {
      "Failed to parse review comments JSON: "
      <> error_format.json_decode_error(err)
    }),
  )

  use issue_comments <- result.try(
    json.parse(issue_output, decode.list(gh_issue_comment_decoder()))
    |> result.map_error(fn(err) {
      "Failed to parse issue comments JSON: "
      <> error_format.json_decode_error(err)
    }),
  )

  let all_comments = list.append(review_comments, issue_comments)
  let sorted =
    list.sort(all_comments, fn(a, b) {
      string.compare(a.created_at, b.created_at)
    })
  Ok(sorted)
}

/// Post a review comment on a PR (line-specific or general).
pub fn post_pr_review_comment(
  repo: String,
  number: Int,
  body: String,
  path: String,
  line: Int,
) -> Result(Nil, String) {
  let number_str = int.to_string(number)

  case path {
    "" -> {
      // General PR comment via issues API
      let args = [
        "api",
        "repos/" <> repo <> "/issues/" <> number_str <> "/comments",
        "-X", "POST",
        "-f", "body=" <> body,
      ]
      run_gh(args, "gh api post comment")
      |> result.replace(Nil)
    }
    _ -> {
      // Line-specific comment via the pull request reviews API
      let sha_args = [
        "pr", "view", "-R", repo, number_str,
        "--json", "headRefOid", "-q", ".headRefOid",
      ]
      use commit_sha <- result.try(
        run_gh(sha_args, "gh pr view for SHA")
        |> result.map(string.trim),
      )

      // Use the reviews API with a COMMENT event and inline comments
      let json_body =
        json.object([
          #("commit_id", json.string(commit_sha)),
          #("body", json.string("")),
          #("event", json.string("COMMENT")),
          #("comments", json.array([
            json.object([
              #("path", json.string(path)),
              #("line", json.int(line)),
              #("side", json.string("RIGHT")),
              #("body", json.string(body)),
            ]),
          ], fn(x) { x })),
        ])
        |> json.to_string

      let tmp_path = unique_tmp_path("augmented_review_comment")
      use _ <- result.try(
        simplifile.write(tmp_path, json_body)
        |> result.map_error(fn(_) { "Failed to write temp comment file" }),
      )

      let args = [
        "api",
        "repos/" <> repo <> "/pulls/" <> number_str <> "/reviews",
        "-X", "POST",
        "--input", tmp_path,
      ]
      let post_result = run_gh(args, "gh api post review comment")
      // Clean up temp file -- best effort
      let _ = simplifile.delete(tmp_path)
      post_result
      |> result.replace(Nil)
    }
  }
}

/// Submit a PR review (approve, request changes, or comment).
/// The `event` parameter must be one of: "APPROVE", "REQUEST_CHANGES", "COMMENT".
pub fn submit_pr_review(
  repo: String,
  number: Int,
  event: String,
  body: String,
) -> Result(Nil, String) {
  let number_str = int.to_string(number)

  let json_body =
    json.object([
      #("event", json.string(event)),
      #("body", json.string(body)),
    ])
    |> json.to_string

  let tmp_path = unique_tmp_path("augmented_review_submit")
  use _ <- result.try(
    simplifile.write(tmp_path, json_body)
    |> result.map_error(fn(_) { "Failed to write temp review file" }),
  )

  let args = [
    "api",
    "repos/" <> repo <> "/pulls/" <> number_str <> "/reviews",
    "-X", "POST",
    "--input", tmp_path,
  ]
  let post_result = run_gh(args, "gh api submit review")
  // Clean up temp file -- best effort
  let _ = simplifile.delete(tmp_path)
  post_result
  |> result.replace(Nil)
}

/// Reply to an existing review comment.
pub fn reply_to_comment(
  repo: String,
  number: Int,
  comment_id: Int,
  body: String,
) -> Result(Nil, String) {
  let number_str = int.to_string(number)
  let json_body =
    json.object([
      #("body", json.string(body)),
      #("in_reply_to", json.int(comment_id)),
    ])
    |> json.to_string

  let tmp_path = unique_tmp_path("augmented_review_reply")
  use _ <- result.try(
    simplifile.write(tmp_path, json_body)
    |> result.map_error(fn(_) { "Failed to write temp reply file" }),
  )

  let args = [
    "api",
    "repos/" <> repo <> "/pulls/" <> number_str <> "/comments",
    "-X", "POST",
    "--input", tmp_path,
  ]
  let post_result = run_gh(args, "gh api reply")
  let _ = simplifile.delete(tmp_path)
  post_result
  |> result.replace(Nil)
}
