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

const github_proxy_prefixes = [
  "https://github.com/", "https://user-images.githubusercontent.com/",
  "https://avatars.githubusercontent.com/",
]

/// Render markdown to Lustre elements.
/// Pre-processes HTML tags that maud/mork can't handle natively
/// by converting them to markdown equivalents.
pub fn render(text: String) -> List(Element(msg)) {
  let processed =
    text
    |> convert_picture_tags
    |> convert_html_images
    |> convert_details_tags
    |> convert_video_tags

  let custom_components =
    components.default()
    |> components.img(fn(src, alt, _title) {
      // Proxy GitHub URLs through our server (they need auth)
      let needs_proxy =
        list.any(github_proxy_prefixes, fn(prefix) {
          string.starts_with(src, prefix)
        })
      let proxied_src = case needs_proxy {
        True -> "/api/image-proxy?url=" <> src
        False -> src
      }
      html.img([
        attribute.src(proxied_src),
        attribute.alt(alt),
        attribute.styles([
          #("max-width", "100%"),
          #("min-width", "20px"),
          #("min-height", "20px"),
          #("height", "auto"),
          #("border-radius", "8px"),
          #("margin", "0.5rem 0"),
          #("display", "block"),
        ]),
      ])
    })

  maud.render_markdown(
    processed,
    mork.configure() |> mork.extended(True),
    custom_components,
  )
}

/// Convert <picture><source ...><img ...></picture> to just the <img> tag,
/// then let convert_html_images handle it.
fn convert_picture_tags(text: String) -> String {
  let assert Ok(re) =
    regexp.compile(
      "<picture[^>]*>[\\s\\S]*?(<img[^>]*>)[\\s\\S]*?</picture>",
      regexp.Options(case_insensitive: True, multi_line: True),
    )
  let matches = regexp.scan(re, text)
  list.fold(matches, text, fn(acc, m) {
    let img_tag = case m.submatches {
      [option.Some(img), ..] -> img
      _ -> ""
    }
    string.replace(acc, m.content, img_tag)
  })
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
    let alt = case regexp.scan(alt_re, m.content) {
      [alt_match, ..] ->
        case alt_match.submatches {
          [option.Some(a), ..] -> a
          _ -> "image"
        }
      _ -> "image"
    }
    let src = case m.submatches {
      [option.Some(s), ..] -> s
      _ -> ""
    }
    let replacement = "![" <> alt <> "](" <> src <> ")"
    string.replace(acc, m.content, replacement)
  })
}

/// Convert <details><summary>...</summary>...</details> to markdown blockquote.
fn convert_details_tags(text: String) -> String {
  let assert Ok(re) =
    regexp.compile(
      "<details[^>]*>[\\s\\S]*?<summary[^>]*>([\\s\\S]*?)</summary>([\\s\\S]*?)</details>",
      regexp.Options(case_insensitive: True, multi_line: True),
    )
  let matches = regexp.scan(re, text)
  list.fold(matches, text, fn(acc, m) {
    let #(summary, body) = case m.submatches {
      [option.Some(s), option.Some(b), ..] -> #(string.trim(s), string.trim(b))
      [option.Some(s), ..] -> #(string.trim(s), "")
      _ -> #("Details", "")
    }
    let replacement = "> **" <> summary <> "**\n>\n> " <> string.replace(body, "\n", "\n> ")
    string.replace(acc, m.content, replacement)
  })
}

/// Convert <video> tags to a linked text.
fn convert_video_tags(text: String) -> String {
  let assert Ok(re) =
    regexp.compile(
      "<video[^>]*?\\bsrc=\"([^\"]*?)\"[^>]*/?>(?:[\\s\\S]*?</video>)?",
      regexp.Options(case_insensitive: True, multi_line: True),
    )
  let matches = regexp.scan(re, text)
  list.fold(matches, text, fn(acc, m) {
    let src = case m.submatches {
      [option.Some(s), ..] -> s
      _ -> ""
    }
    let replacement = "[Video](" <> src <> ")"
    string.replace(acc, m.content, replacement)
  })
}
