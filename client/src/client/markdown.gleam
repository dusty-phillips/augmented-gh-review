import gleam/list
import gleam/option
import gleam/regexp
import gleam/string
import lustre/attribute
import lustre/element.{type Element}
import lustre/element/html
import maud
import maud/components
import mork

/// Render markdown to Lustre elements, converting GitHub-style HTML
/// img tags to markdown images first so maud can render them.
pub fn render(text: String) -> List(Element(msg)) {
  let processed = convert_html_images(text)
  let img_components =
    components.default()
    |> components.img(fn(src, alt, _title) {
      html.img([
        attribute.src(src),
        attribute.alt(alt),
        attribute.styles([
          #("max-width", "100%"),
          #("height", "auto"),
          #("border-radius", "8px"),
          #("margin", "0.5rem 0"),
        ]),
      ])
    })
  maud.render_markdown(processed, mork.configure(), img_components)
}

/// Convert <img src="..." alt="..."> HTML tags to ![alt](src) markdown.
fn convert_html_images(text: String) -> String {
  let assert Ok(img_re) =
    regexp.compile(
      "<img[^>]*?\\bsrc=\"([^\"]*?)\"[^>]*/?>",
      regexp.Options(case_insensitive: True, multi_line: False),
    )
  let assert Ok(alt_re) =
    regexp.compile(
      "\\balt=\"([^\"]*?)\"",
      regexp.Options(case_insensitive: True, multi_line: False),
    )

  let matches = regexp.scan(img_re, text)
  list.fold(matches, text, fn(acc, m) {
    // Extract alt from the full img tag match
    let alt = case regexp.scan(alt_re, m.content) {
      [alt_match, ..] ->
        case alt_match.submatches {
          [option.Some(a), ..] -> a
          _ -> "image"
        }
      _ -> "image"
    }
    // Extract src from submatches
    let src = case m.submatches {
      [option.Some(s), ..] -> s
      _ -> ""
    }
    let replacement = "![" <> alt <> "](" <> src <> ")"
    string.replace(acc, m.content, replacement)
  })
}
