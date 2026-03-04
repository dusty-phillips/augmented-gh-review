import client/highlight
import client/model.{
  type Model, type Msg, Analyzed, Analyzing, AnalyzePr, BackToDashboard,
  CancelComment, Commenting, GoToChunk, NextChunk, NotAnalyzed, NotCommenting,
  PostingComment, PrevChunk, ReviewIdle, SetReviewBody, StartComment,
  SubmitComment, SubmitReview, SubmittingReview, ToggleDescription,
  UpdateCommentText,
}
import gleam/int
import gleam/list
import gleam/option
import gleam/string
import lustre/attribute
import lustre/element.{type Element}
import lustre/element/html
import lustre/event
import client/markdown
import shared/pr.{type LineComment, type PrComment, type ReviewChunk}

import monks/align_items
import monks/animation
import monks/background
import monks/border
import monks/border_bottom
import monks/border_left
import monks/border_radius
import monks/box_sizing
import monks/color
import monks/cursor
import monks/display
import monks/flex
import monks/flex_direction
import monks/flex_shrink
import monks/flex_wrap
import monks/font_size
import monks/font_weight
import monks/gap
import monks/justify_content
import monks/line_height
import monks/margin
import monks/margin_bottom
import monks/margin_top
import monks/max_width
import monks/min_height
import monks/min_width
import monks/outline
import monks/overflow
import monks/padding
import monks/position
import monks/resize
import monks/text_align
import monks/text_decoration
import monks/transition
import monks/user_select
import monks/white_space
import monks/width
import monks/word_break

