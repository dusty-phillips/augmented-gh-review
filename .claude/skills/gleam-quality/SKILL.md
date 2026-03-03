---
name: gleam-quality
description: Check Gleam code for quality issues like panics, todos, unhandled results, and compiler warnings
disable-model-invocation: true
argument-hint: "[project-dir or file path]"
---

# Gleam Code Quality Check

Audit the Gleam code at `$ARGUMENTS` (default: all three projects — shared/, client/, server/) for quality issues.

## Step 1: Compiler Warnings

Run `gleam build` in each project directory and capture ALL warnings. Warnings are issues even if the build succeeds. Report every warning with file and line number.

## Step 2: Search for Anti-Patterns

Use Grep to search all `.gleam` files in `src/` directories (NOT `build/` or `test/`) for these patterns:

### Critical — Must Fix

1. **`todo`** — Incomplete code. Search for `\btodo\b` in gleam files. Every `todo` crashes at runtime.
2. **`panic`** — Intentional crashes. Search for `\bpanic\b`. Should almost never appear in production code.
3. **`let assert`** — Partial pattern match that crashes on mismatch. Search for `let assert`. Each one is a potential runtime crash. Suggest replacing with `case` + proper error handling using `Result`.
4. **Unhandled Results** — Assigning a `Result` to `_` or ignoring it. Search for `let _ =` and check if the right-hand side returns a Result. Every ignored Result is a silent failure.

### Warning — Should Review

5. **`string.inspect`** — Debug formatting left in production code. Search for `string\.inspect`. Should use proper error messages instead.
6. **Unused imports** — The compiler warns about these, but double-check. Search for imports that don't appear elsewhere in the file.
7. **`@deprecated`** — Using deprecated functions. The compiler warns, but list them explicitly.
8. **Empty case branches** — `_ -> Nil` catch-alls that swallow data. Search for `-> Nil` and check if the catch-all is intentional.

### Style — Nice to Have

9. **Overly long functions** — Functions over 50 lines. Flag them for potential extraction.
10. **Deeply nested case expressions** — More than 3 levels of nesting. Suggest using `use` or helper functions.
11. **Magic numbers/strings** — Hardcoded values that should be constants. Flag obvious ones like port numbers, URLs, timeout values.
12. **Missing type annotations on public functions** — Gleam infers types, but public API functions benefit from explicit annotations for documentation.

## Step 3: Report

For each issue found, report:
- **Severity**: Critical / Warning / Style
- **File**: path and line number
- **Pattern**: which rule was violated
- **Code**: the offending line(s)
- **Suggestion**: how to fix it

Group by severity, then by file. Give a summary count at the end:
```
Critical: N issues
Warning:  N issues
Style:    N issues
```

If `$ARGUMENTS` is empty, check all three projects. If a specific path is given, check only that path.
