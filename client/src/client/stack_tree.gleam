import gleam/dict
import gleam/list
import gleam/set
import shared/pr.{type PullRequest}

/// A flattened entry for rendering: the PR, its indentation depth, and whether
/// it is the last child at its level (for └─ vs ├─).
pub type FlatEntry {
  FlatEntry(pr: PullRequest, depth: Int, is_last: Bool, in_stack: Bool)
}

/// Build stacked trees from a flat list of PRs and return a flattened list
/// with depth information for rendering.
///
/// A PR is considered "stacked" if its base_ref_name matches another PR's
/// head_ref_name. Root PRs are those whose base_ref_name doesn't match any
/// open PR's head_ref_name.
pub fn build_and_flatten(prs: List(PullRequest)) -> List(FlatEntry) {
  // Set of all head branch names to identify root PRs
  let head_ref_names =
    list.fold(prs, set.new(), fn(acc, pull_request) {
      set.insert(acc, pull_request.head_ref_name)
    })

  // Build children map: base_ref_name -> list of PRs targeting that base
  let children_map =
    list.fold(prs, dict.new(), fn(acc, pull_request) {
      let existing = case dict.get(acc, pull_request.base_ref_name) {
        Ok(children) -> children
        Error(_) -> []
      }
      dict.insert(acc, pull_request.base_ref_name, [pull_request, ..existing])
    })

  let roots =
    list.filter(prs, fn(pull_request) {
      !set.contains(head_ref_names, pull_request.base_ref_name)
    })

  // Flatten each root tree, tracking visited nodes to prevent cycles
  flatten_forest(roots, children_map, 0, set.new())
}

fn flatten_forest(
  prs: List(PullRequest),
  children_map: dict.Dict(String, List(PullRequest)),
  depth: Int,
  visited: set.Set(Int),
) -> List(FlatEntry) {
  let count = list.length(prs)
  prs
  |> list.index_map(fn(pull_request, idx) {
    let is_last = idx == count - 1
    flatten_node(pull_request, children_map, depth, is_last, visited)
  })
  |> list.flatten
}

fn flatten_node(
  pull_request: PullRequest,
  children_map: dict.Dict(String, List(PullRequest)),
  depth: Int,
  is_last: Bool,
  visited: set.Set(Int),
) -> List(FlatEntry) {
  case set.contains(visited, pull_request.number) {
    True -> []
    False -> {
      let visited = set.insert(visited, pull_request.number)
      let children = case dict.get(children_map, pull_request.head_ref_name) {
        Ok(kids) -> kids
        Error(_) -> []
      }
      let in_stack = depth > 0 || !list.is_empty(children)
      let entry =
        FlatEntry(
          pr: pull_request,
          depth: depth,
          is_last: is_last,
          in_stack: in_stack,
        )
      [entry, ..flatten_forest(children, children_map, depth + 1, visited)]
    }
  }
}