import open_props/borders
import open_props/colors
import open_props/fonts
import open_props/sizes

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
                max_width.raw("1100px"),
                margin.raw("0 auto"),
                padding.raw(sizes.size_7),
                #("font-family", fonts.font_system_ui),
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
            max_width.raw("1100px"),
            margin.raw("0 auto"),
            padding.raw(sizes.size_7),
            #("font-family", fonts.font_system_ui),
            color.raw(colors.indigo_12),
          ]),
        ],
        [
          // A. Header
          header_area(detail.title, detail.number, detail.url, detail.head_branch, model),
          // A2. PR Description accordion
          description_accordion(detail.body, model.description_open),
          // Error display
          case model.error {
            option.Some(err) -> error_banner(err)
            option.None -> html.text("")
          },
          // General PR comments (always visible)
          general_comments_section(model.github_comments),
          // B. Analysis content or loading
          case model.analysis_state {
            Analyzed(analysis) ->
              analysis_view(analysis, detail.url, model)
            Analyzing(heartbeats) ->
              loading_indicator(heartbeats)
            NotAnalyzed ->
              case model.loading {
                True -> loading_indicator(0)
                False -> analyze_prompt()
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
  head_branch: String,
  model: Model,
) -> Element(Msg) {
  html.div(
    [
      attribute.styles([
        display.flex,
        align_items.flex_start,
        justify_content.space_between,
        margin_bottom.raw(sizes.size_5),
        flex_wrap.wrap,
        gap.raw(sizes.size_3),
      ]),
    ],
    [
      html.div(
        [attribute.styles([flex.raw("1"), min_width.raw("0")])],
        [
          html.h1(
            [
              attribute.styles([
                margin.raw("0"),
                font_size.raw(fonts.font_size_4),
                font_weight.raw("600"),
                color.raw(colors.indigo_12),
                display.flex,
                align_items.center,
                gap.raw(sizes.size_2),
              ]),
            ],
            [
              html.a(
                [
                  attribute.href(url),
                  attribute.target("_blank"),
                  attribute.title(url),
                  attribute.styles([
                    color.raw(colors.gray_6),
                    font_weight.raw("400"),
                    text_decoration.none,
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
                    color.raw(colors.gray_5),
                    text_decoration.none,
                    font_size.raw(fonts.font_size_3),
                    display.inline_flex,
                    align_items.center,
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
          html.div(
            [
              attribute.styles([
                display.inline_flex,
                align_items.center,
                gap.raw("0.375rem"),
                margin_top.raw(sizes.size_2),
                padding.raw("0.25rem 0.625rem"),
                background.raw(colors.violet_2),
                border_radius.raw("999px"),
                #("font-family", fonts.font_mono),
                font_size.raw(fonts.font_size_00),
                color.raw(colors.violet_9),
                line_height.raw("1.4"),
              ]),
            ],
            [
              html.span(
                [
                  attribute.class("material-symbols-outlined"),
                  attribute.styles([font_size.raw(fonts.font_size_0)]),
                ],
                [html.text("account_tree")],
              ),
              html.text(head_branch),
            ],
          ),
        ],
      ),
      html.div(
        [attribute.styles([display.flex, gap.raw(sizes.size_2)])],
        [
          back_button(),
          case model.analysis_state {
            NotAnalyzed -> analyze_button()
            Analyzing(_) -> html.text("")
            Analyzed(_) -> analyze_button()
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
            background.raw("white"),
            border.raw("1px solid " <> colors.gray_3),
            border_radius.raw(borders.radius_3),
            margin_bottom.raw(sizes.size_5),
            overflow.hidden,
          ]),
        ],
        [
          html.div(
            [
              event.on_click(ToggleDescription),
              attribute.styles([
                padding.raw("0.875rem 1.25rem"),
                cursor.pointer,
                display.flex,
                align_items.center,
                gap.raw(sizes.size_2),
                user_select.none,
                transition.raw("background 0.15s"),
              ]),
            ],
            [
              html.span(
                [
                  attribute.styles([
                    font_size.raw(fonts.font_size_0),
                    color.raw(colors.gray_6),
                    width.raw(sizes.size_4),
                  ]),
                ],
                [html.text(chevron)],
              ),
              html.span(
                [
                  attribute.styles([
                    font_size.raw(fonts.font_size_1),
                    font_weight.raw("600"),
                    color.raw(colors.gray_8),
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
                    padding.raw("0 1.25rem 1.25rem 1.25rem"),
                    #("border-top", "1px solid " <> colors.gray_3),
                  ]),
                ],
                [
                  html.div(
                    [
                      attribute.styles([
                        margin_top.raw(sizes.size_4),
                        font_size.raw(fonts.font_size_0),
                        line_height.raw(fonts.font_lineheight_4),
                        color.raw(colors.gray_8),
                        word_break.break_word,
                      ]),
                    ],
                    markdown.render(body),
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
        padding.raw(sizes.size_2 <> " " <> sizes.size_4),
        background.raw(colors.gray_6),
        color.raw("white"),
        border.none,
        border_radius.raw(borders.radius_2),
        cursor.pointer,
        font_size.raw(fonts.font_size_0),
        font_weight.raw("500"),
        transition.raw("background 0.15s"),
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
        padding.raw(sizes.size_2 <> " " <> sizes.size_5),
        background.raw(colors.indigo_7),
        color.raw("white"),
        border.none,
        border_radius.raw(borders.radius_2),
        cursor.pointer,
        font_size.raw(fonts.font_size_0),
        font_weight.raw("500"),
        transition.raw("background 0.15s"),
      ]),
    ],
    [html.text("Analyze PR")],
  )
}

fn analyze_prompt() -> Element(Msg) {
  html.div(
    [
      attribute.styles([
        text_align.center,
        padding.raw(sizes.size_10 <> " " <> sizes.size_7),
        background.raw(colors.gray_1),
        border_radius.raw(borders.radius_3),
        border.raw("1px solid " <> colors.gray_2),
      ]),
    ],
    [
      html.p(
        [
          attribute.styles([
            color.raw(colors.gray_6),
            font_size.raw(fonts.font_size_2),
            margin_bottom.raw(sizes.size_4),
          ]),
        ],
        [html.text("Analysis not started. Click \"Analyze PR\" to begin.")],
      ),
    ],
  )
}

fn error_banner(message: String) -> Element(Msg) {
  html.div(
    [
      attribute.styles([
        padding.raw(sizes.size_3 <> " " <> sizes.size_4),
        margin_bottom.raw(sizes.size_4),
        background.raw(colors.red_1),
        border.raw("1px solid " <> colors.red_4),
        border_radius.raw(borders.radius_2),
        color.raw(colors.red_10),
        font_size.raw(fonts.font_size_0),
        white_space.pre_wrap,
        word_break.break_word,
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
        text_align.center,
        padding.raw(sizes.size_10 <> " " <> sizes.size_7),
        background.raw(colors.gray_1),
        border_radius.raw(borders.radius_3),
        border.raw("1px solid " <> colors.gray_2),
      ]),
    ],
    [
      html.div(
        [
          attribute.styles([
            display.inline_block,
            width.raw(sizes.size_7),
            #("height", sizes.size_7),
            border.raw("3px solid " <> colors.gray_2),
            #("border-top-color", colors.indigo_7),
            border_radius.raw("50%"),
            animation.raw("spin 0.8s linear infinite"),
            margin_bottom.raw(sizes.size_4),
          ]),
        ],
        [],
      ),
      html.p(
        [
          attribute.styles([
            color.raw(colors.gray_6),
            font_size.raw(fonts.font_size_1),
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
          model.commenting,
          model.comments,
          model.github_comments,
        )
      Error(_) ->
        html.p([], [html.text("No chunks available.")])
    },
    // B4. Bottom navigation
    bottom_navigation(current, chunk_count),
    // B5. Submit review section
    review_submission_section(model.review),
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
        background.raw("white"),
        border.raw("1px solid " <> colors.gray_3),
        border_radius.raw(borders.radius_3),
        padding.raw(sizes.size_5 <> " " <> sizes.size_6),
        margin_bottom.raw(sizes.size_5),
      ]),
    ],
    [
      html.h2(
        [
          attribute.styles([
            margin.raw("0 0 " <> sizes.size_3 <> " 0"),
            font_size.raw(fonts.font_size_1),
            font_weight.raw("600"),
            color.raw(colors.gray_8),
          ]),
        ],
        [html.text("AI Summary")],
      ),
      html.p(
        [
          attribute.styles([
            margin.raw("0 0 " <> sizes.size_4 <> " 0"),
            color.raw(colors.gray_7),
            line_height.raw(fonts.font_lineheight_4),
            font_size.raw(fonts.font_size_1),
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
        display.flex,
        align_items.center,
        gap.raw(sizes.size_3),
        flex_wrap.wrap,
      ]),
    ],
    [
      nav_button("Prev", PrevChunk, current > 0),
      html.span(
        [
          attribute.styles([
            font_size.raw(fonts.font_size_0),
            color.raw(colors.gray_6),
            font_weight.raw("500"),
            min_width.raw("6rem"),
            text_align.center,
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
            display.flex,
            gap.raw("0.375rem"),
            #("margin-left", sizes.size_2),
            flex_wrap.wrap,
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
    True -> colors.indigo_7
    False -> colors.gray_3
  }
  html.button(
    [
      event.on_click(GoToChunk(index)),
      attribute.styles([
        width.raw("1.25rem"),
        #("height", "1.25rem"),
        border_radius.raw("50%"),
        border.none,
        background.raw(bg),
        cursor.pointer,
        position.relative,
        padding.raw("0"),
        transition.raw("background 0.15s"),
      ]),
    ],
    case has_comments {
      True -> [
        html.span(
          [
            attribute.styles([
              position.absolute,
              #("top", "-2px"),
              #("right", "-2px"),
              width.raw("8px"),
              #("height", "8px"),
              border_radius.raw("50%"),
              background.raw(colors.yellow_6),
              border.raw("1.5px solid white"),
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
        padding.raw("0.375rem 0.875rem"),
        background.raw(case enabled {
          True -> colors.indigo_7
          False -> colors.gray_4
        }),
        color.raw(case enabled {
          True -> "white"
          False -> colors.gray_5
        }),
        border.none,
        border_radius.raw(borders.radius_2),
        cursor.raw(case enabled {
          True -> "pointer"
          False -> "not-allowed"
        }),
        font_size.raw(fonts.font_size_00),
        font_weight.raw("500"),
        transition.raw("background 0.15s"),
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
  commenting: model.CommentingState,
  comments: List(LineComment),
  github_comments: List(PrComment),
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
        background.raw("white"),
        border.raw("1px solid " <> colors.gray_3),
        border_radius.raw(borders.radius_3),
        margin_bottom.raw(sizes.size_5),
        overflow.hidden,
      ]),
    ],
    [
      // Chunk header
      html.div(
        [
          attribute.styles([
            padding.raw(sizes.size_4 <> " " <> sizes.size_6),
            border_bottom.raw("1px solid " <> colors.gray_3),
          ]),
        ],
        [
          html.h3(
            [
              attribute.styles([
                margin.raw("0 0 0.375rem 0"),
                font_size.raw(fonts.font_size_2),
                font_weight.raw("600"),
                color.raw(colors.gray_9),
              ]),
            ],
            [html.text(chunk.title)],
          ),
          html.div(
            [
              attribute.styles([
                background.raw(colors.blue_1),
                border.raw("1px solid " <> colors.blue_3),
                border_radius.raw(borders.radius_2),
                padding.raw(sizes.size_3 <> " " <> sizes.size_4),
                margin_top.raw(sizes.size_2),
                font_size.raw(fonts.font_size_0),
                line_height.raw("1.5"),
                color.raw(colors.gray_8),
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
            padding.raw("0.625rem " <> sizes.size_6),
            background.raw(colors.gray_1),
            border_bottom.raw("1px solid " <> colors.gray_3),
            #("font-family", fonts.font_mono),
            font_size.raw(fonts.font_size_00),
            color.raw(colors.gray_6),
            display.flex,
            align_items.center,
            gap.raw(sizes.size_2),
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
                color.raw(colors.gray_5),
                text_decoration.none,
                font_size.raw(fonts.font_size_0),
                display.inline_flex,
                align_items.center,
                line_height.raw("1"),
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
        commenting,
        chunk_comments,
        chunk_github_comments,
      ),
    ],
  )
}

// ---------------------------------------------------------------------------
// Diff rendering
// ---------------------------------------------------------------------------

fn diff_view(
  chunk: ReviewChunk,
  commenting: model.CommentingState,
  chunk_comments: List(LineComment),
  chunk_github_comments: List(PrComment),
) -> Element(Msg) {
  let lines = string.split(chunk.diff_content, "\n")
  // Parse actual file line numbers from hunk headers
  let file_indexed_lines = index_with_file_lines(lines)
  // Detect language once per chunk from the file path
  let language = highlight.detect_language(chunk.file_path)

  // Extract commenting state for this view
  let commenting_display_line = case commenting {
    Commenting(dl, _, _) -> option.Some(dl)
    PostingComment(dl, _, _) -> option.Some(dl)
    NotCommenting -> option.None
  }
  let comment_text = case commenting {
    Commenting(_, _, text) -> text
    PostingComment(_, _, text) -> text
    NotCommenting -> ""
  }
  let is_posting = case commenting {
    PostingComment(_, _, _) -> True
    Commenting(_, _, _) -> False
    NotCommenting -> False
  }

  html.div(
    [
      attribute.styles([
        #("overflow-x", "auto"),
        #("font-family", fonts.font_mono),
        font_size.raw(fonts.font_size_00),
        line_height.raw("1.5"),
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
          commenting_display_line == option.Some(entry.display_line)

        list.flatten([
          [diff_line_row(entry.display_line, entry.file_line, entry.text, language)],
          list.map(line_github_comments, fn(c) { github_comment_display(c) }),
          list.map(line_comments, fn(c) { comment_display(c) }),
          case is_commenting {
            True -> [comment_input(comment_text, is_posting)]
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
              // Removed line -- doesn't increment new file line number
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
              // Added line or context line -- increments new file line number
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
  language: String,
) -> Element(Msg) {
  let #(bg, border_color) = line_colors(line)
  // Show file line number in gutter (0 for hunk headers)
  let gutter_text = case file_line {
    0 -> ""
    n -> int.to_string(n)
  }

  // Split diff marker from code content for highlighting
  let #(marker, code) = case string.starts_with(line, "@@") {
    True -> #("", "")
    False ->
      case string.first(line) {
        Ok("+") -> #("+", string.drop_start(line, 1))
        Ok("-") -> #("-", string.drop_start(line, 1))
        Ok(" ") -> #(" ", string.drop_start(line, 1))
        _ -> #("", line)
      }
  }

  // For hunk headers, render as plain text; otherwise highlight
  let is_hunk_header = string.starts_with(line, "@@")

  html.div(
    [
      event.on_click(StartComment(display_line, file_line)),
      attribute.styles([
        display.flex,
        background.raw(bg),
        border_left.raw("3px solid " <> border_color),
        cursor.pointer,
        transition.raw("filter 0.1s"),
      ]),
    ],
    [
      // Line number gutter -- shows actual file line number
      html.span(
        [
          attribute.styles([
            display.inline_block,
            min_width.raw("3.5rem"),
            padding.raw("0 " <> sizes.size_2),
            text_align.right,
            color.raw(colors.gray_5),
            user_select.none,
            background.raw(case bg {
              "transparent" -> colors.gray_1
              _ -> "rgba(0,0,0,0.03)"
            }),
            #("border-right", "1px solid " <> colors.gray_3),
            flex_shrink.raw("0"),
          ]),
        ],
        [html.text(gutter_text)],
      ),
      // Line content
      case is_hunk_header {
        True ->
          html.span(
            [
              attribute.styles([
                padding.raw("0 " <> sizes.size_3),
                white_space.pre,
                flex.raw("1"),
              ]),
            ],
            [html.text(line)],
          )
        False -> {
          let highlighted_html = highlight.highlight_line(code, language)
          html.span(
            [
              attribute.styles([
                padding.raw("0 " <> sizes.size_3),
                white_space.pre,
                flex.raw("1"),
                display.flex,
              ]),
            ],
            [
              html.span([], [html.text(marker)]),
              element.unsafe_raw_html("", "span", [], highlighted_html),
            ],
          )
        }
      },
    ],
  )
}

fn line_colors(line: String) -> #(String, String) {
  // These are domain-specific diff colors; keeping hardcoded hex values
  // as they need to be specific semantic colors for diffs
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
        background.raw(colors.yellow_1),
        border_left.raw("3px solid " <> colors.yellow_6),
        padding.raw(sizes.size_2 <> " " <> sizes.size_3 <> " " <> sizes.size_2 <> " 4.25rem"),
        #("font-family", fonts.font_system_ui),
        font_size.raw(fonts.font_size_00),
        color.raw(colors.orange_9),
        line_height.raw("1.4"),
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
        padding.raw(sizes.size_3 <> " " <> sizes.size_3 <> " " <> sizes.size_3 <> " 4.25rem"),
        background.raw(colors.yellow_0),
        border_left.raw("3px solid " <> colors.yellow_5),
        display.flex,
        gap.raw(sizes.size_2),
        align_items.flex_start,
      ]),
    ],
    [
      html.textarea(
        [
          attribute.styles([
            flex.raw("1"),
            min_height.raw("3rem"),
            padding.raw(sizes.size_2),
            border.raw("1px solid " <> colors.gray_4),
            border_radius.raw(borders.radius_2),
            #("font-family", fonts.font_system_ui),
            font_size.raw(fonts.font_size_00),
            resize.vertical,
            outline.none,
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
            display.flex,
            flex_direction.column,
            gap.raw("0.375rem"),
          ]),
        ],
        [
          html.button(
            [
              event.on_click(SubmitComment),
              attribute.disabled(posting_comment),
              attribute.styles([
                padding.raw("0.375rem " <> sizes.size_3),
                background.raw(case posting_comment {
                  True -> colors.gray_5
                  False -> colors.indigo_7
                }),
                color.raw("white"),
                border.none,
                border_radius.raw(borders.radius_2),
                cursor.raw(case posting_comment {
                  True -> "not-allowed"
                  False -> "pointer"
                }),
                font_size.raw(fonts.font_size_00),
                font_weight.raw("500"),
              ]),
            ],
            [html.text(button_text)],
          ),
          html.button(
            [
              event.on_click(CancelComment),
              attribute.styles([
                padding.raw("0.375rem " <> sizes.size_3),
                background.raw(colors.gray_3),
                color.raw(colors.gray_8),
                border.none,
                border_radius.raw(borders.radius_2),
                cursor.pointer,
                font_size.raw(fonts.font_size_00),
                font_weight.raw("500"),
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
        background.raw(colors.blue_2),
        border_left.raw("3px solid " <> colors.blue_6),
        padding.raw(sizes.size_2 <> " " <> sizes.size_3 <> " " <> sizes.size_2 <> " 4.25rem"),
        #("font-family", fonts.font_system_ui),
        font_size.raw(fonts.font_size_00),
        color.raw(colors.blue_9),
        line_height.raw("1.4"),
      ]),
    ],
    [
      html.div(
        [
          attribute.styles([
            display.flex,
            justify_content.space_between,
            margin_bottom.raw("0.25rem"),
            font_size.raw(fonts.font_size_00),
            color.raw(colors.gray_6),
          ]),
        ],
        [
          html.span(
            [attribute.styles([font_weight.raw("600")])],
            [html.text(comment.author)],
          ),
          html.span([], [html.text(comment.created_at)]),
        ],
      ),
      html.div(
        [],
        markdown.render(comment.body),
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
            background.raw("white"),
            border.raw("1px solid " <> colors.gray_3),
            border_radius.raw(borders.radius_3),
            padding.raw(sizes.size_5 <> " " <> sizes.size_6),
            margin_top.raw(sizes.size_5),
          ]),
        ],
        [
          html.h2(
            [
              attribute.styles([
                margin.raw("0 0 " <> sizes.size_3 <> " 0"),
                font_size.raw(fonts.font_size_1),
                font_weight.raw("600"),
                color.raw(colors.gray_8),
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
                    background.raw(colors.blue_2),
                    border_left.raw("3px solid " <> colors.blue_6),
                    padding.raw(sizes.size_3 <> " " <> sizes.size_4),
                    margin_bottom.raw(sizes.size_2),
                    #("border-radius", "0 " <> borders.radius_2 <> " " <> borders.radius_2 <> " 0"),
                    font_size.raw(fonts.font_size_0),
                    color.raw(colors.blue_9),
                    line_height.raw("1.5"),
                  ]),
                ],
                [
                  html.div(
                    [
                      attribute.styles([
                        display.flex,
                        justify_content.space_between,
                        margin_bottom.raw("0.375rem"),
                        font_size.raw(fonts.font_size_00),
                        color.raw(colors.gray_6),
                      ]),
                    ],
                    [
                      html.span(
                        [attribute.styles([font_weight.raw("600")])],
                        [html.text(comment.author)],
                      ),
                      html.span([], [html.text(comment.created_at)]),
                    ],
                  ),
                  html.div(
                    [],
                    markdown.render(comment.body),
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
        display.flex,
        justify_content.center,
        align_items.center,
        gap.raw(sizes.size_4),
        padding.raw(sizes.size_4 <> " 0"),
      ]),
    ],
    [
      nav_button("Previous Chunk", PrevChunk, current > 0),
      html.span(
        [
          attribute.styles([
            font_size.raw(fonts.font_size_0),
            color.raw(colors.gray_6),
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
  review: model.ReviewState,
) -> Element(Msg) {
  let review_body = case review {
    ReviewIdle(body) -> body
    SubmittingReview(body) -> body
  }
  let submitting = case review {
    SubmittingReview(_) -> True
    ReviewIdle(_) -> False
  }
  html.div(
    [
      attribute.styles([
        background.raw("white"),
        border.raw("1px solid " <> colors.gray_3),
        border_radius.raw(borders.radius_3),
        padding.raw(sizes.size_5 <> " " <> sizes.size_6),
        margin_top.raw(sizes.size_5),
      ]),
    ],
    [
      html.h2(
        [
          attribute.styles([
            margin.raw("0 0 " <> sizes.size_3 <> " 0"),
            font_size.raw(fonts.font_size_1),
            font_weight.raw("600"),
            color.raw(colors.gray_8),
          ]),
        ],
        [html.text("Submit Review")],
      ),
      html.textarea(
        [
          attribute.styles([
            width.raw("100%"),
            min_height.raw("4rem"),
            padding.raw("0.625rem"),
            border.raw("1px solid " <> colors.gray_4),
            border_radius.raw(borders.radius_2),
            #("font-family", fonts.font_system_ui),
            font_size.raw(fonts.font_size_0),
            resize.vertical,
            outline.none,
            box_sizing.border_box,
            margin_bottom.raw(sizes.size_3),
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
            display.flex,
            gap.raw(sizes.size_2),
            flex_wrap.wrap,
          ]),
        ],
        [
          review_action_button(
            "Approve",
            "APPROVE",
            colors.green_7,
            colors.green_8,
            submitting,
          ),
          review_action_button(
            "Request Changes",
            "REQUEST_CHANGES",
            colors.orange_7,
            colors.orange_8,
            submitting,
          ),
          review_action_button(
            "Comment",
            "COMMENT",
            colors.indigo_7,
            colors.indigo_8,
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
        padding.raw(sizes.size_2 <> " " <> sizes.size_5),
        background.raw(case submitting {
          True -> colors.gray_5
          False -> bg_color
        }),
        color.raw("white"),
        border.none,
        border_radius.raw(borders.radius_2),
        cursor.raw(case submitting {
          True -> "not-allowed"
          False -> "pointer"
        }),
        font_size.raw(fonts.font_size_0),
        font_weight.raw("500"),
        transition.raw("background 0.15s"),
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
