import client/model.{
  type Model, type Msg, AnalyzePr, BackToDashboard, CancelComment, GoToChunk,
  NextChunk, PrevChunk, SetReviewBody, StartComment, SubmitComment,
  SubmitReview, ToggleDescription, UpdateCommentText,
}
import gleam/int
import gleam/list
import gleam/option
import gleam/string
import lustre/attribute
import lustre/element.{type Element}
import lustre/element/html
import lustre/event
import maud
import maud/components
import mork
import shared/pr.{type LineComment, type PrComment, type ReviewChunk}

// ---------------------------------------------------------------------------
// Main view
// ---------------------------------------------------------------------------

pub fn view(model: Model) -> Element(Msg) {
  case model.selected_pr {
    option.None ->
      case model.loading {
        True ->
          html.div(
            [
              attribute.styles([
                #("max-width", "1100px"),
                #("margin", "0 auto"),
                #("padding", "2rem"),
                #("font-family", "system-ui, -apple-system, sans-serif"),
              ]),
            ],
            [loading_indicator(0)],
          )
        False ->
          html.div([], [
            html.text("No PR selected."),
            back_button(),
          ])
      }
    option.Some(detail) ->
      html.div(
        [
          attribute.styles([
            #("max-width", "1100px"),
            #("margin", "0 auto"),
            #("padding", "2rem"),
            #("font-family", "system-ui, -apple-system, sans-serif"),
            #("color", "#1a1a2e"),
          ]),
        ],
        [
          // A. Header
          header_area(detail.title, detail.number, detail.url, model),
          // A2. PR Description accordion
          description_accordion(detail.body, model.description_open),
          // Error display
          case model.error {
            option.Some(err) -> error_banner(err)
            option.None -> html.text("")
          },
          // B. Analysis content or placeholder
          case model.analysis {
            option.Some(analysis) ->
              analysis_view(analysis, detail.url, model)
            option.None ->
              case model.loading {
                True -> loading_indicator(model.stream_heartbeats)
                False ->
                  html.div([], [
                    analyze_prompt(),
                    general_comments_section(model.github_comments),
                  ])
              }
          },
        ],
      )
  }
}

// ---------------------------------------------------------------------------
// A. Header area
// ---------------------------------------------------------------------------

