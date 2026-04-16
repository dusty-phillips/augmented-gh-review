import client/model.{type Model, type Msg, FetchPrs, SelectPr, SetRepo}
import client/stack_tree.{type FlatEntry, FlatEntry}
import gleam/int
import gleam/list
import gleam/option
import gleam/string
import lustre/attribute
import lustre/element.{type Element}
import lustre/element/html
import lustre/event
import shared/pr.{type PrGroups, type PullRequest}

import monks/align_items
import monks/background
import monks/border
import monks/border_bottom
import monks/border_collapse
import monks/border_radius
import monks/color
import monks/cursor
import monks/display
import monks/flex
import monks/font_size
import monks/font_style
import monks/font_weight
import monks/gap
import monks/margin
import monks/margin_bottom
import monks/max_width
import monks/padding
import monks/text_align
import monks/text_decoration
import monks/white_space
import monks/width

import open_props/borders
import open_props/colors
import open_props/fonts
import open_props/sizes

pub fn view(model: Model) -> Element(Msg) {
  html.div(
    [
      attribute.styles([
        max_width.raw("960px"),
        margin.raw("0 auto"),
        padding.raw(sizes.size_7),
        #("font-family", fonts.font_system_ui),
      ]),
    ],
    [
      html.h1(
        [attribute.styles([color.raw(colors.indigo_12), margin_bottom.raw(sizes.size_5)])],
        [html.text("Augmented Review Dashboard")],
      ),
      repo_selector(model),
      production_pr_banner(model.pr_groups),
      case model.error {
        option.Some(err) -> error_banner(err)
        option.None -> html.text("")
      },
      case model.loading {
        True -> loading_indicator()
        False -> pr_sections(model.pr_groups)
      },
    ],
  )
}

fn repo_selector(model: Model) -> Element(Msg) {
  html.div(
    [
      attribute.styles([
        display.flex,
        gap.raw(sizes.size_2),
        margin_bottom.raw(sizes.size_5),
        align_items.center,
      ]),
    ],
    [
      html.label(
        [attribute.styles([font_weight.raw("600")])],
        [html.text("Repository:")],
      ),
      html.input([
        attribute.value(model.active_repo),
        attribute.placeholder("owner/repo"),
        event.on_input(SetRepo),
        attribute.styles([
          padding.raw(sizes.size_2 <> " " <> sizes.size_3),
          border.raw("1px solid " <> colors.gray_4),
          border_radius.raw(borders.radius_2),
          flex.raw("1"),
          font_size.raw(fonts.font_size_1),
        ]),
      ]),
      html.button(
        [
          event.on_click(FetchPrs),
          attribute.styles([
            padding.raw(sizes.size_2 <> " " <> sizes.size_4),
            background.raw(colors.indigo_6),
            color.raw("white"),
            border.none,
            border_radius.raw(borders.radius_2),
            cursor.pointer,
            font_size.raw(fonts.font_size_1),
          ]),
        ],
        [html.text("Fetch PRs")],
      ),
    ],
  )
}

fn production_pr_banner(
  pr_groups: option.Option(PrGroups),
) -> Element(Msg) {
  case pr_groups {
    option.Some(groups) ->
      case groups.production_pr {
        option.Some(prod_pr) ->
          html.a(
            [
              attribute.href(prod_pr.url),
              attribute.target("_blank"),
              attribute.styles([
                display.flex,
                align_items.center,
                gap.raw(sizes.size_3),
                padding.raw(sizes.size_3 <> " " <> sizes.size_4),
                margin_bottom.raw(sizes.size_4),
                background.raw(colors.violet_1),
                border.raw("1px solid " <> colors.violet_4),
                border_radius.raw(borders.radius_2),
                color.raw(colors.violet_9),
                font_size.raw(fonts.font_size_1),
                font_weight.raw("500"),
                text_decoration.none,
                cursor.pointer,
              ]),
            ],
            [
              html.span(
                [
                  attribute.class("material-symbols-outlined"),
                  attribute.styles([font_size.raw(fonts.font_size_3)]),
                ],
                [html.text("rocket_launch")],
              ),
              html.text(prod_pr.title),
              html.span(
                [attribute.styles([color.raw(colors.violet_6)])],
                [html.text(" #" <> int.to_string(prod_pr.number))],
              ),
            ],
          )
        option.None -> html.text("")
      }
    option.None -> html.text("")
  }
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
      ]),
    ],
    [html.text(message)],
  )
}

