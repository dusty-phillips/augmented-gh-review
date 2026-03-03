# Augmented Code Review Platform

Three-project Gleam monorepo: shared (cross-target types), client (JS/Lustre SPA), server (Erlang/Wisp).

## Build & Run

- Build client: `cd client && gleam run -m lustre/dev build --outdir=../server/priv/static`
- Run server: `cd server && gleam run` (port 3000)
- Build shared: `cd shared && gleam build`

## Conventions

- Styling: monks_of_style + open_props for all UI (inline styles via `attribute.styles()`)
- GitHub interaction: `gh` CLI via `shellout` — never raw HTTP to GitHub
- LLM: `anthropic_gleam` on the server side only
- No authentication required; relies on local `gh` auth
- Default repo: "GC-AI-Inc/app-gc-ai"