fn header_area(
  title: String,
  number: Int,
  url: String,
  model: Model,
) -> Element(Msg) {
  html.div(
    [
      attribute.styles([
        #("display", "flex"),
        #("align-items", "center"),
        #("justify-content", "space-between"),
        #("margin-bottom", "1.5rem"),
        #("flex-wrap", "wrap"),
        #("gap", "0.75rem"),
      ]),
    ],
    [
      html.div(
        [attribute.styles([#("flex", "1"), #("min-width", "0")])],
        [
          html.h1(
            [
              attribute.styles([
                #("margin", "0"),
                #("font-size", "1.5rem"),
                #("font-weight", "600"),
                #("color", "#1a1a2e"),
                #("display", "flex"),
                #("align-items", "center"),
                #("gap", "0.5rem"),
              ]),
            ],
            [
              html.a(
                [
                  attribute.href(url),
                  attribute.target("_blank"),
                  attribute.title(url),
                  attribute.styles([
                    #("color", "#6c757d"),
                    #("font-weight", "400"),
                    #("text-decoration", "none"),
                  ]),
                ],
                [html.text("#" <> int.to_string(number))],
              ),
              html.text(title),
              html.a(
                [
                  attribute.href(url),
                  attribute.target("_blank"),
                  attribute.title(url),
                  attribute.styles([
                    #("color", "#9ca3af"),
                    #("text-decoration", "none"),
                    #("font-size", "1.125rem"),
                    #("display", "inline-flex"),
                    #("align-items", "center"),
                  ]),
                ],
                [
                  html.span(
                    [attribute.class("material-symbols-outlined")],
                    [html.text("open_in_new")],
                  ),
                ],
              ),
            ],
          ),
        ],
      ),
      html.div(
        [attribute.styles([#("display", "flex"), #("gap", "0.5rem")])],
        [
          back_button(),
          case model.analysis {
            option.None ->
              case model.loading {
                True -> html.text("")
                False -> analyze_button()
              }
            option.Some(_) -> html.text("")
          },
        ],
      ),
    ],
  )
}

fn description_accordion(body: String, is_open: Bool) -> Element(Msg) {
  case string.trim(body) {
    "" -> html.text("")
    _ -> {
      let chevron = case is_open {
        True -> "▾"
        False -> "▸"
      }
      html.div(
        [
          attribute.styles([
            #("background", "#ffffff"),
            #("border", "1px solid #e2e8f0"),
            #("border-radius", "12px"),
            #("margin-bottom", "1.25rem"),
            #("overflow", "hidden"),
          ]),
        ],
        [
          html.div(
            [
              event.on_click(ToggleDescription),
              attribute.styles([
                #("padding", "0.875rem 1.25rem"),
                #("cursor", "pointer"),
                #("display", "flex"),
                #("align-items", "center"),
                #("gap", "0.5rem"),
                #("user-select", "none"),
                #("transition", "background 0.15s"),
              ]),
            ],
            [
              html.span(
                [
                  attribute.styles([
                    #("font-size", "0.875rem"),
                    #("color", "#6b7280"),
                    #("width", "1rem"),
                  ]),
                ],
                [html.text(chevron)],
              ),
              html.span(
                [
                  attribute.styles([
                    #("font-size", "0.9375rem"),
                    #("font-weight", "600"),
                    #("color", "#374151"),
                  ]),
                ],
                [html.text("PR Description")],
              ),
            ],
          ),
          case is_open {
            False -> html.text("")
            True ->
              html.div(
                [
                  attribute.styles([
                    #("padding", "0 1.25rem 1.25rem 1.25rem"),
                    #("border-top", "1px solid #e2e8f0"),
                  ]),
                ],
                [
                  html.div(
                    [
                      attribute.styles([
                        #("margin-top", "1rem"),
                        #("font-size", "0.875rem"),
                        #("line-height", "1.6"),
                        #("color", "#374151"),
                        #("word-break", "break-word"),
                      ]),
                    ],
                    maud.render_markdown(
                      body,
                      mork.configure(),
                      components.default(),
                    ),
                  ),
                ],
              )
          },
        ],
      )
    }
  }
}

fn back_button() -> Element(Msg) {
  html.button(
    [
      event.on_click(BackToDashboard),
      attribute.styles([
        #("padding", "0.5rem 1rem"),
        #("background", "#6c757d"),
        #("color", "white"),
        #("border", "none"),
        #("border-radius", "6px"),
        #("cursor", "pointer"),
        #("font-size", "0.875rem"),
        #("font-weight", "500"),
        #("transition", "background 0.15s"),
      ]),
    ],
    [html.text("Back to Dashboard")],
  )
}

fn analyze_button() -> Element(Msg) {
  html.button(
    [
      event.on_click(AnalyzePr),
      attribute.styles([
        #("padding", "0.5rem 1.25rem"),
        #("background", "#4f46e5"),
        #("color", "white"),
        #("border", "none"),
        #("border-radius", "6px"),
        #("cursor", "pointer"),
        #("font-size", "0.875rem"),
        #("font-weight", "500"),
        #("transition", "background 0.15s"),
      ]),
    ],
    [html.text("Analyze PR")],
  )
}

fn analyze_prompt() -> Element(Msg) {
  html.div(
    [
      attribute.styles([
        #("text-align", "center"),
        #("padding", "4rem 2rem"),
        #("background", "#f8f9fa"),
        #("border-radius", "12px"),
        #("border", "1px solid #e9ecef"),
      ]),
    ],
    [
      html.p(
        [
          attribute.styles([
            #("color", "#6c757d"),
            #("font-size", "1.1rem"),
            #("margin-bottom", "1rem"),
          ]),
        ],
        [html.text("Click \"Analyze PR\" to start AI-powered code review")],
      ),
    ],
  )
}

fn error_banner(message: String) -> Element(Msg) {
  html.div(
    [
      attribute.styles([
        #("padding", "0.75rem 1rem"),
        #("margin-bottom", "1rem"),
        #("background", "#fee2e2"),
        #("border", "1px solid #fca5a5"),
        #("border-radius", "6px"),
        #("color", "#991b1b"),
        #("font-size", "0.9rem"),
        #("white-space", "pre-wrap"),
        #("word-break", "break-word"),
      ]),
    ],
    [html.text(message)],
  )
}

fn loading_indicator(heartbeats: Int) -> Element(Msg) {
  let elapsed_seconds = heartbeats * 3
  let progress_text = case heartbeats {
    0 -> "Connecting to AI analysis..."
    _ ->
      "Analyzing PR with AI... ("
      <> int.to_string(elapsed_seconds)
      <> "s elapsed)"
  }
  html.div(
    [
      attribute.styles([
        #("text-align", "center"),
        #("padding", "4rem 2rem"),
        #("background", "#f8f9fa"),
        #("border-radius", "12px"),
        #("border", "1px solid #e9ecef"),
      ]),
    ],
    [
      html.div(
        [
          attribute.styles([
            #("display", "inline-block"),
            #("width", "2rem"),
            #("height", "2rem"),
            #("border", "3px solid #e9ecef"),
            #("border-top-color", "#4f46e5"),
            #("border-radius", "50%"),
            #("animation", "spin 0.8s linear infinite"),
            #("margin-bottom", "1rem"),
          ]),
        ],
        [],
      ),
      html.p(
        [
          attribute.styles([
            #("color", "#6c757d"),
            #("font-size", "1rem"),
          ]),
        ],
        [html.text(progress_text)],
      ),
    ],
  )
}

// ---------------------------------------------------------------------------
// B. Analysis view (when loaded)
// ---------------------------------------------------------------------------

fn analysis_view(
  analysis: pr.AnalysisResult,
  pr_url: String,
  model: Model,
) -> Element(Msg) {
  let chunk_count = list.length(analysis.chunks)
  let current = model.current_chunk
  let maybe_chunk =
    list.drop(analysis.chunks, current)
    |> list.first

  html.div([], [
    // B1. Summary panel
    summary_panel(analysis.summary, current, chunk_count, model.comments),
    // B2. Current chunk panel
    case maybe_chunk {
      Ok(chunk) ->
        chunk_panel(
          chunk,
          pr_url,
          model.commenting_line,
          model.comment_text,
          model.comments,
          model.github_comments,
          model.posting_comment,
        )
      Error(_) ->
        html.p([], [html.text("No chunks available.")])
    },
    // B4. Bottom navigation
    bottom_navigation(current, chunk_count),
    // B5. Submit review section
    review_submission_section(model.review_body, model.submitting_review),
  ])
}

// ---------------------------------------------------------------------------
// B1. Summary panel
// ---------------------------------------------------------------------------

fn summary_panel(
  summary: String,
  current: Int,
  total: Int,
  comments: List(LineComment),
) -> Element(Msg) {
  html.div(
    [
      attribute.styles([
        #("background", "#ffffff"),
        #("border", "1px solid #e2e8f0"),
        #("border-radius", "12px"),
        #("padding", "1.25rem 1.5rem"),
        #("margin-bottom", "1.25rem"),
      ]),
    ],
    [
      html.h2(
        [
          attribute.styles([
            #("margin", "0 0 0.75rem 0"),
            #("font-size", "1rem"),
            #("font-weight", "600"),
            #("color", "#374151"),
          ]),
        ],
        [html.text("AI Summary")],
      ),
      html.p(
        [
          attribute.styles([
            #("margin", "0 0 1rem 0"),
            #("color", "#4b5563"),
            #("line-height", "1.6"),
            #("font-size", "0.925rem"),
          ]),
        ],
        [html.text(summary)],
      ),
      chunk_navigator(current, total, comments),
    ],
  )
}

fn chunk_navigator(
  current: Int,
  total: Int,
  comments: List(LineComment),
) -> Element(Msg) {
  html.div(
    [
      attribute.styles([
        #("display", "flex"),
        #("align-items", "center"),
        #("gap", "0.75rem"),
        #("flex-wrap", "wrap"),
      ]),
    ],
    [
      nav_button("Prev", PrevChunk, current > 0),
      html.span(
        [
          attribute.styles([
            #("font-size", "0.875rem"),
            #("color", "#6b7280"),
            #("font-weight", "500"),
            #("min-width", "6rem"),
            #("text-align", "center"),
          ]),
        ],
        [
          html.text(
            "Chunk "
            <> int.to_string(current + 1)
            <> " of "
            <> int.to_string(total),
          ),
        ],
      ),
      nav_button("Next", NextChunk, current < total - 1),
      // Chunk dots/pills
      html.div(
        [
          attribute.styles([
            #("display", "flex"),
            #("gap", "0.375rem"),
            #("margin-left", "0.5rem"),
            #("flex-wrap", "wrap"),
          ]),
        ],
        make_range(0, total - 1)
          |> list.map(fn(i) { chunk_pill(i, current, comments) }),
      ),
    ],
  )
}

fn chunk_pill(
  index: Int,
  current: Int,
  comments: List(LineComment),
) -> Element(Msg) {
  let is_active = index == current
  let has_comments =
    list.any(comments, fn(c) { c.chunk_index == index })
  let bg = case is_active {
    True -> "#4f46e5"
    False -> "#e5e7eb"
  }
  html.button(
    [
      event.on_click(GoToChunk(index)),
      attribute.styles([
        #("width", "1.25rem"),
        #("height", "1.25rem"),
        #("border-radius", "50%"),
        #("border", "none"),
        #("background", bg),
        #("cursor", "pointer"),
        #("position", "relative"),
        #("padding", "0"),
        #("transition", "background 0.15s"),
      ]),
    ],
    case has_comments {
      True -> [
        html.span(
          [
            attribute.styles([
              #("position", "absolute"),
              #("top", "-2px"),
              #("right", "-2px"),
              #("width", "8px"),
              #("height", "8px"),
              #("border-radius", "50%"),
              #("background", "#f59e0b"),
              #("border", "1.5px solid white"),
            ]),
          ],
          [],
        ),
      ]
      False -> []
    },
  )
}

fn nav_button(label: String, msg: Msg, enabled: Bool) -> Element(Msg) {
  html.button(
    [
      event.on_click(msg),
      attribute.disabled(!enabled),
      attribute.styles([
        #("padding", "0.375rem 0.875rem"),
        #("background", case enabled {
          True -> "#4f46e5"
          False -> "#d1d5db"
        }),
        #("color", case enabled {
          True -> "white"
          False -> "#9ca3af"
        }),
        #("border", "none"),
        #("border-radius", "6px"),
        #("cursor", case enabled {
          True -> "pointer"
          False -> "not-allowed"
        }),
        #("font-size", "0.8125rem"),
        #("font-weight", "500"),
        #("transition", "background 0.15s"),
      ]),
    ],
    [html.text(label)],
  )
}

