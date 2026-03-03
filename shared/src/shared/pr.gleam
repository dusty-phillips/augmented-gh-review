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
    checks_status: String,
  )
}

pub type PrFile {
  PrFile(path: String, additions: Int, deletions: Int)
}

pub type PrGroups {
  PrGroups(
    created_by_me: List(PullRequest),
    review_requested: List(PullRequest),
    all_open: List(PullRequest),
  )
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

pub type ReviewChunk {
  ReviewChunk(
    index: Int,
    title: String,
    description: String,
    file_path: String,
    start_line: Int,
    diff_content: String,
  )
}

pub type LineComment {
  LineComment(chunk_index: Int, line_number: Int, body: String)
}

pub type AnalysisResult {
  AnalysisResult(summary: String, chunks: List(ReviewChunk))
}

pub type PrComment {
  PrComment(
    id: Int,
    author: String,
    body: String,
    path: String,
    line: Int,
    created_at: String,
    in_reply_to_id: Int,
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
    #("checks_status", json.string(pr.checks_status)),
  ])
}

pub fn encode_pull_request_list(prs: List(PullRequest)) -> json.Json {
  json.array(prs, encode_pull_request)
}

pub fn encode_pr_groups(groups: PrGroups) -> json.Json {
  json.object([
    #("created_by_me", json.array(groups.created_by_me, encode_pull_request)),
    #(
      "review_requested",
      json.array(groups.review_requested, encode_pull_request),
    ),
    #("all_open", json.array(groups.all_open, encode_pull_request)),
  ])
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

pub fn encode_review_chunk(chunk: ReviewChunk) -> json.Json {
  json.object([
    #("index", json.int(chunk.index)),
    #("title", json.string(chunk.title)),
    #("description", json.string(chunk.description)),
    #("file_path", json.string(chunk.file_path)),
    #("start_line", json.int(chunk.start_line)),
    #("diff_content", json.string(chunk.diff_content)),
  ])
}

pub fn encode_line_comment(comment: LineComment) -> json.Json {
  json.object([
    #("chunk_index", json.int(comment.chunk_index)),
    #("line_number", json.int(comment.line_number)),
    #("body", json.string(comment.body)),
  ])
}

pub fn encode_analysis_result(result: AnalysisResult) -> json.Json {
  json.object([
    #("summary", json.string(result.summary)),
    #("chunks", json.array(result.chunks, encode_review_chunk)),
  ])
}

pub fn encode_pr_comment(comment: PrComment) -> json.Json {
  json.object([
    #("id", json.int(comment.id)),
    #("author", json.string(comment.author)),
    #("body", json.string(comment.body)),
    #("path", json.string(comment.path)),
    #("line", json.int(comment.line)),
    #("created_at", json.string(comment.created_at)),
    #("in_reply_to_id", json.int(comment.in_reply_to_id)),
  ])
}

pub fn encode_pr_comment_list(comments: List(PrComment)) -> json.Json {
  json.array(comments, encode_pr_comment)
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
  use checks_status <- decode.field("checks_status", decode.string)
  decode.success(PullRequest(
    number: number,
    title: title,
    author: author,
    url: url,
    created_at: created_at,
    review_decision: review_decision,
    draft: draft,
    checks_status: checks_status,
  ))
}

pub fn pull_request_list_decoder() -> decode.Decoder(List(PullRequest)) {
  decode.list(pull_request_decoder())
}

pub fn pr_groups_decoder() -> decode.Decoder(PrGroups) {
  use created_by_me <- decode.field(
    "created_by_me",
    decode.list(pull_request_decoder()),
  )
  use review_requested <- decode.field(
    "review_requested",
    decode.list(pull_request_decoder()),
  )
  use all_open <- decode.field("all_open", decode.list(pull_request_decoder()))
  decode.success(PrGroups(
    created_by_me: created_by_me,
    review_requested: review_requested,
    all_open: all_open,
  ))
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

pub fn review_chunk_decoder() -> decode.Decoder(ReviewChunk) {
  use index <- decode.field("index", decode.int)
  use title <- decode.field("title", decode.string)
  use description <- decode.field("description", decode.string)
  use file_path <- decode.field("file_path", decode.string)
  use start_line <- decode.field("start_line", decode.int)
  use diff_content <- decode.field("diff_content", decode.string)
  decode.success(ReviewChunk(
    index: index,
    title: title,
    description: description,
    file_path: file_path,
    start_line: start_line,
    diff_content: diff_content,
  ))
}

pub fn line_comment_decoder() -> decode.Decoder(LineComment) {
  use chunk_index <- decode.field("chunk_index", decode.int)
  use line_number <- decode.field("line_number", decode.int)
  use body <- decode.field("body", decode.string)
  decode.success(LineComment(
    chunk_index: chunk_index,
    line_number: line_number,
    body: body,
  ))
}

pub fn analysis_result_decoder() -> decode.Decoder(AnalysisResult) {
  use summary <- decode.field("summary", decode.string)
  use chunks <- decode.field("chunks", decode.list(review_chunk_decoder()))
  decode.success(AnalysisResult(summary: summary, chunks: chunks))
}

pub fn pr_comment_decoder() -> decode.Decoder(PrComment) {
  use id <- decode.field("id", decode.int)
  use author <- decode.field("author", decode.string)
  use body <- decode.field("body", decode.string)
  use path <- decode.field("path", decode.string)
  use line <- decode.field("line", decode.int)
  use created_at <- decode.field("created_at", decode.string)
  use in_reply_to_id <- decode.field("in_reply_to_id", decode.int)
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

pub fn pr_comment_list_decoder() -> decode.Decoder(List(PrComment)) {
  decode.list(pr_comment_decoder())
}