fn loading_indicator() -> Element(Msg) {
  html.div(
    [
      attribute.styles([
        text_align.center,
        padding.raw(sizes.size_9),
        color.raw(colors.gray_6),
        font_size.raw(fonts.font_size_2),
      ]),
    ],
    [html.text("Loading pull requests...")],
  )
}

fn pr_sections(groups: option.Option(PrGroups)) -> Element(Msg) {
  case groups {
    option.None ->
      html.div(
        [
          attribute.styles([
            text_align.center,
            padding.raw(sizes.size_9),
            color.raw(colors.gray_5),
          ]),
        ],
        [html.text("No pull requests found. Click Fetch PRs to load.")],
      )
    option.Some(g) -> {
      let prod_number = case g.production_pr {
        option.Some(prod) -> prod.number
        option.None -> -1
      }
      let all_open =
        list.filter(g.all_open, fn(p) { p.number != prod_number })
      html.div([], [
        pr_section("Created by Me", g.created_by_me, True),
        pr_section("My Review Requested", g.review_requested, False),
        pr_section("All Open PRs", all_open, False),
      ])
    }
  }
}

fn pr_section(
  title: String,
  prs: List(PullRequest),
  show_branch: Bool,
) -> Element(Msg) {
  let count = list.length(prs)
  html.div(
    [
      attribute.styles([
        margin_bottom.raw(sizes.size_7),
      ]),
    ],
    [
      section_header(title, count, prs),
      case count {
        0 -> empty_section_message()
        _ -> pr_table(prs, show_branch)
      },
    ],
  )
}

fn count_by_state(prs: List(PullRequest)) -> List(#(String, String, String, Int)) {
  let #(approved, changes, review, draft, no_reviews) =
    list.fold(prs, #(0, 0, 0, 0, 0), fn(acc, p) {
      let #(a, c, r, d, n) = acc
      case p.draft, p.review_decision {
        True, _ -> #(a, c, r, d + 1, n)
        _, "APPROVED" -> #(a + 1, c, r, d, n)
        _, "CHANGES_REQUESTED" -> #(a, c + 1, r, d, n)
        _, "REVIEW_REQUIRED" -> #(a, c, r + 1, d, n)
        _, _ -> #(a, c, r, d, n + 1)
      }
    })
  [
    #(colors.green_2, colors.green_10, "Approved", approved),
    #(colors.red_2, colors.red_10, "Changes", changes),
    #(colors.yellow_2, colors.yellow_10, "Review", review),
    #(colors.blue_2, colors.blue_9, "Draft", draft),
    #(colors.gray_1, colors.gray_6, "No reviews", no_reviews),
  ]
  |> list.filter(fn(entry) { entry.3 > 0 })
}

fn state_count_badge(
  bg: String,
  fg: String,
  label: String,
  count: Int,
) -> Element(Msg) {
  html.span(
    [
      attribute.styles([
        padding.raw("0.15rem " <> sizes.size_2),
        border_radius.raw("10px"),
        font_size.raw(fonts.font_size_0),
        font_weight.raw("500"),
        white_space.nowrap,
        background.raw(bg),
        color.raw(fg),
      ]),
    ],
    [html.text(label <> " " <> int.to_string(count))],
  )
}

fn section_header(
  title: String,
  count: Int,
  prs: List(PullRequest),
) -> Element(Msg) {
  html.div(
    [
      attribute.styles([
        display.flex,
        align_items.center,
        gap.raw(sizes.size_2),
        margin_bottom.raw(sizes.size_3),
        #("flex-wrap", "wrap"),
      ]),
    ],
    list.flatten([
      [
        html.h2(
          [
            attribute.styles([
              color.raw(colors.indigo_12),
              font_size.raw(fonts.font_size_2),
              margin.raw("0"),
            ]),
          ],
          [html.text(title)],
        ),
        html.span(
          [
            attribute.styles([
              background.raw(colors.indigo_6),
              color.raw("white"),
              padding.raw("0.15rem " <> sizes.size_2),
              border_radius.raw("10px"),
              font_size.raw(fonts.font_size_0),
              font_weight.raw("600"),
            ]),
          ],
          [html.text(int.to_string(count))],
        ),
      ],
      list.map(count_by_state(prs), fn(entry) {
        state_count_badge(entry.0, entry.1, entry.2, entry.3)
      }),
    ]),
  )
}

