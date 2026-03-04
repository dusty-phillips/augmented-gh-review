import client/model.{type Model, type Msg, FetchPrs, SelectPr, SetRepo}
import gleam/int
import gleam/list
import gleam/option
import lustre/attribute
import lustre/element.{type Element}
import lustre/element/html
import lustre/event
import shared/pr.{type PrGroups, type PullRequest}

pub fn view(model: Model) -> Element(Msg) {
  html.div(
    [
      attribute.styles([
        #("max-width", "960px"),
        #("margin", "0 auto"),
        #("padding", "2rem"),
        #("font-family", "system-ui, sans-serif"),
      ]),
    ],
    [
      html.h1(
        [attribute.styles([#("color", "#1a1a2e"), #("margin-bottom", "1.5rem")])],
        [html.text("Augmented Review Dashboard")],
      ),
      repo_selector(model),
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
        #("display", "flex"),
        #("gap", "0.5rem"),
        #("margin-bottom", "1.5rem"),
        #("align-items", "center"),
      ]),
    ],
    [
      html.label(
        [attribute.styles([#("font-weight", "600")])],
        [html.text("Repository:")],
      ),
      html.input([
        attribute.value(model.active_repo),
        attribute.placeholder("owner/repo"),
        event.on_input(SetRepo),
        attribute.styles([
          #("padding", "0.5rem 0.75rem"),
          #("border", "1px solid #ccc"),
          #("border-radius", "4px"),
          #("flex", "1"),
          #("font-size", "0.95rem"),
        ]),
      ]),
      html.button(
        [
          event.on_click(FetchPrs),
          attribute.styles([
            #("padding", "0.5rem 1rem"),
            #("background", "#4361ee"),
            #("color", "white"),
            #("border", "none"),
            #("border-radius", "4px"),
            #("cursor", "pointer"),
            #("font-size", "0.95rem"),
          ]),
        ],
        [html.text("Fetch PRs")],
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
      ]),
    ],
    [html.text(message)],
  )
}

fn loading_indicator() -> Element(Msg) {
  html.div(
    [
      attribute.styles([
        #("text-align", "center"),
        #("padding", "3rem"),
        #("color", "#666"),
        #("font-size", "1.1rem"),
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
            #("text-align", "center"),
            #("padding", "3rem"),
            #("color", "#888"),
          ]),
        ],
        [html.text("No pull requests found. Click Fetch PRs to load.")],
      )
    option.Some(g) ->
      html.div([], [
        pr_section("Created by Me", g.created_by_me),
        pr_section("My Review Requested", g.review_requested),
        pr_section("All Open PRs", g.all_open),
      ])
  }
}

fn pr_section(title: String, prs: List(PullRequest)) -> Element(Msg) {
  let count = list.length(prs)
  html.div(
    [
      attribute.styles([
        #("margin-bottom", "2rem"),
      ]),
    ],
    [
      section_header(title, count),
      case count {
        0 -> empty_section_message()
        _ -> pr_table(prs)
      },
    ],
  )
}

fn section_header(title: String, count: Int) -> Element(Msg) {
  html.div(
    [
      attribute.styles([
        #("display", "flex"),
        #("align-items", "center"),
        #("gap", "0.5rem"),
        #("margin-bottom", "0.75rem"),
      ]),
    ],
    [
      html.h2(
        [
          attribute.styles([
            #("color", "#1a1a2e"),
            #("font-size", "1.15rem"),
            #("margin", "0"),
          ]),
        ],
        [html.text(title)],
      ),
      html.span(
        [
          attribute.styles([
            #("background", "#4361ee"),
            #("color", "white"),
            #("padding", "0.15rem 0.5rem"),
            #("border-radius", "10px"),
            #("font-size", "0.8rem"),
            #("font-weight", "600"),
          ]),
        ],
        [html.text(int.to_string(count))],
      ),
    ],
  )
}

fn empty_section_message() -> Element(Msg) {
  html.div(
    [
      attribute.styles([
        #("padding", "1.5rem"),
        #("color", "#aaa"),
        #("font-style", "italic"),
        #("text-align", "center"),
        #("border", "1px dashed #ddd"),
        #("border-radius", "4px"),
      ]),
    ],
    [html.text("No PRs")],
  )
}

fn pr_table(prs: List(PullRequest)) -> Element(Msg) {
  html.table(
    [
      attribute.styles([
        #("width", "100%"),
        #("border-collapse", "collapse"),
      ]),
    ],
    [
      html.thead([], [
        html.tr(
          [
            attribute.styles([
              #("background", "#f0f0f5"),
              #("text-align", "left"),
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
      html.tbody([], list.map(prs, pr_row)),
    ],
  )
}

fn header_cell(label: String) -> Element(Msg) {
  html.th(
    [
      attribute.styles([
        #("padding", "0.75rem 1rem"),
        #("border-bottom", "2px solid #ddd"),
        #("font-weight", "600"),
      ]),
    ],
    [html.text(label)],
  )
}

fn pr_row(pull_request: PullRequest) -> Element(Msg) {
  html.tr(
    [
      event.on_click(SelectPr(pull_request.number)),
      attribute.styles([
        #("cursor", "pointer"),
        #("border-bottom", "1px solid #eee"),
      ]),
    ],
    [
      html.td(
        [attribute.styles([#("padding", "0.75rem 1rem")])],
        [
          html.a(
            [
              attribute.href(pull_request.url),
              attribute.target("_blank"),
              event.on_click(FetchPrs) |> event.stop_propagation,
              attribute.styles([
                #("color", "#4361ee"),
                #("text-decoration", "none"),
                #("font-weight", "500"),
              ]),
              attribute.class("hover-underline"),
            ],
            [html.text("#" <> int.to_string(pull_request.number))],
          ),
        ],
      ),
      html.td(
        [
          attribute.styles([
            #("padding", "0.75rem 1rem"),
            #("font-weight", "500"),
          ]),
        ],
        [html.text(pull_request.title)],
      ),
      html.td([attribute.styles([#("padding", "0.75rem 1rem")])], [
        html.text(pull_request.author),
      ]),
      html.td([attribute.styles([#("padding", "0.75rem 1rem")])], [
        checks_badge(pull_request.checks_status, pull_request.checks_url),
      ]),
      html.td(
        [
          attribute.styles([
            #("padding", "0.75rem 1rem"),
            #("min-width", "8rem"),
          ]),
        ],
        [review_badge(pull_request.review_decision, pull_request.draft)],
      ),
    ],
  )
}

fn review_badge(decision: String, draft: Bool) -> Element(Msg) {
  let #(bg, fg, label) = case draft, decision {
    True, _ -> #("#dbeafe", "#1e40af", "Draft")
    _, "APPROVED" -> #("#d4edda", "#155724", "Approved")
    _, "CHANGES_REQUESTED" -> #("#f8d7da", "#721c24", "Changes requested")
    _, "REVIEW_REQUIRED" -> #("#fff3cd", "#856404", "Review required")
    _, "" -> #("#f3f4f6", "#6b7280", "No reviews")
    _, other -> #("#e2e3e5", "#383d41", other)
  }
  html.span(
    [
      attribute.styles([
        #("padding", "0.25rem 0.5rem"),
        #("border-radius", "4px"),
        #("font-size", "0.7rem"),
        #("white-space", "nowrap"),
        #("background", bg),
        #("color", fg),
      ]),
    ],
    [html.text(label)],
  )
}

fn checks_badge(status: String, checks_url: String) -> Element(Msg) {
  let #(color, icon, title) = case status {
    "passing" -> #("#22c55e", "check_circle", "Checks passing")
    "failing" -> #("#ef4444", "cancel", "Checks failing")
    "pending" -> #("#eab308", "schedule", "Checks pending")
    _ -> #("#9ca3af", "help", "Checks unknown")
  }
  let icon_el =
    html.span(
      [
        attribute.class("material-symbols-outlined"),
        attribute.title(title),
        attribute.styles([
          #("font-size", "1.25rem"),
          #("color", color),
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
            #("display", "inline-flex"),
            #("text-decoration", "none"),
          ]),
          event.on_click(FetchPrs) |> event.stop_propagation,
        ],
        [icon_el],
      )
  }
}
