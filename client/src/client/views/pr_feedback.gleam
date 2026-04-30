import client/highlight
import client/markdown
import client/model.{
  type Model, type Msg, BackToDashboard, ExpandFeedbackDown, ExpandFeedbackUp,
  NextFeedback, PrevFeedback, SelectFeedbackComment, ShowWholeFile,
  SwitchToAnalysis, feedback_default_radius,
}
import gleam/int
import gleam/list
import gleam/option
import gleam/order
import gleam/string
import lustre/attribute
import lustre/element.{type Element}
import lustre/element/html
import lustre/event
import shared/pr.{type PrComment, type PrDetail, type PullRequest}
import smalto/grammar as smalto_grammar

import monks/align_items
import monks/background
import monks/border
import monks/border_bottom
import monks/border_left
import monks/border_radius
import monks/border_top
import monks/color
import monks/cursor
import monks/display
import monks/flex
import monks/flex_direction
import monks/flex_shrink
import monks/font_size
import monks/font_weight
import monks/gap
import monks/height
import monks/justify_content
import monks/letter_spacing
import monks/line_height
import monks/margin
import monks/margin_bottom
import monks/margin_top
import monks/max_width
import monks/min_width
import monks/overflow
import monks/padding
import monks/text_align
import monks/text_decoration
import monks/text_transform
import monks/white_space
import monks/width
import monks/word_break

import open_props/borders
import open_props/colors
import open_props/fonts
import open_props/sizes

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

pub fn view(model: Model) -> Element(Msg) {
  case model.selected_pr {
    option.None ->
      html.div(
        [
          attribute.styles([
            padding.raw(sizes.size_7),
            #("font-family", fonts.font_system_ui),
            color.raw(colors.gray_7),
          ]),
        ],
        [
          html.text(case model.loading {
            True -> "Loading..."
            False -> "No PR selected."
          }),
        ],
      )
    option.Some(detail) -> layout(model, detail)
  }
}

/// Returns top-level comment IDs in the order they appear in the list pane.
pub fn thread_ids(comments: List(PrComment)) -> List(Int) {
  comments
  |> top_level
  |> sort_for_list
  |> list.map(fn(c) { c.id })
}

// ---------------------------------------------------------------------------
// Layout
// ---------------------------------------------------------------------------

fn layout(model: Model, detail: PrDetail) -> Element(Msg) {
  let top_levels = top_level(model.github_comments) |> sort_for_list
  let total = list.length(top_levels)
  let selected_id = model.feedback.selected_comment_id
  let bot_with_human_reply_ids =
    list.filter_map(top_levels, fn(c) {
      case
        !c.is_human
        && list.any(model.github_comments, fn(r) {
          r.in_reply_to_id == c.id && r.is_human
        })
      {
        True -> Ok(c.id)
        False -> Error(Nil)
      }
    })
  let selected =
    case selected_id {
      option.Some(id) ->
        list.find(top_levels, fn(c) { c.id == id })
        |> option_from_result
      option.None -> list.first(top_levels) |> option_from_result
    }
  let selected_index = case selected {
    option.Some(c) -> index_of(top_levels, c.id)
    option.None -> 0
  }
  html.div(
    [
      attribute.styles([
        #("font-family", fonts.font_system_ui),
        color.raw(colors.indigo_12),
        display.flex,
        flex_direction.column,
        height.raw("100vh"),
      ]),
    ],
    [
      header(detail, total, find_pull_request(model, detail.number)),
      html.div(
        [
          attribute.styles([
            display.flex,
            flex.raw("1"),
            min_width.raw("0"),
            overflow.hidden,
          ]),
        ],
        [
          left_pane(top_levels, selected_id, bot_with_human_reply_ids),
          right_pane(model, detail, selected, selected_index, total),
        ],
      ),
    ],
  )
}

fn option_from_result(r: Result(a, b)) -> option.Option(a) {
  case r {
    Ok(v) -> option.Some(v)
    Error(_) -> option.None
  }
}

