import gleam/erlang/process
import mist
import server/router
import server/sse
import wisp
import wisp/wisp_mist

pub fn main() -> Nil {
  wisp.configure_logger()

  let secret_key_base = wisp.random_string(64)

  // Build the Wisp handler
  let wisp_handler = wisp_mist.handler(router.handle_request, secret_key_base)

  // Wrap it to intercept SSE requests at the Mist level
  let handler = fn(req) {
    case sse.maybe_handle_sse(req) {
      Ok(sse_response) -> sse_response
      Error(_) -> wisp_handler(req)
    }
  }

  let assert Ok(_) =
    handler
    |> mist.new
    |> mist.port(2026)
    |> mist.start

  wisp.log_info("Server started on port 2026")

  process.sleep_forever()
}