fn empty_section_message() -> Element(Msg) {
  html.div(
    [
      attribute.styles([
        padding.raw(sizes.size_5),
        color.raw(colors.gray_5),
        font_style.italic,
        text_align.center,
        border.raw("1px dashed " <> colors.gray_3),
        border_radius.raw(borders.radius_2),
      ]),
    ],
    [html.text("No PRs")],
  )
}

fn pr_table(prs: List(PullRequest), show_branch: Bool) -> Element(Msg) {
  let entries = stack_tree.build_and_flatten(prs)
  html.table(
    [
      attribute.styles([
        width.raw("100%"),
        border_collapse.collapse,
      ]),
    ],
    [
      html.thead([], [
        html.tr(
          [
            attribute.styles([
              background.raw(colors.gray_1),
              text_align.left,
            ]),
          ],
          [
            header_cell("#"),
            header_cell("Title"),
            header_cell("Author"),
            header_cell("Checks"),
            header_cell("Review"),
          ],
        ),
      ]),
      html.tbody([], list.map(entries, fn(e) { pr_row(e, show_branch) })),
    ],
  )
}

fn header_cell(label: String) -> Element(Msg) {
  html.th(
    [
      attribute.styles([
        padding.raw(sizes.size_3 <> " " <> sizes.size_4),
        border_bottom.raw("2px solid " <> colors.gray_3),
        font_weight.raw("600"),
      ]),
    ],
    [html.text(label)],
  )
}

fn pr_row(entry: FlatEntry, show_branch: Bool) -> Element(Msg) {
  let FlatEntry(pull_request, depth, is_last, in_stack) = entry
  let bg = case in_stack {
    True -> background.raw("rgba(99, 102, 241, 0.04)")
    False -> background.raw("transparent")
  }
  html.tr(
    [
      event.on_click(SelectPr(pull_request.number)),
      attribute.styles([
        cursor.pointer,
        border_bottom.raw("1px solid " <> colors.gray_2),
        bg,
      ]),
    ],
    [
      html.td(
        [attribute.styles([padding.raw(sizes.size_3 <> " " <> sizes.size_4)])],
        [
          html.a(
            [
              attribute.href(pull_request.url),
              attribute.target("_blank"),
              event.on_click(FetchPrs) |> event.stop_propagation,
              attribute.styles([
                color.raw(colors.indigo_6),
                text_decoration.none,
                font_weight.raw("500"),
              ]),
              attribute.class("hover-underline"),
            ],
            [html.text("#" <> int.to_string(pull_request.number))],
          ),
        ],
      ),
      {
        let title_pad_left = case depth {
          0 -> sizes.size_4
          d ->
            "calc(" <> sizes.size_4 <> " + " <> int.to_string(d * 20) <> "px)"
        }
        html.td(
          [
            attribute.styles([
              padding.raw(
                sizes.size_3 <> " " <> sizes.size_4 <> " " <> sizes.size_3
                <> " " <> title_pad_left,
              ),
              font_weight.raw("500"),
              #("position", "relative"),
              #("overflow", "visible"),
            ]),
          ],
          list.append(tree_connectors(depth, is_last), [
            html.div([], [html.text(pull_request.title)]),
            case show_branch {
              False -> html.text("")
              True ->
                html.div(
                  [
                    attribute.styles([
                      margin.raw("0.15rem 0 0 0"),
                      font_size.raw(fonts.font_size_0),
                      font_weight.raw("400"),
                      color.raw(colors.gray_6),
                      #("font-family", fonts.font_mono),
                    ]),
                  ],
                  [html.text(pull_request.head_ref_name)],
                )
            },
          ]),
        )
      },
      html.td(
        [attribute.styles([padding.raw(sizes.size_3 <> " " <> sizes.size_4)])],
        [
          html.text(pull_request.author),
          case pull_request.reviewers {
            [] -> html.text("")
            reviewers ->
              html.span(
                [
                  attribute.styles([
                    margin.raw("0 0 0 " <> sizes.size_2),
                    font_size.raw(fonts.font_size_0),
                    color.raw(colors.gray_6),
                  ]),
                ],
                [
                  html.text(
                    " → " <> string.join(reviewers, ", "),
                  ),
                ],
              )
          },
        ],
      ),
      html.td([attribute.styles([padding.raw(sizes.size_3 <> " " <> sizes.size_4)])], [
        checks_badge(pull_request.checks_status, pull_request.checks_url),
      ]),
      html.td(
        [
          attribute.styles([
            padding.raw(sizes.size_3 <> " " <> sizes.size_4),
            #("min-width", "8rem"),
            display.flex,
            align_items.center,
            gap.raw(sizes.size_2),
            #("flex-wrap", "wrap"),
          ]),
        ],
        [
          review_badge(pull_request.review_decision, pull_request.draft),
          ..list.map(pull_request.feedback, feedback_badge)
        ],
      ),
    ],
  )
}