fn index_of(comments: List(PrComment), id: Int) -> Int {
  let #(_, idx) =
    list.fold(comments, #(0, 0), fn(acc, c) {
      let #(i, found) = acc
      case c.id == id {
        True -> #(i + 1, i)
        False -> #(i + 1, found)
      }
    })
  idx
}

// ---------------------------------------------------------------------------
// Header
// ---------------------------------------------------------------------------

fn find_pull_request(
  model: Model,
  number: Int,
) -> option.Option(PullRequest) {
  case model.pr_groups {
    option.None -> option.None
    option.Some(groups) -> {
      let all =
        list.flatten([
          groups.created_by_me,
          groups.review_requested,
          groups.all_open,
        ])
      case list.find(all, fn(p) { p.number == number }) {
        Ok(p) -> option.Some(p)
        Error(_) -> option.None
      }
    }
  }
}

fn header(
  detail: PrDetail,
  total: Int,
  pull: option.Option(PullRequest),
) -> Element(Msg) {
  html.div(
    [
      attribute.styles([
        display.flex,
        align_items.center,
        gap.raw(sizes.size_3),
        padding.raw(sizes.size_3 <> " " <> sizes.size_5),
        border_bottom.raw("1px solid " <> colors.gray_3),
        background.raw("white"),
        flex_shrink.raw("0"),
      ]),
    ],
    [
      html.a(
        [
          event.on_click(BackToDashboard),
          attribute.styles([
            color.raw(colors.gray_6),
            text_decoration.none,
            cursor.pointer,
            font_size.raw(fonts.font_size_1),
          ]),
        ],
        [html.text("← Dashboard")],
      ),
      html.div(
        [
          attribute.styles([
            flex.raw("1"),
            min_width.raw("0"),
            display.flex,
            align_items.center,
            gap.raw(sizes.size_2),
            overflow.hidden,
          ]),
        ],
        [
          html.span(
            [
              attribute.styles([
                color.raw(colors.gray_6),
                font_weight.raw("400"),
              ]),
            ],
            [html.text("#" <> int.to_string(detail.number))],
          ),
          html.span(
            [
              attribute.styles([
                font_weight.raw("600"),
                overflow.hidden,
                white_space.nowrap,
                #("text-overflow", "ellipsis"),
              ]),
            ],
            [html.text(detail.title)],
          ),
          html.span(
            [
              attribute.styles([
                color.raw(colors.gray_6),
                font_size.raw(fonts.font_size_0),
              ]),
            ],
            [html.text("· " <> detail.author)],
          ),
          case pull {
            option.Some(p) -> review_badge(p.review_decision, p.draft)
            option.None -> html.text("")
          },
        ],
      ),
      html.a(
        [
          attribute.href(detail.url),
          attribute.target("_blank"),
          attribute.styles([
            color.raw(colors.indigo_7),
            text_decoration.none,
            font_size.raw(fonts.font_size_0),
          ]),
        ],
        [html.text("Open on GitHub ↗")],
      ),
      html.a(
        [
          event.on_click(SwitchToAnalysis),
          attribute.styles([
            color.raw(colors.indigo_7),
            text_decoration.none,
            cursor.pointer,
            font_size.raw(fonts.font_size_0),
          ]),
        ],
        [html.text("Switch to review analysis")],
      ),
      html.span(
        [
          attribute.styles([
            color.raw(colors.gray_6),
            font_size.raw(fonts.font_size_0),
          ]),
        ],
        [
          html.text(int.to_string(total) <> case total {
            1 -> " comment"
            _ -> " comments"
          }),
        ],
      ),
    ],
  )
}

