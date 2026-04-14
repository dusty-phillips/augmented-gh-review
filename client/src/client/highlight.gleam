import gleam/list
import gleam/option.{type Option, None, Some}
import gleam/string
import lustre/element.{type Element}
import lustre/element/html
import smalto
import smalto/grammar.{type Grammar}
import smalto/languages/bash
import smalto/languages/c
import smalto/languages/cpp
import smalto/languages/css
import smalto/languages/dart
import smalto/languages/dockerfile
import smalto/languages/elixir
import smalto/languages/erlang
import smalto/languages/gleam as gleam_lang
import smalto/languages/go
import smalto/languages/haskell
import smalto/languages/html as html_lang
import smalto/languages/java
import smalto/languages/javascript
import smalto/languages/json
import smalto/languages/kotlin
import smalto/languages/lua
import smalto/languages/markdown
import smalto/languages/php
import smalto/languages/python
import smalto/languages/ruby
import smalto/languages/rust
import smalto/languages/scala
import smalto/languages/sql
import smalto/languages/swift
import smalto/languages/toml
import smalto/languages/typescript
import smalto/languages/xml
import smalto/languages/yaml
import smalto/languages/zig
import smalto/lustre as smalto_lustre

/// Detect the grammar for a file path based on its extension.
pub fn detect_grammar(file_path: String) -> Option(Grammar) {
  // Strip " (+N more)" suffix from multi-file chunks
  let clean_path = case string.split(file_path, " (+") {
    [path, ..] -> path
    _ -> file_path
  }
  let ext = case string.split(clean_path, ".") {
    [_] -> ""
    parts -> {
      let assert Ok(last) = list.last(parts)
      string.lowercase(last)
    }
  }
  case ext {
    "gleam" -> Some(gleam_lang.grammar())
    "js" | "jsx" | "mjs" -> Some(javascript.grammar())
    "ts" | "tsx" -> Some(typescript.grammar())
    "py" -> Some(python.grammar())
    "rb" -> Some(ruby.grammar())
    "rs" -> Some(rust.grammar())
    "go" -> Some(go.grammar())
    "java" -> Some(java.grammar())
    "kt" -> Some(kotlin.grammar())
    "swift" -> Some(swift.grammar())
    "ex" | "exs" -> Some(elixir.grammar())
    "erl" -> Some(erlang.grammar())
    "css" | "scss" -> Some(css.grammar())
    "html" | "htm" -> Some(html_lang.grammar())
    "xml" -> Some(xml.grammar())
    "json" -> Some(json.grammar())
    "yaml" | "yml" -> Some(yaml.grammar())
    "md" -> Some(markdown.grammar())
    "sql" -> Some(sql.grammar())
    "sh" | "bash" | "zsh" | "fish" -> Some(bash.grammar())
    "toml" -> Some(toml.grammar())
    "dockerfile" -> Some(dockerfile.grammar())
    "c" | "h" -> Some(c.grammar())
    "cpp" | "hpp" | "cc" | "cxx" -> Some(cpp.grammar())
    "dart" -> Some(dart.grammar())
    "hs" -> Some(haskell.grammar())
    "lua" -> Some(lua.grammar())
    "php" -> Some(php.grammar())
    "scala" -> Some(scala.grammar())
    "zig" -> Some(zig.grammar())
    _ -> None
  }
}

/// Highlight a line of code, returning Lustre elements.
pub fn highlight_line(code: String, grammar: Option(Grammar)) -> List(Element(a)) {
  case grammar {
    None -> [html.text(code)]
    Some(g) -> {
      let tokens = smalto.to_tokens(code, g)
      smalto_lustre.to_lustre(tokens, smalto_lustre.default_config())
    }
  }
}