fn tree_connectors(depth: Int, is_last: Bool) -> List(Element(Msg)) {
  case depth {
    0 -> []
    _ -> {
      let left =
        "calc(" <> sizes.size_4 <> " + " <> int.to_string({ depth - 1 } * 20)
        <> "px)"
      let vert_bottom = case is_last {
        True -> "50%"
        False -> "0"
      }
      [
        // Vertical line — positioned relative to the td
        html.span(
          [
            attribute.styles([
              #("position", "absolute"),
              #("left", left),
              #("top", "-1px"),
              #("bottom", vert_bottom),
              #("width", "1px"),
              background.raw(colors.gray_4),
            ]),
          ],
          [],
        ),
        // Horizontal connector
        html.span(
          [
            attribute.styles([
              #("position", "absolute"),
              #("left", left),
              #("top", "50%"),
              #("width", "14px"),
              #("height", "1px"),
              background.raw(colors.gray_4),
            ]),
          ],
          [],
        ),
      ]
    }
  }
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
        padding.raw("0.25rem " <> sizes.size_2),
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

fn feedback_badge(fc: pr.FeedbackCount) -> Element(Msg) {
  html.span(
    [
      attribute.title(
        fc.author <> ": " <> int.to_string(fc.count) <> " comment"
        <> case fc.count {
          1 -> ""
          _ -> "s"
        },
      ),
      attribute.styles([
        display.inline_flex,
        align_items.center,
        gap.raw("0.25rem"),
        padding.raw("0.15rem " <> sizes.size_2),
        border_radius.raw(borders.radius_2),
        font_size.raw(fonts.font_size_0),
        white_space.nowrap,
        background.raw(colors.orange_1),
        color.raw(colors.orange_9),
      ]),
    ],
    [
      html.span(
        [
          attribute.class("material-symbols-outlined"),
          attribute.styles([font_size.raw(fonts.font_size_0)]),
        ],
        [html.text("chat_bubble")],
      ),
      html.text(fc.author <> " (" <> int.to_string(fc.count) <> ")"),
    ],
  )
}

fn checks_badge(status: String, checks_url: String) -> Element(Msg) {
  let #(badge_color, icon, title) = case status {
    "passing" -> #(colors.green_7, "check_circle", "Checks passing")
    "failing" -> #(colors.red_7, "cancel", "Checks failing")
    "pending" -> #(colors.yellow_7, "schedule", "Checks pending")
    _ -> #(colors.gray_5, "help", "Checks unknown")
  }
  let icon_el =
    html.span(
      [
        attribute.class("material-symbols-outlined"),
        attribute.title(title),
        attribute.styles([
          font_size.raw(fonts.font_size_2),
          color.raw(badge_color),
        ]),
      ],
      [html.text(icon)],
    )
  case checks_url {
    "" -> icon_el
    url ->
      html.a(
        [
          attribute.href(url),
          attribute.target("_blank"),
          attribute.title("View failing check"),
          attribute.styles([
            display.inline_flex,
            text_decoration.none,
          ]),
          event.on_click(FetchPrs) |> event.stop_propagation,
        ],
        [icon_el],
      )
  }
}
