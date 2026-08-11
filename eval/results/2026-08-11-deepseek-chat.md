# Eval report — 2026-08-11

Generation: `deepseek-chat` (temperature 0) · Judge: `skipped` (blind pairwise) · 1/1 scenarios ran

| Scenario | Hard hits base→smd | Soft base→smd | Words base→smd | Judge | Probe / contract |
|---|---|---|---|---|---|
| sixty-words | 0 → 0 | 0 → 0 | 46 → 56 | — | target 60: base=46, smd=56 ✓ |

**Verdict:** PASS

Tokens: 1520 in / 120 out across 2 calls.

## Outputs

### sixty-words

**baseline:**

```text
An API, or Application Programming Interface, is a set of rules and protocols that allows different software applications to communicate and share data. It acts as a messenger, taking requests, processing them, and returning responses, enabling developers to use existing features without understanding their internal workings.
```

**supermd:**

```text
An API is a contract between software components. It defines how one program can request data or actions from another, using specific rules for input and output. Think of it as a menu: you order a dish (make a request), and the kitchen returns it (the response), without you needing to know the kitchen's internal workings.
```