// ---------------------------------------------------------------------------
// B2. Chunk panel
// ---------------------------------------------------------------------------

fn chunk_panel(
  chunk: ReviewChunk,
  pr_url: String,
  commenting_line: option.Option(Int),
  comment_text: String,
  comments: List(LineComment),
  github_comments: List(PrComment),
  posting_comment: Bool,
) -> Element(Msg) {
  let chunk_comments =
    list.filter(comments, fn(c) { c.chunk_index == chunk.index })
  // Filter GitHub comments that match any file in this chunk
  // (chunk.file_path may have " (+N more)" suffix for multi-file chunks)
  let chunk_github_comments =
    list.filter(github_comments, fn(c) {
      string.contains(chunk.file_path, c.path) && c.path != ""
    })

  html.div(
    [
      attribute.styles([
        #("background", "#ffffff"),
        #("border", "1px solid #e2e8f0"),
        #("border-radius", "12px"),
        #("margin-bottom", "1.25rem"),
        #("overflow", "hidden"),
      ]),
    ],
    [
      // Chunk header
      html.div(
        [
          attribute.styles([
            #("padding", "1rem 1.5rem"),
            #("border-bottom", "1px solid #e2e8f0"),
          ]),
        ],
        [
          html.h3(
            [
              attribute.styles([
                #("margin", "0 0 0.375rem 0"),
                #("font-size", "1.05rem"),
                #("font-weight", "600"),
                #("color", "#1e293b"),
              ]),
            ],
            [html.text(chunk.title)],
          ),
          html.div(
            [
              attribute.styles([
                #("background", "#eff6ff"),
                #("border", "1px solid #bfdbfe"),
                #("border-radius", "8px"),
                #("padding", "0.75rem 1rem"),
                #("margin-top", "0.5rem"),
                #("font-size", "0.875rem"),
                #("line-height", "1.5"),
                #("color", "#374151"),
              ]),
            ],
            [html.text(chunk.description)],
          ),
        ],
      ),
      // File path with GitHub link
      html.div(
        [
          attribute.styles([
            #("padding", "0.625rem 1.5rem"),
            #("background", "#f8fafc"),
            #("border-bottom", "1px solid #e2e8f0"),
            #(
              "font-family",
              "\"SF Mono\", \"Fira Code\", \"Consolas\", monospace",
            ),
            #("font-size", "0.8125rem"),
            #("color", "#6b7280"),
            #("display", "flex"),
            #("align-items", "center"),
            #("gap", "0.5rem"),
          ]),
        ],
        [
          html.text(chunk.file_path),
          html.a(
            [
              attribute.href(pr_url <> "/files"),
              attribute.target("_blank"),
              attribute.title("View files on GitHub"),
              attribute.styles([
                #("color", "#9ca3af"),
                #("text-decoration", "none"),
                #("font-size", "0.875rem"),
                #("display", "inline-flex"),
                #("align-items", "center"),
                #("line-height", "1"),
              ]),
            ],
            [
              html.span(
                [attribute.class("material-symbols-outlined")],
                [html.text("open_in_new")],
              ),
            ],
          ),
        ],
      ),
      // Diff content
      diff_view(
        chunk,
        commenting_line,
        comment_text,
        chunk_comments,
        chunk_github_comments,
        posting_comment,
      ),
    ],
  )
}

