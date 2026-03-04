@external(javascript, "./highlight_ffi.mjs", "highlight_line")
pub fn highlight_line(code: String, language: String) -> String

@external(javascript, "./highlight_ffi.mjs", "detect_language")
pub fn detect_language(file_path: String) -> String
