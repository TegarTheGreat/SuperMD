---
name: Technical Style
category: style
version: 1.0.0
summary: Register for specifications, runbooks, API docs, and engineering communication.
---

# Style: Technical

Write for a reader who will execute, implement, or verify what you say.

- Every instruction imperative and testable: "set `pool_size` to 20", not "consider tuning the pool".
- Exact identifiers in backticks; exact versions when behavior differs by version; units on every number.
- State preconditions before steps, failure modes next to the step that can fail, and how to verify success after ("`curl /healthz` should return 200").
- RFC-2119 style keywords (MUST, SHOULD, MAY) are welcome in specs — used consistently or not at all.
- No marketing adjacency: a component is not "powerful" or "blazing-fast"; it handles N requests/second at p99 X ms, or the claim is dropped.