fn review_badge(decision: String, draft: Bool) -> Element(Msg) {
  let #(bg, fg, label) = case draft, decision {
    True, _ -> #(colors.blue_2, colors.blue_9, "Draft")
    _, "APPROVED" -> #(colors.green_2, colors.green_10, "Approved")
    _, "CHANGES_REQUESTED" -> #(colors.red_2, colors.red_10, "Changes requested")
    _, "REVIEW_REQUIRED" -> #(colors.yellow_2, colors.yellow_10, "Review required")
    _, "" -> #(colors.gray_1, colors.gray_6, "No reviews")
    _, other -> #(colors.gray_2, colors.gray_8, other)
  }
  html.span(
    [
      attribute.styles([
        padding.raw("0.15rem " <> sizes.size_2),
        border_radius.raw(borders.radius_2),
        font_size.raw(fonts.font_size_0),
        white_space.nowrap,
        background.raw(bg),
        color.raw(fg),
      ]),
    ],
    [html.text(label)],
  )
}

// ---------------------------------------------------------------------------
// Left pane — thread list
// ---------------------------------------------------------------------------

fn left_pane(
  top_levels: List(PrComment),
  selected_id: option.Option(Int),
  human_reply_ids: List(Int),
) -> Element(Msg) {
  let groups = group_by_file(top_levels)
  html.div(
    [
      attribute.styles([
        width.raw("320px"),
        flex_shrink.raw("0"),
        border.raw("0"),
        #("border-right", "1px solid " <> colors.gray_3),
        background.raw(colors.gray_1),
        overflow.raw("auto"),
        #("height", "100%"),
      ]),
    ],
    case top_levels {
      [] -> [empty_list_message()]
      _ ->
        list.map(groups, fn(g) {
          file_group(g.0, g.1, selected_id, human_reply_ids)
        })
    },
  )
}

fn empty_list_message() -> Element(Msg) {
  html.div(
    [
      attribute.styles([
        padding.raw(sizes.size_5),
        color.raw(colors.gray_5),
        text_align.center,
        font_size.raw(fonts.font_size_0),
      ]),
    ],
    [html.text("No comments on this PR.")],
  )
}

fn file_group(
  path: String,
  comments: List(PrComment),
  selected_id: option.Option(Int),
  human_reply_ids: List(Int),
) -> Element(Msg) {
  let label = case path {
    "" -> "PR conversation"
    p -> p
  }
  html.div([], [
    html.div(
      [
        attribute.styles([
          padding.raw(sizes.size_2 <> " " <> sizes.size_3),
          color.raw(colors.gray_6),
          font_size.raw(fonts.font_size_0),
          text_transform.uppercase,
          letter_spacing.raw("0.5px"),
          #("border-top", "1px solid " <> colors.gray_3),
          background.raw(colors.gray_2),
          font_weight.raw("600"),
        ]),
      ],
      [html.text(label)],
    ),
    html.div(
      [],
      list.index_map(comments, fn(c, i) {
        thread_row(c, selected_id, list.contains(human_reply_ids, c.id), i)
      }),
    ),
  ])
}

