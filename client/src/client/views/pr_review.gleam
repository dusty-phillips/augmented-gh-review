import client/model.{type Model, type Msg, BackToDashboard}
import gleam/int
import gleam/list
import gleam/option
import lustre/attribute
import lustre/element.{type Element}
import lustre/element/html
import lustre/event
import shared/pr.{type PrFile}

pub fn view(model: Model) -> Element(Msg) {
  case model.selected_pr {
    option.None ->
      html.div([], [
        html.text("No PR selected."),
        back_button(),
      ])
    option.Some(detail) ->
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
          back_button(),
          html.h1(
            [
              attribute.styles([
                #("color", "#1a1a2e"),
                #("margin-bottom", "0.5rem"),
              ]),
            ],
            [html.text(detail.title)],
          ),
          html.p(
            [
              attribute.styles([
                #("color", "#666"),
                #("margin-bottom", "1.5rem"),
              ]),
            ],
            [html.text("by " <> detail.author)],
          ),
          html.h2(
            [attribute.styles([#("margin-bottom", "0.5rem")])],
            [html.text("Description")],
          ),
          html.pre(
            [
              attribute.styles([
                #("background", "#f5f5f5"),
                #("padding", "1rem"),
                #("border-radius", "4px"),
                #("overflow-x", "auto"),
                #("white-space", "pre-wrap"),
                #("word-wrap", "break-word"),
                #("margin-bottom", "1.5rem"),
              ]),
            ],
            [html.text(detail.body)],
          ),
          html.h2(
            [attribute.styles([#("margin-bottom", "0.5rem")])],
            [
              html.text(
                "Files Changed ("
                <> int.to_string(list.length(detail.files))
                <> ")",
              ),
            ],
          ),
          file_list(detail.files),
          html.div(
            [
              attribute.styles([
                #("margin-top", "2rem"),
                #("padding", "1.5rem"),
                #("background", "#eef2ff"),
                #("border-radius", "8px"),
                #("border", "1px solid #c7d2fe"),
              ]),
            ],
            [
              html.h3(
                [attribute.styles([#("margin-bottom", "0.5rem")])],
                [html.text("AI Analysis")],
              ),
              html.p(
                [attribute.styles([#("color", "#555")])],
                [html.text("AI analysis coming soon...")],
              ),
            ],
          ),
        ],
      )
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
        #("border-radius", "4px"),
        #("cursor", "pointer"),
        #("margin-bottom", "1rem"),
        #("font-size", "0.95rem"),
      ]),
    ],
    [html.text("Back to Dashboard")],
  )
}

fn file_list(files: List(PrFile)) -> Element(Msg) {
  html.div(
    [attribute.styles([#("margin-bottom", "1.5rem")])],
    list.map(files, file_row),
  )
}

fn file_row(file: PrFile) -> Element(Msg) {
  html.div(
    [
      attribute.styles([
        #("display", "flex"),
        #("justify-content", "space-between"),
        #("padding", "0.5rem 0.75rem"),
        #("border-bottom", "1px solid #eee"),
        #("font-family", "monospace"),
        #("font-size", "0.9rem"),
      ]),
    ],
    [
      html.span([], [html.text(file.path)]),
      html.span([], [
        html.span(
          [attribute.styles([#("color", "#22863a")])],
          [html.text("+" <> int.to_string(file.additions))],
        ),
        html.text(" / "),
        html.span(
          [attribute.styles([#("color", "#cb2431")])],
          [html.text("-" <> int.to_string(file.deletions))],
        ),
      ]),
    ],
  )
}