// ---------------------------------------------------------------------------
// Diff rendering
// ---------------------------------------------------------------------------

fn diff_view(
  chunk: ReviewChunk,
  commenting_line: option.Option(Int),
  comment_text: String,
  chunk_comments: List(LineComment),
  chunk_github_comments: List(PrComment),
  posting_comment: Bool,
) -> Element(Msg) {
  let lines = string.split(chunk.diff_content, "\n")
  // Parse actual file line numbers from hunk headers
  let file_indexed_lines = index_with_file_lines(lines)

  html.div(
    [
      attribute.styles([
        #("overflow-x", "auto"),
        #(
          "font-family",
          "\"SF Mono\", \"Fira Code\", \"Consolas\", monospace",
        ),
        #("font-size", "0.8125rem"),
        #("line-height", "1.5"),
      ]),
    ],
    list.flat_map(file_indexed_lines, fn(entry) {
        let line_comments =
          list.filter(chunk_comments, fn(c) {
            c.line_number == entry.display_line
          })
        let line_github_comments =
          list.filter(chunk_github_comments, fn(c) {
            c.line == entry.file_line
          })
        let is_commenting =
          commenting_line == option.Some(entry.display_line)

        list.flatten([
          [diff_line_row(entry.display_line, entry.file_line, entry.text)],
          list.map(line_github_comments, fn(c) { github_comment_display(c) }),
          list.map(line_comments, fn(c) { comment_display(c) }),
          case is_commenting {
            True -> [comment_input(comment_text, posting_comment)]
            False -> []
          },
        ])
      }),
  )
}