fn thread_row(
  comment: PrComment,
  selected_id: option.Option(Int),
  has_human_reply: Bool,
  index: Int,
) -> Element(Msg) {
  let is_selected = selected_id == option.Some(comment.id)
  // Selection wins for the left edge; humans get an indigo accent; bot
  // comments with a human reply pick up an orange accent so they stand out
  // from purely-bot threads.
  let border_color = case is_selected, comment.is_human, has_human_reply {
    True, _, _ -> colors.indigo_6
    False, True, _ -> colors.indigo_3
    False, False, True -> colors.orange_6
    False, False, False -> "transparent"
  }
  // Default rows alternate white/gray-1 so adjacent threads don't bleed
  // together visually. Status colors (selected, resolved, bot+human-reply)
  // take precedence so they remain distinguishable on either zebra row.
  let zebra_bg = case int.is_even(index) {
    True -> "white"
    False -> colors.gray_1
  }
  // Resolved rows tint pale green to match the "✓ resolved" badge — the
  // previous gray_2 blended with file-group headers and zebra rows.
  let bg = case is_selected, comment.is_resolved, has_human_reply {
    True, _, _ -> colors.indigo_1
    False, True, _ -> colors.green_1
    False, False, True -> colors.orange_1
    False, False, False -> zebra_bg
  }
  let row_opacity = case comment.is_resolved && !is_selected {
    True -> "0.6"
    False -> "1"
  }
  let preview =
    comment.body
    |> string.replace("\n", " ")
    |> string.slice(0, 120)
  let preview_color = case is_selected {
    True -> colors.indigo_12
    False -> colors.gray_8
  }
  let preview_decoration = case comment.is_resolved {
    True -> "line-through"
    False -> "none"
  }
  let author_color = case comment.is_human {
    True -> colors.indigo_10
    False -> colors.gray_6
  }
  let author_weight = case comment.is_human {
    True -> "600"
    False -> "400"
  }
  html.div(
    [
      event.on_click(SelectFeedbackComment(comment.id)),
      attribute.styles([
        padding.raw(sizes.size_2 <> " " <> sizes.size_3),
        border_left.raw("3px solid " <> border_color),
        background.raw(bg),
        cursor.pointer,
        #("border-bottom", "1px solid " <> colors.gray_2),
        #("opacity", row_opacity),
      ]),
    ],
    [
      html.div(
        [
          attribute.styles([
            display.flex,
            align_items.center,
            gap.raw(sizes.size_2),
            font_size.raw(fonts.font_size_0),
          ]),
        ],
        [
          html.span(
            [
              attribute.styles([
                color.raw(author_color),
                font_weight.raw(author_weight),
              ]),
            ],
            [html.text(comment.author)],
          ),
          html.span(
            [attribute.styles([color.raw(colors.gray_5)])],
            [
              html.text(case comment.path {
                "" -> "· PR"
                _ -> "· line " <> int.to_string(comment.line)
              }),
            ],
          ),
          case comment.is_resolved {
            True -> resolved_badge()
            False -> html.text("")
          },
        ],
      ),
      html.div(
        [
          attribute.styles([
            font_size.raw(fonts.font_size_0),
            color.raw(preview_color),
            margin_top.raw("0.15rem"),
            line_height.raw("1.4"),
            word_break.break_word,
            text_decoration.raw(preview_decoration),
          ]),
        ],
        [html.text(preview)],
      ),
    ],
  )
}

fn resolved_badge() -> Element(Msg) {
  html.span(
    [
      attribute.styles([
        padding.raw("0 " <> sizes.size_1),
        border_radius.raw(borders.radius_2),
        background.raw(colors.green_2),
        color.raw(colors.green_10),
        font_size.raw(fonts.font_size_0),
        font_weight.raw("600"),
        white_space.nowrap,
      ]),
    ],
    [html.text("✓ resolved")],
  )
}

// ---------------------------------------------------------------------------
// Right pane — code + thread
// ---------------------------------------------------------------------------

fn right_pane(
  model: Model,
  detail: PrDetail,
  selected: option.Option(PrComment),
  selected_index: Int,
  total: Int,
) -> Element(Msg) {
  html.div(
    [
      attribute.styles([
        flex.raw("1"),
        min_width.raw("0"),
        display.flex,
        flex_direction.column,
        background.raw("white"),
      ]),
    ],
    [
      case selected {
        option.None -> empty_right()
        option.Some(comment) -> {
          let all =
            model.github_comments
            |> list.sort(fn(a, b) { string.compare(a.created_at, b.created_at) })
          let replies =
            list.filter(all, fn(c) { c.in_reply_to_id == comment.id })
          thread_content(detail, comment, replies, model)
        }
      },
      footer(selected_index, total),
    ],
  )
}

fn empty_right() -> Element(Msg) {
  html.div(
    [
      attribute.styles([
        flex.raw("1"),
        display.flex,
        align_items.center,
        justify_content.center,
        color.raw(colors.gray_5),
      ]),
    ],
    [html.text("Select a comment from the list.")],
  )
}

