import gleam/dynamic/decode
import gleam/json

// --- Types ---

pub type PullRequest {
  PullRequest(
    number: Int,
    title: String,
    author: String,
    url: String,
    created_at: String,
    review_decision: String,
    draft: Bool,
  )
}

pub type PrFile {
  PrFile(path: String, additions: Int, deletions: Int)
}

pub type PrDetail {
  PrDetail(
    number: Int,
    title: String,
    author: String,
    url: String,
    body: String,
    files: List(PrFile),
    diff: String,
  )
}

// --- Encoders ---

pub fn encode_pull_request(pr: PullRequest) -> json.Json {
  json.object([
    #("number", json.int(pr.number)),
    #("title", json.string(pr.title)),
    #("author", json.string(pr.author)),
    #("url", json.string(pr.url)),
    #("created_at", json.string(pr.created_at)),
    #("review_decision", json.string(pr.review_decision)),
    #("draft", json.bool(pr.draft)),
  ])
}

pub fn encode_pull_request_list(prs: List(PullRequest)) -> json.Json {
  json.array(prs, encode_pull_request)
}

pub fn encode_pr_file(file: PrFile) -> json.Json {
  json.object([
    #("path", json.string(file.path)),
    #("additions", json.int(file.additions)),
    #("deletions", json.int(file.deletions)),
  ])
}

pub fn encode_pr_file_list(files: List(PrFile)) -> json.Json {
  json.array(files, encode_pr_file)
}

pub fn encode_pr_detail(detail: PrDetail) -> json.Json {
  json.object([
    #("number", json.int(detail.number)),
    #("title", json.string(detail.title)),
    #("author", json.string(detail.author)),
    #("url", json.string(detail.url)),
    #("body", json.string(detail.body)),
    #("files", json.array(detail.files, encode_pr_file)),
    #("diff", json.string(detail.diff)),
  ])
}

// --- Decoders ---

pub fn pull_request_decoder() -> decode.Decoder(PullRequest) {
  use number <- decode.field("number", decode.int)
  use title <- decode.field("title", decode.string)
  use author <- decode.field("author", decode.string)
  use url <- decode.field("url", decode.string)
  use created_at <- decode.field("created_at", decode.string)
  use review_decision <- decode.field("review_decision", decode.string)
  use draft <- decode.field("draft", decode.bool)
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

pub fn pull_request_list_decoder() -> decode.Decoder(List(PullRequest)) {
  decode.list(pull_request_decoder())
}

pub fn pr_file_decoder() -> decode.Decoder(PrFile) {
  use path <- decode.field("path", decode.string)
  use additions <- decode.field("additions", decode.int)
  use deletions <- decode.field("deletions", decode.int)
  decode.success(PrFile(path: path, additions: additions, deletions: deletions))
}

pub fn pr_file_list_decoder() -> decode.Decoder(List(PrFile)) {
  decode.list(pr_file_decoder())
}

pub fn pr_detail_decoder() -> decode.Decoder(PrDetail) {
  use number <- decode.field("number", decode.int)
  use title <- decode.field("title", decode.string)
  use author <- decode.field("author", decode.string)
  use url <- decode.field("url", decode.string)
  use body <- decode.field("body", decode.string)
  use files <- decode.field("files", decode.list(pr_file_decoder()))
  use diff <- decode.field("diff", decode.string)
  decode.success(PrDetail(
    number: number,
    title: title,
    author: author,
    url: url,
    body: body,
    files: files,
    diff: diff,
  ))
}