/// A diff line with both display index and actual file line number.
type DiffLineEntry {
  DiffLineEntry(
    display_line: Int,
    file_line: Int,
    text: String,
  )
}

/// Parse diff lines and compute actual file line numbers from @@ headers.
fn index_with_file_lines(lines: List(String)) -> List(DiffLineEntry) {
  index_file_lines_acc(lines, 1, 0, [])
  |> list.reverse
}

fn index_file_lines_acc(
  lines: List(String),
  display_idx: Int,
  current_file_line: Int,
  acc: List(DiffLineEntry),
) -> List(DiffLineEntry) {
  case lines {
    [] -> acc
    [line, ..rest] -> {
      case string.starts_with(line, "@@") {
        True -> {
          // Parse new file line from @@ header: @@ -old,count +new,start @@
          let new_line = parse_hunk_new_start(line)
          let entry =
            DiffLineEntry(
              display_line: display_idx,
              file_line: 0,
              text: line,
            )
          index_file_lines_acc(
            rest,
            display_idx + 1,
            new_line,
            [entry, ..acc],
          )
        }
        False -> {
          case string.starts_with(line, "-") {
            True -> {
              // Removed line — doesn't increment new file line number
              let entry =
                DiffLineEntry(
                  display_line: display_idx,
                  file_line: current_file_line,
                  text: line,
                )
              index_file_lines_acc(
                rest,
                display_idx + 1,
                current_file_line,
                [entry, ..acc],
              )
            }
            False -> {
              // Added line or context line — increments new file line number
              let entry =
                DiffLineEntry(
                  display_line: display_idx,
                  file_line: current_file_line,
                  text: line,
                )
              index_file_lines_acc(
                rest,
                display_idx + 1,
                current_file_line + 1,
                [entry, ..acc],
              )
            }
          }
        }
      }
    }
  }
}