fn thread_content(
  detail: PrDetail,
  comment: PrComment,
  replies: List(PrComment),
  model: Model,
) -> Element(Msg) {
  html.div(
    [
      attribute.styles([
        flex.raw("1"),
        min_width.raw("0"),
        display.flex,
        flex_direction.column,
        overflow.raw("auto"),
      ]),
    ],
    [
      right_header(detail, comment),
      case comment.path {
        "" ->
          html.div(
            [attribute.styles([padding.raw(sizes.size_4 <> " " <> sizes.size_5)])],
            [
              html.div(
                [
                  attribute.styles([
                    color.raw(colors.gray_6),
                    font_size.raw(fonts.font_size_0),
                  ]),
                ],
                [html.text("PR-level comment — no code context.")],
              ),
            ],
          )
        _ -> code_snippet(detail, comment, model)
      },
      thread_block(comment, replies),
    ],
  )
}

fn right_header(detail: PrDetail, comment: PrComment) -> Element(Msg) {
  let file_link = case comment.path {
    "" -> detail.url
    path ->
      detail.url
      <> "/files#diff-"
      <> path
  }
  html.div(
    [
      attribute.styles([
        display.flex,
        align_items.center,
        gap.raw(sizes.size_2),
        padding.raw(sizes.size_2 <> " " <> sizes.size_4),
        border_bottom.raw("1px solid " <> colors.gray_3),
        background.raw(colors.gray_1),
        flex_shrink.raw("0"),
      ]),
    ],
    [
      html.span(
        [
          attribute.styles([
            #("font-family", fonts.font_mono),
            font_size.raw(fonts.font_size_0),
            color.raw(colors.gray_8),
            overflow.hidden,
            #("text-overflow", "ellipsis"),
            white_space.nowrap,
          ]),
        ],
        [
          html.text(case comment.path {
            "" -> "PR conversation"
            p ->
              p
              <> " : "
              <> int.to_string(comment.line)
              <> " · "
              <> comment.author
          }),
        ],
      ),
      html.span([attribute.styles([flex.raw("1")])], []),
      html.a(
        [
          attribute.href(file_link),
          attribute.target("_blank"),
          attribute.styles([
            color.raw(colors.indigo_7),
            text_decoration.none,
            font_size.raw(fonts.font_size_0),
          ]),
        ],
        [html.text("Open on GitHub ↗")],
      ),
    ],
  )
}

// ---------------------------------------------------------------------------
// Code snippet
// ---------------------------------------------------------------------------

fn code_snippet(
  detail: PrDetail,
  comment: PrComment,
  model: Model,
) -> Element(Msg) {
  let file_lines = extract_file_lines(detail.diff, comment.path)
  let radius = feedback_default_radius
  let up = model.feedback.expand_up
  let down = model.feedback.expand_down
  let whole = model.feedback.whole_file
  let snippet = case whole {
    True -> file_lines
    False -> window_lines(file_lines, comment.line, radius + up, radius + down)
  }
  let grammar = highlight.detect_grammar(comment.path)

  html.div(
    [
      attribute.styles([
        padding.raw(sizes.size_3 <> " " <> sizes.size_4),
        border_bottom.raw("1px solid " <> colors.gray_3),
      ]),
    ],
    [
      snippet_controls(whole),
      html.div(
        [
          attribute.styles([
            border.raw("1px solid " <> colors.gray_3),
            border_radius.raw(borders.radius_2),
            background.raw(colors.gray_1),
            margin_top.raw(sizes.size_2),
            overflow.raw("auto"),
            max_width.raw("100%"),
            #("font-family", fonts.font_mono),
            font_size.raw(fonts.font_size_0),
            line_height.raw("1.5"),
          ]),
        ],
        case snippet {
          [] -> [placeholder_row()]
          lines -> list.map(lines, fn(l) { snippet_row(l, comment.line, grammar) })
        },
      ),
    ],
  )
}

fn snippet_controls(whole_file: Bool) -> Element(Msg) {
  html.div(
    [
      attribute.styles([
        display.flex,
        gap.raw(sizes.size_2),
        align_items.center,
      ]),
    ],
    [
      small_button("+15 ↑", ExpandFeedbackUp),
      small_button("+15 ↓", ExpandFeedbackDown),
      case whole_file {
        True ->
          html.span(
            [
              attribute.styles([
                color.raw(colors.gray_6),
                font_size.raw(fonts.font_size_0),
              ]),
            ],
            [html.text("whole file")],
          )
        False -> small_button("Whole file", ShowWholeFile)
      },
    ],
  )
}

