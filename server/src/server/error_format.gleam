import gleam/dynamic/decode
import gleam/json
import gleam/list
import gleam/string

/// Format a json.DecodeError into a human-readable string.
pub fn json_decode_error(err: json.DecodeError) -> String {
  case err {
    json.UnexpectedEndOfInput -> "Unexpected end of input"
    json.UnexpectedByte(byte) -> "Unexpected byte: " <> byte
    json.UnexpectedSequence(seq) -> "Unexpected sequence: " <> seq
    json.UnableToDecode(errors) ->
      "Unable to decode: "
      <> list.map(errors, decode_error)
      |> string.join("; ")
  }
}

/// Format a single decode.DecodeError.
fn decode_error(err: decode.DecodeError) -> String {
  let path = case err.path {
    [] -> ""
    segments -> " at " <> string.join(segments, ".")
  }
  "expected " <> err.expected <> ", found " <> err.found <> path
}
