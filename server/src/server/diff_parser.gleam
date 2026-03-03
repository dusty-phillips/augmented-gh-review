import gleam/int
import gleam/list
import gleam/string

pub type DiffHunk {
  DiffHunk(
    file_path: String,
    hunk_index: Int,
    header: String,
    lines: String,
    line_count: Int,
  )
}

/// Parse a unified diff string into a list of structured DiffHunk values.
/// Every hunk is preserved with a sequential index, guaranteeing no lines
/// are lost.
pub fn parse_diff(diff: String) -> List(DiffHunk) {
  let file_sections = split_into_file_sections(diff)
  file_sections
  |> list.flat_map(fn(section) { parse_file_section(section.0, section.1) })
  |> list.index_map(fn(hunk, idx) { DiffHunk(..hunk, hunk_index: idx) })
}

/// Split the full diff text into per-file sections.
/// Returns a list of #(file_path, section_body) tuples.
fn split_into_file_sections(diff: String) -> List(#(String, String)) {
  let lines = string.split(diff, "\n")
  do_split_files(lines, "", [], [])
  |> list.reverse
}

fn do_split_files(
  lines: List(String),
  current_path: String,
  current_lines: List(String),
  acc: List(#(String, String)),
) -> List(#(String, String)) {
  case lines {
    [] -> {
      case current_path {
        "" -> acc
        _ -> [
          #(current_path, current_lines |> list.reverse |> string.join("\n")),
          ..acc
        ]
      }
    }
    [line, ..rest] -> {
      case string.starts_with(line, "diff --git ") {
        True -> {
          let path = extract_file_path(line)
          let new_acc = case current_path {
            "" -> acc
            _ -> [
              #(
                current_path,
                current_lines |> list.reverse |> string.join("\n"),
              ),
              ..acc
            ]
          }
          do_split_files(rest, path, [], new_acc)
        }
        False -> {
          do_split_files(rest, current_path, [line, ..current_lines], acc)
        }
      }
    }
  }
}

/// Extract the file path from a "diff --git a/path b/path" line.
/// Takes the b/... path and strips the "b/" prefix.
fn extract_file_path(diff_git_line: String) -> String {
  case string.split_once(diff_git_line, " b/") {
    Ok(#(_, path)) -> path
    Error(_) -> {
      // Fallback: try to get path after last space
      case string.split(diff_git_line, " ") {
        [] -> "unknown"
        parts -> {
          case list.last(parts) {
            Ok(last) ->
              case string.starts_with(last, "b/") {
                True -> string.drop_start(last, 2)
                False -> last
              }
            Error(_) -> "unknown"
          }
        }
      }
    }
  }
}

/// Parse a single file section into hunks by splitting on @@ headers.
/// Returns hunks with hunk_index set to 0 (will be reassigned later).
fn parse_file_section(
  file_path: String,
  section: String,
) -> List(DiffHunk) {
  let lines = string.split(section, "\n")
  do_split_hunks(lines, file_path, "", [], [])
  |> list.reverse
}

fn do_split_hunks(
  lines: List(String),
  file_path: String,
  current_header: String,
  current_lines: List(String),
  acc: List(DiffHunk),
) -> List(DiffHunk) {
  case lines {
    [] -> {
      case current_header {
        "" -> acc
        _ -> {
          let body = current_lines |> list.reverse |> string.join("\n")
          let line_count =
            current_lines
            |> list.length
          [
            DiffHunk(
              file_path: file_path,
              hunk_index: 0,
              header: current_header,
              lines: body,
              line_count: line_count,
            ),
            ..acc
          ]
        }
      }
    }
    [line, ..rest] -> {
      case string.starts_with(line, "@@") {
        True -> {
          let new_acc = case current_header {
            "" -> acc
            _ -> {
              let body = current_lines |> list.reverse |> string.join("\n")
              let line_count =
                current_lines
                |> list.length
              [
                DiffHunk(
                  file_path: file_path,
                  hunk_index: 0,
                  header: current_header,
                  lines: body,
                  line_count: line_count,
                ),
                ..acc
              ]
            }
          }
          do_split_hunks(rest, file_path, line, [], new_acc)
        }
        False -> {
          case current_header {
            "" ->
              // Lines before the first hunk header (e.g. index, ---, +++ lines)
              // Skip them - they're file-level metadata, not hunk content
              do_split_hunks(rest, file_path, current_header, current_lines, acc)
            _ ->
              do_split_hunks(
                rest,
                file_path,
                current_header,
                [line, ..current_lines],
                acc,
              )
          }
        }
      }
    }
  }
}

/// Extract the start line number from a hunk header like "@@ -10,5 +20,8 @@".
/// Returns the "new file" start line (the + side).
pub fn extract_start_line(header: String) -> Int {
  // Header format: @@ -old_start,old_count +new_start,new_count @@ optional context
  // We want new_start
  case string.split_once(header, "+") {
    Ok(#(_, after_plus)) -> {
      // after_plus is like "20,8 @@ ..." or "20 @@ ..."
      let num_str = case string.split_once(after_plus, ",") {
        Ok(#(n, _)) -> n
        Error(_) ->
          case string.split_once(after_plus, " ") {
            Ok(#(n, _)) -> n
            Error(_) -> after_plus
          }
      }
      case int.parse(string.trim(num_str)) {
        Ok(n) -> n
        Error(_) -> 1
      }
    }
    Error(_) -> 1
  }
}

/// Build a text summary of hunks for the LLM prompt.
/// Includes index, file path, header, line count, and a preview of the first
/// few lines of each hunk.
pub fn build_hunk_summary(hunks: List(DiffHunk)) -> String {
  hunks
  |> list.map(fn(hunk) {
    let preview_lines =
      hunk.lines
      |> string.split("\n")
      |> list.take(5)
      |> string.join("\n")
    "### Hunk "
    <> int.to_string(hunk.hunk_index)
    <> "\n- File: "
    <> hunk.file_path
    <> "\n- Header: "
    <> hunk.header
    <> "\n- Lines: "
    <> int.to_string(hunk.line_count)
    <> "\n- Preview:\n```\n"
    <> preview_lines
    <> "\n```\n"
  })
  |> string.join("\n")
}
