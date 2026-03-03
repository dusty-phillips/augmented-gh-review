import gleam/json
import gleeunit
import gleeunit/should
import shared/pr.{PrDetail, PrFile, PullRequest}

pub fn main() -> Nil {
  gleeunit.main()
}

// --- PullRequest round-trip tests ---

pub fn pull_request_round_trip_test() {
  let original =
    PullRequest(
      number: 42,
      title: "Add feature X",
      author: "octocat",
      url: "https://github.com/owner/repo/pull/42",
      created_at: "2026-01-15T10:30:00Z",
      review_decision: "APPROVED",
      draft: False,
    )

  original
  |> pr.encode_pull_request
  |> json.to_string
  |> json.parse(pr.pull_request_decoder())
  |> should.be_ok
  |> should.equal(original)
}

pub fn pull_request_draft_true_round_trip_test() {
  let original =
    PullRequest(
      number: 99,
      title: "WIP: new parser",
      author: "dev",
      url: "https://github.com/owner/repo/pull/99",
      created_at: "2026-03-01T00:00:00Z",
      review_decision: "",
      draft: True,
    )

  original
  |> pr.encode_pull_request
  |> json.to_string
  |> json.parse(pr.pull_request_decoder())
  |> should.be_ok
  |> should.equal(original)
}

// --- PrFile round-trip tests ---

pub fn pr_file_round_trip_test() {
  let original = PrFile(path: "src/main.gleam", additions: 10, deletions: 3)

  original
  |> pr.encode_pr_file
  |> json.to_string
  |> json.parse(pr.pr_file_decoder())
  |> should.be_ok
  |> should.equal(original)
}

// --- PrDetail round-trip tests ---

pub fn pr_detail_round_trip_test() {
  let original =
    PrDetail(
      number: 7,
      title: "Fix bug in parser",
      author: "contributor",
      url: "https://github.com/owner/repo/pull/7",
      body: "This PR fixes the off-by-one error in the parser.",
      files: [
        PrFile(path: "src/parser.gleam", additions: 5, deletions: 2),
        PrFile(path: "test/parser_test.gleam", additions: 20, deletions: 0),
      ],
      diff: "@@ -10,3 +10,5 @@\n-old line\n+new line",
    )

  original
  |> pr.encode_pr_detail
  |> json.to_string
  |> json.parse(pr.pr_detail_decoder())
  |> should.be_ok
  |> should.equal(original)
}

// --- List encoding/decoding tests ---

pub fn pull_request_list_round_trip_test() {
  let original = [
    PullRequest(
      number: 1,
      title: "First PR",
      author: "alice",
      url: "https://github.com/owner/repo/pull/1",
      created_at: "2026-01-01T00:00:00Z",
      review_decision: "APPROVED",
      draft: False,
    ),
    PullRequest(
      number: 2,
      title: "Second PR",
      author: "bob",
      url: "https://github.com/owner/repo/pull/2",
      created_at: "2026-01-02T00:00:00Z",
      review_decision: "CHANGES_REQUESTED",
      draft: True,
    ),
  ]

  original
  |> pr.encode_pull_request_list
  |> json.to_string
  |> json.parse(pr.pull_request_list_decoder())
  |> should.be_ok
  |> should.equal(original)
}

pub fn pr_file_list_round_trip_test() {
  let original = [
    PrFile(path: "a.gleam", additions: 1, deletions: 0),
    PrFile(path: "b.gleam", additions: 0, deletions: 5),
  ]

  original
  |> pr.encode_pr_file_list
  |> json.to_string
  |> json.parse(pr.pr_file_list_decoder())
  |> should.be_ok
  |> should.equal(original)
}

// --- Edge case tests ---

pub fn empty_strings_pull_request_test() {
  let original =
    PullRequest(
      number: 0,
      title: "",
      author: "",
      url: "",
      created_at: "",
      review_decision: "",
      draft: False,
    )

  original
  |> pr.encode_pull_request
  |> json.to_string
  |> json.parse(pr.pull_request_decoder())
  |> should.be_ok
  |> should.equal(original)
}

pub fn zero_values_pr_file_test() {
  let original = PrFile(path: "", additions: 0, deletions: 0)

  original
  |> pr.encode_pr_file
  |> json.to_string
  |> json.parse(pr.pr_file_decoder())
  |> should.be_ok
  |> should.equal(original)
}

pub fn empty_file_list_pr_detail_test() {
  let original =
    PrDetail(
      number: 0,
      title: "",
      author: "",
      url: "",
      body: "",
      files: [],
      diff: "",
    )

  original
  |> pr.encode_pr_detail
  |> json.to_string
  |> json.parse(pr.pr_detail_decoder())
  |> should.be_ok
  |> should.equal(original)
}

pub fn empty_pull_request_list_test() {
  let original: List(pr.PullRequest) = []

  original
  |> pr.encode_pull_request_list
  |> json.to_string
  |> json.parse(pr.pull_request_list_decoder())
  |> should.be_ok
  |> should.equal(original)
}