fn small_button(label: String, msg: Msg) -> Element(Msg) {
  html.button(
    [
      event.on_click(msg),
      attribute.styles([
        padding.raw("0.15rem " <> sizes.size_2),
        background.raw("white"),
        color.raw(colors.gray_8),
        border.raw("1px solid " <> colors.gray_4),
        border_radius.raw(borders.radius_2),
        cursor.pointer,
        font_size.raw(fonts.font_size_0),
      ]),
    ],
    [html.text(label)],
  )
}

fn placeholder_row() -> Element(Msg) {
  html.div(
    [
      attribute.styles([
        padding.raw(sizes.size_3 <> " " <> sizes.size_4),
        color.raw(colors.gray_5),
        font_size.raw(fonts.font_size_0),
      ]),
    ],
    [html.text("(context beyond diff)")],
  )
}

fn snippet_row(
  line: SnippetLine,
  focus_line: Int,
  grammar: option.Option(smalto_grammar.Grammar),
) -> Element(Msg) {
  let is_focus = line.file_line == focus_line && line.marker != "-"
  let #(bg, border_color) = case is_focus, line.marker {
    True, _ -> #("#fef3c7", "#f59e0b")
    False, "+" -> #("#dcfce7", "#22c55e")
    False, "-" -> #("#fee2e2", "#ef4444")
    False, "@" -> #("#ede9fe", "#8b5cf6")
    False, _ -> #("transparent", "transparent")
  }
  let gutter_text = case line.file_line {
    0 -> ""
    n -> int.to_string(n)
  }
  let highlighted = case line.marker {
    "@" -> [html.text(line.text)]
    _ -> highlight.highlight_line(line.text, grammar)
  }
  html.div(
    [
      attribute.styles([
        display.flex,
        background.raw(bg),
        border_left.raw("3px solid " <> border_color),
      ]),
    ],
    [
      html.span(
        [
          attribute.styles([
            display.inline_block,
            min_width.raw("3.5rem"),
            padding.raw("0 " <> sizes.size_2),
            text_align.right,
            color.raw(colors.gray_5),
            flex_shrink.raw("0"),
            #("border-right", "1px solid " <> colors.gray_3),
            background.raw(case bg {
              "transparent" -> colors.gray_1
              _ -> "rgba(0,0,0,0.03)"
            }),
          ]),
        ],
        [html.text(gutter_text)],
      ),
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
          html.span([], [html.text(line.marker)]),
          html.span([], highlighted),
        ],
      ),
    ],
  )
}

// ---------------------------------------------------------------------------
// Thread block (comment + replies)
// ---------------------------------------------------------------------------

fn thread_block(
  comment: PrComment,
  replies: List(PrComment),
) -> Element(Msg) {
  html.div(
    [
      attribute.styles([
        padding.raw(sizes.size_3 <> " " <> sizes.size_4),
        display.flex,
        flex_direction.column,
        gap.raw(sizes.size_3),
      ]),
    ],
    list.flatten([
      [comment_bubble(comment, False)],
      list.map(replies, fn(r) { comment_bubble(r, True) }),
    ]),
  )
}

fn comment_bubble(comment: PrComment, is_reply: Bool) -> Element(Msg) {
  html.div(
    [
      attribute.styles([
        border.raw("1px solid " <> colors.gray_3),
        background.raw(case is_reply {
          True -> colors.gray_1
          False -> "white"
        }),
        border_radius.raw(borders.radius_2),
        padding.raw(sizes.size_3 <> " " <> sizes.size_4),
        margin.raw(case is_reply {
          True -> "0 0 0 " <> sizes.size_5
          False -> "0"
        }),
      ]),
    ],
    [
      html.div(
        [
          attribute.styles([
            display.flex,
            align_items.center,
            gap.raw(sizes.size_2),
            margin_bottom.raw(sizes.size_2),
          ]),
        ],
        [
          html.span(
            [attribute.styles([font_weight.raw("600")])],
            [html.text(comment.author)],
          ),
          html.span(
            [
              attribute.styles([
                color.raw(colors.gray_6),
                font_size.raw(fonts.font_size_0),
              ]),
            ],
            [html.text(comment.created_at)],
          ),
        ],
      ),
      html.div(
        [
          attribute.styles([
            font_size.raw(fonts.font_size_1),
            line_height.raw(fonts.font_lineheight_4),
            word_break.break_word,
          ]),
        ],
        markdown.render(comment.body),
      ),
    ],
  )
}

