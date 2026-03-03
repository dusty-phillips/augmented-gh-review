import anthropic/api
import anthropic/client
import anthropic/config
import anthropic/error
import anthropic/message
import anthropic/request
import gleam/dynamic/decode
import gleam/int
import gleam/json
import gleam/list
import gleam/result
import gleam/string
import server/error_format
import server/diff_parser.{type DiffHunk}
import shared/pr.{
  type AnalysisResult, type PrDetail, type ReviewChunk, AnalysisResult,
  ReviewChunk,
}

const model = "claude-sonnet-4-20250514"

const max_tokens = 8192

// --- LLM response types (internal) ---

type LlmChunk {
  LlmChunk(
    index: Int,
    title: String,
    description: String,
    hunk_indices: List(Int),
  )
}

type LlmResponse {
  LlmResponse(summary: String, chunks: List(LlmChunk))
}

fn llm_chunk_decoder() -> decode.Decoder(LlmChunk) {
  use index <- decode.field("index", decode.int)
  use title <- decode.field("title", decode.string)
  use description <- decode.field("description", decode.string)
  use hunk_indices <- decode.field("hunk_indices", decode.list(decode.int))
  decode.success(LlmChunk(
    index: index,
    title: title,
    description: description,
    hunk_indices: hunk_indices,
  ))
}

fn llm_response_decoder() -> decode.Decoder(LlmResponse) {
  use summary <- decode.field("summary", decode.string)
  use chunks <- decode.field("chunks", decode.list(llm_chunk_decoder()))
  decode.success(LlmResponse(summary: summary, chunks: chunks))
}

// --- Prompt building ---

fn build_prompt(pr_detail: PrDetail, hunks: List(DiffHunk)) -> String {
  let title = pr_detail.title
  let body = case pr_detail.body {
    "" -> "(no description)"
    b -> b
  }
  let hunk_summary = diff_parser.build_hunk_summary(hunks)
  let total_hunks = list.length(hunks)

  "You are an expert code reviewer acting as a guide for a human reviewer. Your job is to turn a raw PR diff into a guided review experience — a narrative walkthrough that helps the reviewer understand the changes efficiently and catch issues.

## PR Title
" <> title <> "

## PR Description
" <> body <> "

## Diff Hunks (" <> int.to_string(total_hunks) <> " total)

The diff has been parsed into the following hunks. Each hunk has an index, file path, hunk header, line count, and a preview of its first few lines.

" <> hunk_summary <> "

## Instructions

### Grouping
Group hunks into logical review chunks. Each chunk should be a coherent unit the reviewer can understand in isolation (~100 lines). You may group hunks from the same or different files.

### Ordering
Order chunks so each one builds on what the reviewer has already seen:
1. Data types, interfaces, and schemas — the vocabulary of the change
2. Core logic that uses those types — the heart of the PR
3. Integration points — where the new logic connects to existing code
4. UI/presentation changes
5. Configuration, build, and infrastructure
6. Tests

### Coverage
Every hunk index (0 through " <> int.to_string(total_hunks - 1) <> ") MUST appear in exactly one chunk. Do not skip any.

### Summary
Write a 2-3 sentence summary that tells the reviewer: what problem does this PR solve, what approach does it take, and what are the key areas to scrutinize.

### Chunk descriptions
Each chunk description must be 2-4 sentences and answer THREE questions:
1. **What**: What does this code do? (1 sentence)
2. **Why now**: Why is the reviewer seeing this chunk at this point in the review? Reference what they've already seen or what's coming next. Examples: \"Now that you've seen the new ExtractionStatus type (chunk 1), this chunk shows where it gets set.\" or \"This sets up the polling hook that chunk 4 will wire into the wizard flow.\"
3. **Watch for**: What should the reviewer pay attention to? Be specific. Examples: \"Check that the error states are exhaustively handled\" or \"Verify the timeout value is reasonable for large files\" or \"Make sure the new field is backwards-compatible with existing data.\"

Do NOT write generic descriptions like \"This chunk modifies the file.\" Every description should help the reviewer do their job.

### Output format
Return ONLY a JSON object (no markdown fences, no other text):
{
  \"summary\": \"2-3 sentence PR summary\",
  \"chunks\": [
    {
      \"index\": 0,
      \"title\": \"Short descriptive title (5-8 words)\",
      \"description\": \"2-4 sentences answering What, Why now, and Watch for.\",
      \"hunk_indices\": [0, 1, 3]
    }
  ]
}"
}

