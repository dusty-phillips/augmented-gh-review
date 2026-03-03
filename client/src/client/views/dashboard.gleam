import client/model.{type Model, type Msg, FetchPrs, SelectPr, SetRepo}
import gleam/list
import lustre/attribute
import lustre/element.{type Element}
import lustre/element/html
import lustre/event
import shared/pr.{type PullRequest}

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
      case model.loading {
        True -> loading_indicator()
        False -> pr_table(model.prs)
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

fn pr_table(prs: List(PullRequest)) -> Element(Msg) {
  case list.is_empty(prs) {
    True ->
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
    False ->
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
                header_cell("Title"),
                header_cell("Author"),
                header_cell("Created"),
                header_cell("Review"),
              ],
            ),
          ]),
          html.tbody([], list.map(prs, pr_row)),
        ],
      )
  }
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
        html.text(pull_request.created_at),
      ]),
      html.td([attribute.styles([#("padding", "0.75rem 1rem")])], [
        review_badge(pull_request.review_decision),
      ]),
    ],
  )
}

fn review_badge(decision: String) -> Element(Msg) {
  let #(bg, fg) = case decision {
    "APPROVED" -> #("#d4edda", "#155724")
    "CHANGES_REQUESTED" -> #("#f8d7da", "#721c24")
    "REVIEW_REQUIRED" -> #("#fff3cd", "#856404")
    _ -> #("#e2e3e5", "#383d41")
  }
  html.span(
    [
      attribute.styles([
        #("padding", "0.25rem 0.5rem"),
        #("border-radius", "4px"),
        #("font-size", "0.8rem"),
        #("background", bg),
        #("color", fg),
      ]),
    ],
    [html.text(decision)],
  )
}