// ---------------------------------------------------------------------------
// Footer
// ---------------------------------------------------------------------------

fn footer(selected_index: Int, total: Int) -> Element(Msg) {
  html.div(
    [
      attribute.styles([
        display.flex,
        align_items.center,
        gap.raw(sizes.size_3),
        padding.raw(sizes.size_2 <> " " <> sizes.size_4),
        border_top.raw("1px solid " <> colors.gray_3),
        background.raw(colors.gray_1),
        flex_shrink.raw("0"),
        font_size.raw(fonts.font_size_0),
        color.raw(colors.gray_7),
      ]),
    ],
    [
      nav_link("← prev", PrevFeedback, selected_index > 0),
      nav_link("next →", NextFeedback, selected_index < total - 1),
      html.span([attribute.styles([flex.raw("1")])], []),
      html.text(case total {
        0 -> "0 of 0"
        _ -> int.to_string(selected_index + 1) <> " of " <> int.to_string(total)
      }),
    ],
  )
}

fn nav_link(label: String, msg: Msg, enabled: Bool) -> Element(Msg) {
  html.button(
    [
      event.on_click(msg),
      attribute.disabled(!enabled),
      attribute.styles([
        padding.raw("0.15rem " <> sizes.size_2),
        background.raw("white"),
        color.raw(case enabled {
          True -> colors.indigo_7
          False -> colors.gray_5
        }),
        border.raw("1px solid " <> colors.gray_4),
        border_radius.raw(borders.radius_2),
        cursor.raw(case enabled {
          True -> "pointer"
          False -> "not-allowed"
        }),
        font_size.raw(fonts.font_size_0),
      ]),
    ],
    [html.text(label)],
  )
}

// ---------------------------------------------------------------------------
// Comment threading / sorting
// ---------------------------------------------------------------------------

fn top_level(comments: List(PrComment)) -> List(PrComment) {
  let ids =
    comments
    |> list.map(fn(c) { c.id })
  list.filter(comments, fn(c) {
    c.in_reply_to_id == 0
    || !list.any(ids, fn(id) { id == c.in_reply_to_id })
  })
}

fn sort_for_list(comments: List(PrComment)) -> List(PrComment) {
  list.sort(comments, compare_for_list)
}

fn compare_for_list(a: PrComment, b: PrComment) -> order.Order {
  case a.path, b.path {
    "", "" -> string.compare(a.created_at, b.created_at)
    "", _ -> order.Gt
    _, "" -> order.Lt
    pa, pb ->
      case string.compare(pa, pb) {
        order.Eq ->
          case int.compare(a.line, b.line) {
            order.Eq -> string.compare(a.created_at, b.created_at)
            other -> other
          }
        other -> other
      }
  }
}