/// Extract JSON from Claude's response, handling potential markdown fences
fn extract_json(text: String) -> String {
  let trimmed = string.trim(text)
  case string.starts_with(trimmed, "```") {
    True -> {
      let without_opening = case string.split_once(trimmed, "\n") {
        Ok(#(_, rest)) -> rest
        Error(_) -> trimmed
      }
      case string.split_once(without_opening, "\n```") {
        Ok(#(json_content, _)) -> string.trim(json_content)
        Error(_) ->
          case string.ends_with(without_opening, "```") {
            True ->
              string.drop_end(without_opening, 3)
              |> string.trim
            False -> without_opening
          }
      }
    }
    False -> trimmed
  }
}

fn format_stream_error(err: api.StreamError) -> String {
  case err {
    api.HttpError(error: e) -> "HTTP error: " <> error.error_to_string(e)
    api.SseParseError(message: msg) -> "SSE parse error: " <> msg
    api.EventDecodeError(message: msg) -> "Event decode error: " <> msg
    api.ApiError(status: status, body: body) ->
      "API error (status " <> int.to_string(status) <> "): " <> body
  }
}

// --- Reassembly ---

/// Look up a hunk by its index from the parsed list.
fn find_hunk(hunks: List(DiffHunk), index: Int) -> Result(DiffHunk, Nil) {
  list.find(hunks, fn(h) { h.hunk_index == index })
}

/// Reassemble a single ReviewChunk from an LlmChunk by looking up real hunks.
fn reassemble_chunk(
  llm_chunk: LlmChunk,
  hunks: List(DiffHunk),
) -> ReviewChunk {
  let matched_hunks =
    llm_chunk.hunk_indices
    |> list.filter_map(fn(idx) { find_hunk(hunks, idx) })

  let start_line = case matched_hunks {
    [first, ..] -> diff_parser.extract_start_line(first.header)
    [] -> 1
  }

  // Check if hunks span multiple files
  let unique_files =
    matched_hunks
    |> list.map(fn(h) { h.file_path })
    |> list.unique

  let display_path = case unique_files {
    [] -> "unknown"
    [single] -> single
    [first, ..] ->
      first
      <> " (+"
      <> int.to_string(list.length(unique_files) - 1)
      <> " more)"
  }

  let diff_content =
    matched_hunks
    |> list.map(fn(h) { h.header <> "\n" <> h.lines })
    |> string.join("\n")

  ReviewChunk(
    index: llm_chunk.index,
    title: llm_chunk.title,
    description: llm_chunk.description,
    file_path: display_path,
    start_line: start_line,
    diff_content: diff_content,
  )
}

/// Find hunk indices that the LLM missed and create an "Ungrouped changes"
/// chunk for them, guaranteeing 100% coverage.
fn build_ungrouped_chunk(
  hunks: List(DiffHunk),
  llm_chunks: List(LlmChunk),
  next_index: Int,
) -> Result(ReviewChunk, Nil) {
  let all_indices =
    hunks
    |> list.map(fn(h) { h.hunk_index })

  let covered_indices =
    llm_chunks
    |> list.flat_map(fn(c) { c.hunk_indices })

  let missing =
    all_indices
    |> list.filter(fn(idx) { !list.contains(covered_indices, idx) })

  case missing {
    [] -> Error(Nil)
    _ -> {
      let missing_hunks =
        missing
        |> list.filter_map(fn(idx) { find_hunk(hunks, idx) })

      let file_path = case missing_hunks {
        [first, ..] -> first.file_path
        [] -> "unknown"
      }

      let start_line = case missing_hunks {
        [first, ..] -> diff_parser.extract_start_line(first.header)
        [] -> 1
      }

      let diff_content =
        missing_hunks
        |> list.map(fn(h) { h.header <> "\n" <> h.lines })
        |> string.join("\n")

      Ok(ReviewChunk(
        index: next_index,
        title: "Ungrouped changes",
        description: "These diff hunks were not assigned to any review chunk by the analyzer. They are included here to guarantee complete diff coverage.",
        file_path: file_path,
        start_line: start_line,
        diff_content: diff_content,
      ))
    }
  }
}

// --- Main entry point ---

pub fn analyze_pr(pr_detail: PrDetail) -> Result(AnalysisResult, String) {
  // Step 1: Parse the diff deterministically
  let hunks = diff_parser.parse_diff(pr_detail.diff)

  // Handle empty diff
  case hunks {
    [] ->
      Ok(AnalysisResult(
        summary: "Empty diff — no changes to review.",
        chunks: [],
      ))
    _ -> do_analyze(pr_detail, hunks)
  }
}

fn do_analyze(
  pr_detail: PrDetail,
  hunks: List(DiffHunk),
) -> Result(AnalysisResult, String) {
  // Step 2: Initialize client with 120s timeout
  use api_client <- result.try(
    config.config_options()
    |> config.with_timeout_ms(120_000)
    |> config.load_config()
    |> result.map(client.new)
    |> result.map_error(fn(err) {
      "Failed to initialize Anthropic client: " <> error.error_to_string(err)
    }),
  )

  // Step 3: Build prompt with hunk summaries
  let prompt = build_prompt(pr_detail, hunks)
  let req =
    request.new(model, [message.user_message(prompt)], max_tokens)
    |> request.with_temperature(0.0)

  // Step 4: Call Anthropic API (streaming)
  use stream_result <- result.try(
    api.chat_stream(api_client, req)
    |> result.map_error(format_stream_error),
  )

  let response_text = api.stream_text(stream_result)

  // Step 5: Parse the LLM's grouping response
  let json_text = extract_json(response_text)
  use llm_response <- result.try(
    json.parse(json_text, llm_response_decoder())
    |> result.map_error(fn(err) {
      "Failed to parse analysis JSON: "
      <> error_format.json_decode_error(err)
      <> "\nAssistant text: "
      <> string.slice(response_text, 0, 500)
    }),
  )

  // Step 6: Reassemble ReviewChunks using real hunk content
  let chunks =
    llm_response.chunks
    |> list.map(fn(c) { reassemble_chunk(c, hunks) })

  // Step 7: Validate completeness — add ungrouped chunk if any hunks were missed
  let next_index = list.length(chunks)
  let final_chunks = case
    build_ungrouped_chunk(hunks, llm_response.chunks, next_index)
  {
    Ok(ungrouped) -> list.append(chunks, [ungrouped])
    Error(_) -> chunks
  }

  Ok(AnalysisResult(summary: llm_response.summary, chunks: final_chunks))
}
