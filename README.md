# Augmented Review

AI-powered code review tool that breaks large PRs into digestible, ordered chunks with narrative explanations. Built with Gleam, Lustre, Wisp, and Claude.

Instead of dumping an entire diff on the reviewer, Augmented Review:

- Parses the diff into structured hunks (deterministic, guaranteed complete)
- Sends hunk summaries to Claude Sonnet, which groups and orders them for optimal review
- Presents one chunk at a time with explanations of what to look for
- Shows syntax-highlighted diffs with actual file line numbers
- Supports inline commenting that posts directly to GitHub
- Displays existing GitHub comments from other reviewers and bots

## Prerequisites

- [Gleam](https://gleam.run/getting-started/installing/) (v1.x)
- [Erlang/OTP](https://gleam.run/getting-started/installing/) (required by Gleam)
- [Node.js](https://nodejs.org/) (for the JavaScript client target)
- [GitHub CLI](https://cli.github.com/) (`gh`) — installed and authenticated (`gh auth login`)
- An [Anthropic API key](https://console.anthropic.com/) for AI analysis

## Setup

```bash
# Clone the repo
git clone <repo-url>
cd augmented_review

# Install dependencies for all three projects
cd shared && gleam deps download && cd ..
cd client && gleam deps download && cd ..
cd server && gleam deps download && cd ..

# Build the client bundle
cd client && gleam run -m lustre/dev build --outdir=../server/priv/static && cd ..
```

## Running

```bash
# Set your Anthropic API key
export ANTHROPIC_API_KEY="sk-ant-..."

# Start the server
cd server && gleam run
```

Open [http://localhost:2026](http://localhost:2026) in your browser.

## Development

For live reloading during development, use [watchexec](https://github.com/watchexec/watchexec):

```bash
# Terminal 1: auto-restart server on changes
cd server
watchexec -r --stop-signal SIGKILL -w src -w priv -e gleam,js,html -- gleam run

# Terminal 2: auto-rebuild client on changes
cd client
watchexec -w src -w ../shared/src -e gleam -- gleam run -m lustre/dev build --outdir=../server/priv/static
```

## Project Structure

```
augmented_review/
├── shared/          # Cross-target types + JSON codecs (Erlang & JS)
│   └── src/shared/
│       └── pr.gleam           # PullRequest, PrDetail, ReviewChunk, etc.
├── client/          # Lustre SPA (targets JavaScript)
│   └── src/client/
│       ├── model.gleam        # Model, Msg, and state types
│       ├── effects.gleam      # HTTP effects (rsvp) + SSE + URL routing
│       ├── markdown.gleam     # Markdown rendering with image support
│       ├── highlight.gleam    # Syntax highlighting via highlight.js FFI
│       ├── event_source.gleam # SSE EventSource bindings
│       └── views/
│           ├── dashboard.gleam    # PR listing with three sections
│           └── pr_review.gleam    # Chunk-based review with diff viewer
├── server/          # Wisp + Mist backend (targets Erlang)
│   └── src/server/
│       ├── server.gleam       # Mist HTTP server entry point
│       ├── router.gleam       # Wisp routes + index HTML
│       ├── github.gleam       # GitHub CLI integration via shellout
│       ├── analyzer.gleam     # AI analysis via anthropic_gleam
│       ├── diff_parser.gleam  # Deterministic diff parser
│       ├── sse.gleam          # SSE streaming for analysis
│       └── error_format.gleam # JSON decode error formatting
├── CLAUDE.md        # Claude Code project conventions
└── .claude/
    ├── settings.json
    └── skills/
        └── gleam-quality/     # Code quality checking skill
```

## Features

### Dashboard
- Three PR sections: Created by me, Review requested, All open
- CI check status icons (passing/failing/pending) — failing links to the job
- Review status badges (approved, changes requested, draft, no reviews)
- PR numbers link to GitHub
- Auto-refreshes every 2 minutes

### PR Review
- AI analysis starts automatically when opening a PR
- SSE streaming with heartbeat progress during analysis
- Chunk-by-chunk navigation with dot indicators
- Each chunk includes: what the code does, why you're seeing it now, what to watch for
- Syntax-highlighted diffs (highlight.js, atom-one-light theme)
- Actual file line numbers parsed from diff hunk headers
- PR description accordion with full markdown rendering (including images)
- Branch name display
- GitHub links on PR number, title, and file paths

### Comments
- Click any diff line to add a comment
- Comments post directly to GitHub via the reviews API
- Existing GitHub comments from other users/bots displayed inline
- General PR comments shown above the analysis

### Review Submission
- Approve, Request Changes, or Comment buttons
- Review body textarea
- Posts via GitHub reviews API

## Architecture Decisions

- **`gh` CLI over GraphQL**: Zero auth code, `gh` handles tokens. Provides structured JSON output, unified diffs, and multi-repo support via `-R`. GraphQL can't even fetch diffs.
- **Deterministic diff parsing**: The AI only provides ordering and descriptions, never diff content. The server parses hunks itself and reassembles chunks using real content, guaranteeing 100% coverage. Ungrouped hunks get a fallback chunk.
- **SSE for analysis streaming**: Mist's built-in `server_sent_events` support with heartbeat events every 3 seconds. The `anthropic_gleam` streaming path correctly respects timeouts (the non-streaming path has a bug).
- **Sum types for state**: `CommentingState`, `ReviewState`, and `AnalysisState` replace bags of `Option` fields, making the update function readable and exhaustiveness-checked.

## Configuration

The default repo is `GC-AI-Inc/app-gc-ai`. Change it in the repo selector on the dashboard, or modify the default in `client/src/client.gleam`.

The server runs on port 2026. Change it in `server/src/server.gleam`.