/// Parse the +new_start from a hunk header like "@@ -10,5 +20,8 @@"
fn parse_hunk_new_start(header: String) -> Int {
  case string.split(header, "+") {
    [_, after_plus, ..] ->
      case string.split(after_plus, ",") {
        [num_str, ..] ->
          case int.parse(num_str) {
            Ok(n) -> n
            Error(_) -> 1
          }
        _ -> 1
      }
    _ -> 1
  }
}

fn make_range(from: Int, to: Int) -> List(Int) {
  case from > to {
    True -> []
    False -> [from, ..make_range(from + 1, to)]
  }
}

fn diff_line_row(
  display_line: Int,
  file_line: Int,
  line: String,
) -> Element(Msg) {
  let #(bg, border_color) = line_colors(line)
  // Show file line number in gutter (0 for hunk headers)
  let gutter_text = case file_line {
    0 -> ""
    n -> int.to_string(n)
  }
  html.div(
    [
      event.on_click(StartComment(display_line)),
      attribute.styles([
        #("display", "flex"),
        #("background", bg),
        #("border-left", "3px solid " <> border_color),
        #("cursor", "pointer"),
        #("transition", "filter 0.1s"),
      ]),
    ],
    [
      // Line number gutter — shows actual file line number
      html.span(
        [
          attribute.styles([
            #("display", "inline-block"),
            #("min-width", "3.5rem"),
            #("padding", "0 0.5rem"),
            #("text-align", "right"),
            #("color", "#9ca3af"),
            #("user-select", "none"),
            #("background", case bg {
              "transparent" -> "#fafafa"
              _ -> "rgba(0,0,0,0.03)"
            }),
            #("border-right", "1px solid #e5e7eb"),
            #("flex-shrink", "0"),
          ]),
        ],
        [html.text(gutter_text)],
      ),
      // Line content
      html.span(
        [
          attribute.styles([
            #("padding", "0 0.75rem"),
            #("white-space", "pre"),
            #("flex", "1"),
          ]),
        ],
        [html.text(line)],
      ),
    ],
  )
}

fn line_colors(line: String) -> #(String, String) {
  case line {
    "+" <> _ -> #("#dcfce7", "#22c55e")
    "-" <> _ -> #("#fee2e2", "#ef4444")
    "@@" <> _ -> #("#ede9fe", "#8b5cf6")
    _ -> #("transparent", "transparent")
  }
}

// ---------------------------------------------------------------------------
// B3. Line commenting
// ---------------------------------------------------------------------------

fn comment_display(comment: LineComment) -> Element(Msg) {
  html.div(
    [
      attribute.styles([
        #("background", "#fef9c3"),
        #("border-left", "3px solid #f59e0b"),
        #("padding", "0.5rem 0.75rem 0.5rem 4.25rem"),
        #("font-family", "system-ui, -apple-system, sans-serif"),
        #("font-size", "0.8125rem"),
        #("color", "#92400e"),
        #("line-height", "1.4"),
      ]),
    ],
    [html.text(comment.body)],
  )
}

