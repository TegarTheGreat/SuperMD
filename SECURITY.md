# Security & responsible use

SuperMD is text, not executable software. It ships no code that runs on your
machine except the optional evaluation harness in `eval/`, which only calls an
LLM API you configure. There is no attack surface in the prompts themselves.
This file covers what that leaves: responsible use, and how to report a problem.

## What to report, and where

- **A slop pattern that leaked through** — a model running SuperMD still produced
  filler, a fabricated citation, praise-instead-of-review, or a format violation.
  That is a bug in the core. Open a **Slop report** issue with the model, the
  exact prompt composition, the input, and the output.
- **A harmful or inaccurate domain module** — a module that encodes a dangerous
  practice, an invented regulation, or advice that could cause real-world harm.
  Open an issue and quote the specific lines.
- **A secret committed by mistake** (an API key in a PR, for example). Do not open
  a public issue. Email the maintainer at the address in `CODE_OF_CONDUCT.md` so
  the key can be rotated before disclosure.

## The `technology/social-engineering` module

That module is scoped, in its own text, to **authorized** red-team engagements and
security-awareness work performed under a signed contract and applicable law. Its
purpose is deliverable quality — engagement reports that fix controls instead of
blaming people — not improving the effectiveness of deception against
non-consenting targets. Authorization and legality are stated as its hard limits.
Use it accordingly. Contributions that repurpose it toward unauthorized use will
be rejected.

## Handling of the eval harness

`eval/run-eval.mjs` reads an API key from `.env` (git-ignored) or the environment
and sends it only to the endpoint you set. It writes no data anywhere except the
report under `eval/results/`. Never commit `.env`; the `.gitignore` already
excludes it.
