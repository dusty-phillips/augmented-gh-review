// FFI for browser EventSource API
// Used to consume Server-Sent Events from the analysis endpoint

export function connect(url, onEvent, onError) {
  const source = new EventSource(url);

  // Listen for analysis_complete events
  source.addEventListener("analysis_complete", (e) => {
    onEvent("analysis_complete", e.data);
  });

  // Listen for analysis_error events
  source.addEventListener("analysis_error", (e) => {
    onEvent("analysis_error", e.data);
  });

  // Listen for heartbeat events
  source.addEventListener("heartbeat", (e) => {
    onEvent("heartbeat", e.data);
  });

  // Listen for done events - close the connection
  source.addEventListener("done", (_e) => {
    source.close();
  });

  // Handle connection errors
  source.onerror = (_e) => {
    // Only report error if we haven't already closed
    if (source.readyState === EventSource.CLOSED) {
      return;
    }
    onError("EventSource connection error");
    source.close();
  };

  return source;
}

export function close(source) {
  source.close();
}