fn group_by_file(
  top_levels: List(PrComment),
) -> List(#(String, List(PrComment))) {
  list.fold(top_levels, [], fn(acc, c) { append_group(acc, c) })
  |> list.reverse
  |> list.map(fn(g) { #(g.0, list.reverse(g.1)) })
}

fn append_group(
  acc: List(#(String, List(PrComment))),
  c: PrComment,
) -> List(#(String, List(PrComment))) {
  case acc {
    [] -> [#(c.path, [c])]
    [#(path, list), ..rest] if path == c.path -> [#(path, [c, ..list]), ..rest]
    groups -> [#(c.path, [c]), ..groups]
  }
}

// ---------------------------------------------------------------------------
// Diff parsing
// ---------------------------------------------------------------------------

type SnippetLine {
  SnippetLine(file_line: Int, marker: String, text: String)
}

/// Parse the diff blob and return the snippet lines for `file_path`.
fn extract_file_lines(diff: String, file_path: String) -> List(SnippetLine) {
  case file_path {
    "" -> []
    _ -> {
      let lines = string.split(diff, "\n")
      parse_diff(lines, "", 0, False, [])
      |> list.reverse
      |> list.filter(fn(entry) { entry.0 == file_path })
      |> list.flat_map(fn(entry) { entry.1 })
    }
  }
}

fn parse_diff(
  lines: List(String),
  current_path: String,
  counter: Int,
  in_hunk: Bool,
  acc: List(#(String, List(SnippetLine))),
) -> List(#(String, List(SnippetLine))) {
  case lines {
    [] -> acc
    [line, ..rest] -> {
      case classify_line(line) {
        DiffHeader -> parse_diff(rest, "", 0, False, acc)
        NewFileMarker(path) -> parse_diff(rest, path, 0, False, acc)
        HunkHeader(new_start) -> {
          let acc2 = append_snippet(acc, current_path, SnippetLine(0, "@", line))
          parse_diff(rest, current_path, new_start, True, acc2)
        }
        ContextLine(text) if in_hunk -> {
          let acc2 =
            append_snippet(acc, current_path, SnippetLine(counter, " ", text))
          parse_diff(rest, current_path, counter + 1, True, acc2)
        }
        AddedLine(text) if in_hunk -> {
          let acc2 =
            append_snippet(acc, current_path, SnippetLine(counter, "+", text))
          parse_diff(rest, current_path, counter + 1, True, acc2)
        }
        DeletedLine(text) if in_hunk -> {
          let acc2 =
            append_snippet(acc, current_path, SnippetLine(counter, "-", text))
          parse_diff(rest, current_path, counter, True, acc2)
        }
        _ -> parse_diff(rest, current_path, counter, in_hunk, acc)
      }
    }
  }
}

fn append_snippet(
  acc: List(#(String, List(SnippetLine))),
  path: String,
  entry: SnippetLine,
) -> List(#(String, List(SnippetLine))) {
  case path {
    "" -> acc
    _ ->
      case acc {
        [#(p, lines), ..rest] if p == path -> [#(p, [entry, ..lines]), ..rest]
        groups -> [#(path, [entry]), ..groups]
      }
  }
}

type LineKind {
  DiffHeader
  NewFileMarker(path: String)
  HunkHeader(new_start: Int)
  ContextLine(text: String)
  AddedLine(text: String)
  DeletedLine(text: String)
  Other
}

fn classify_line(line: String) -> LineKind {
  case string.starts_with(line, "diff --git ") {
    True -> DiffHeader
    False ->
      case string.starts_with(line, "+++ b/") {
        True -> NewFileMarker(string.drop_start(line, 6))
        False ->
          case string.starts_with(line, "+++ ") {
            True -> NewFileMarker(string.drop_start(line, 4))
            False ->
              case string.starts_with(line, "--- ") {
                True -> Other
                False ->
                  case string.starts_with(line, "@@") {
                    True -> HunkHeader(parse_hunk_new_start(line))
                    False ->
                      case string.first(line) {
                        Ok("+") -> AddedLine(string.drop_start(line, 1))
                        Ok("-") -> DeletedLine(string.drop_start(line, 1))
                        Ok(" ") -> ContextLine(string.drop_start(line, 1))
                        Ok("\\") -> Other
                        _ -> Other
                      }
                  }
              }
          }
      }
  }
}

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

fn window_lines(
  lines: List(SnippetLine),
  target: Int,
  up: Int,
  down: Int,
) -> List(SnippetLine) {
  let low = target - up
  let high = target + down
  list.filter(lines, fn(l) {
    case l.marker {
      "@" -> False
      _ -> l.file_line >= low && l.file_line <= high
    }
  })
}
