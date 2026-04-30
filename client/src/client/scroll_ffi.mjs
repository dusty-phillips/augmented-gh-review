// FFI for window scrolling, used after chunk navigation in the PR review view
// so the user lands at the top of the new chunk's description rather than
// staying scrolled to wherever the previous chunk's bottom-nav button was.

export function scrollToTop() {
  window.scrollTo({ top: 0, behavior: "smooth" });
}