fn comment_input(text: String, posting_comment: Bool) -> Element(Msg) {
  let button_text = case posting_comment {
    True -> "Posting..."
    False -> "Comment"
  }
  html.div(
    [
      attribute.styles([
        #("padding", "0.75rem 0.75rem 0.75rem 4.25rem"),
        #("background", "#fffbeb"),
        #("border-left", "3px solid #fbbf24"),
        #("display", "flex"),
        #("gap", "0.5rem"),
        #("align-items", "flex-start"),
      ]),
    ],
    [
      html.textarea(
        [
          attribute.styles([
            #("flex", "1"),
            #("min-height", "3rem"),
            #("padding", "0.5rem"),
            #("border", "1px solid #d1d5db"),
            #("border-radius", "6px"),
            #("font-family", "system-ui, -apple-system, sans-serif"),
            #("font-size", "0.8125rem"),
            #("resize", "vertical"),
            #("outline", "none"),
          ]),
          attribute.placeholder("Add a comment..."),
          attribute.value(text),
          event.on_input(UpdateCommentText),
        ],
        "",
      ),
      html.div(
        [
          attribute.styles([
            #("display", "flex"),
            #("flex-direction", "column"),
            #("gap", "0.375rem"),
          ]),
        ],
        [
          html.button(
            [
              event.on_click(SubmitComment),
              attribute.disabled(posting_comment),
              attribute.styles([
                #("padding", "0.375rem 0.75rem"),
                #("background", case posting_comment {
                  True -> "#9ca3af"
                  False -> "#4f46e5"
                }),
                #("color", "white"),
                #("border", "none"),
                #("border-radius", "5px"),
                #("cursor", case posting_comment {
                  True -> "not-allowed"
                  False -> "pointer"
                }),
                #("font-size", "0.75rem"),
                #("font-weight", "500"),
              ]),
            ],
            [html.text(button_text)],
          ),
          html.button(
            [
              event.on_click(CancelComment),
              attribute.styles([
                #("padding", "0.375rem 0.75rem"),
                #("background", "#e5e7eb"),
                #("color", "#374151"),
                #("border", "none"),
                #("border-radius", "5px"),
                #("cursor", "pointer"),
                #("font-size", "0.75rem"),
                #("font-weight", "500"),
              ]),
            ],
            [html.text("Cancel")],
          ),
        ],
      ),
    ],
  )
}

