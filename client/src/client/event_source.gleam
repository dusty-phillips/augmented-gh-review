/// EventSource FFI wrapper for consuming Server-Sent Events

pub type EventSource

@external(javascript, "./event_source_ffi.mjs", "connect")
pub fn connect(
  url: String,
  on_event: fn(String, String) -> Nil,
  on_error: fn(String) -> Nil,
) -> EventSource

@external(javascript, "./event_source_ffi.mjs", "close")
pub fn close(source: EventSource) -> Nil