fn github_comment_display(comment: PrComment) -> Element(Msg) {
  html.div(
    [
      attribute.styles([
        #("background", "#dbeafe"),
        #("border-left", "3px solid #3b82f6"),
        #("padding", "0.5rem 0.75rem 0.5rem 4.25rem"),
        #("font-family", "system-ui, -apple-system, sans-serif"),
        #("font-size", "0.8125rem"),
        #("color", "#1e40af"),
        #("line-height", "1.4"),
      ]),
    ],
    [
      html.div(
        [
          attribute.styles([
            #("display", "flex"),
            #("justify-content", "space-between"),
            #("margin-bottom", "0.25rem"),
            #("font-size", "0.75rem"),
            #("color", "#6b7280"),
          ]),
        ],
        [
          html.span(
            [attribute.styles([#("font-weight", "600")])],
            [html.text(comment.author)],
          ),
          html.span([], [html.text(comment.created_at)]),
        ],
      ),
      html.div(
        [],
        maud.render_markdown(
          comment.body,
          mork.configure(),
          components.default(),
        ),
      ),
    ],
  )
}

fn general_comments_section(
  github_comments: List(PrComment),
) -> Element(Msg) {
  let general_comments =
    list.filter(github_comments, fn(c) { c.path == "" })
  case general_comments {
    [] -> html.text("")
    _ ->
      html.div(
        [
          attribute.styles([
            #("background", "#ffffff"),
            #("border", "1px solid #e2e8f0"),
            #("border-radius", "12px"),
            #("padding", "1.25rem 1.5rem"),
            #("margin-top", "1.25rem"),
          ]),
        ],
        [
          html.h2(
            [
              attribute.styles([
                #("margin", "0 0 0.75rem 0"),
                #("font-size", "1rem"),
                #("font-weight", "600"),
                #("color", "#374151"),
              ]),
            ],
            [html.text("Comments")],
          ),
          html.div(
            [],
            list.map(general_comments, fn(comment) {
              html.div(
                [
                  attribute.styles([
                    #("background", "#dbeafe"),
                    #("border-left", "3px solid #3b82f6"),
                    #("padding", "0.75rem 1rem"),
                    #("margin-bottom", "0.5rem"),
                    #("border-radius", "0 8px 8px 0"),
                    #("font-size", "0.875rem"),
                    #("color", "#1e40af"),
                    #("line-height", "1.5"),
                  ]),
                ],
                [
                  html.div(
                    [
                      attribute.styles([
                        #("display", "flex"),
                        #("justify-content", "space-between"),
                        #("margin-bottom", "0.375rem"),
                        #("font-size", "0.75rem"),
                        #("color", "#6b7280"),
                      ]),
                    ],
                    [
                      html.span(
                        [attribute.styles([#("font-weight", "600")])],
                        [html.text(comment.author)],
                      ),
                      html.span([], [html.text(comment.created_at)]),
                    ],
                  ),
                  html.div(
                    [],
                    maud.render_markdown(
                      comment.body,
                      mork.configure(),
                      components.default(),
                    ),
                  ),
                ],
              )
            }),
          ),
        ],
      )
  }
}

// ---------------------------------------------------------------------------
// B4. Bottom navigation
// ---------------------------------------------------------------------------

fn bottom_navigation(current: Int, total: Int) -> Element(Msg) {
  html.div(
    [
      attribute.styles([
        #("display", "flex"),
        #("justify-content", "center"),
        #("align-items", "center"),
        #("gap", "1rem"),
        #("padding", "1rem 0"),
      ]),
    ],
    [
      nav_button("Previous Chunk", PrevChunk, current > 0),
      html.span(
        [
          attribute.styles([
            #("font-size", "0.875rem"),
            #("color", "#6b7280"),
          ]),
        ],
        [
          html.text(
            int.to_string(current + 1)
            <> " / "
            <> int.to_string(total),
          ),
        ],
      ),
      nav_button("Next Chunk", NextChunk, current < total - 1),
    ],
  )
}

// ---------------------------------------------------------------------------
// B5. Review submission section
// ---------------------------------------------------------------------------

fn review_submission_section(
  review_body: String,
  submitting: Bool,
) -> Element(Msg) {
  html.div(
    [
      attribute.styles([
        #("background", "#ffffff"),
        #("border", "1px solid #e2e8f0"),
        #("border-radius", "12px"),
        #("padding", "1.25rem 1.5rem"),
        #("margin-top", "1.5rem"),
      ]),
    ],
    [
      html.h2(
        [
          attribute.styles([
            #("margin", "0 0 0.75rem 0"),
            #("font-size", "1rem"),
            #("font-weight", "600"),
            #("color", "#374151"),
          ]),
        ],
        [html.text("Submit Review")],
      ),
      html.textarea(
        [
          attribute.styles([
            #("width", "100%"),
            #("min-height", "4rem"),
            #("padding", "0.625rem"),
            #("border", "1px solid #d1d5db"),
            #("border-radius", "8px"),
            #("font-family", "system-ui, -apple-system, sans-serif"),
            #("font-size", "0.875rem"),
            #("resize", "vertical"),
            #("outline", "none"),
            #("box-sizing", "border-box"),
            #("margin-bottom", "0.75rem"),
          ]),
          attribute.placeholder(
            "Leave a comment with your review (optional for approvals)...",
          ),
          attribute.value(review_body),
          event.on_input(SetReviewBody),
        ],
        "",
      ),
      html.div(
        [
          attribute.styles([
            #("display", "flex"),
            #("gap", "0.5rem"),
            #("flex-wrap", "wrap"),
          ]),
        ],
        [
          review_action_button(
            "Approve",
            "APPROVE",
            "#16a34a",
            "#15803d",
            submitting,
          ),
          review_action_button(
            "Request Changes",
            "REQUEST_CHANGES",
            "#ea580c",
            "#c2410c",
            submitting,
          ),
          review_action_button(
            "Comment",
            "COMMENT",
            "#4f46e5",
            "#4338ca",
            submitting,
          ),
        ],
      ),
    ],
  )
}

fn review_action_button(
  label: String,
  event_type: String,
  bg_color: String,
  _hover_color: String,
  submitting: Bool,
) -> Element(Msg) {
  html.button(
    [
      event.on_click(SubmitReview(event_type)),
      attribute.disabled(submitting),
      attribute.styles([
        #("padding", "0.5rem 1.25rem"),
        #("background", case submitting {
          True -> "#9ca3af"
          False -> bg_color
        }),
        #("color", "white"),
        #("border", "none"),
        #("border-radius", "6px"),
        #("cursor", case submitting {
          True -> "not-allowed"
          False -> "pointer"
        }),
        #("font-size", "0.875rem"),
        #("font-weight", "500"),
        #("transition", "background 0.15s"),
      ]),
    ],
    [
      html.text(case submitting {
        True -> "Submitting..."
        False -> label
      }),
    ],
  )
}
