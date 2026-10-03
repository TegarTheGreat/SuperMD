# Security & responsible use

SuperMD's prompts are plain text with no attack surface of their own. The
repository does ship a small amount of code, and this file states what that code
does and does not do, then covers responsible use and how to report a problem.

## What the code does

- **`supermd build | adapt | list | check`** read the Markdown tree and print to
  stdout. `check` only reads the file, directory, or stdin you give it.
- **`supermd install | uninstall`** write to exactly the paths listed by
  `supermd harnesses`, inside the project directory (or your home directory with
  `--scope user`). SuperMD owns only the region between its
  `<!-- supermd:begin -->` and `<!-- supermd:end -->` markers, or a dedicated file
  that carries a `<!-- supermd:managed -->` marker. `--dry-run` prints the plan
  without writing. Uninstall never deletes a file that lacks the marker.
- **`supermd mcp`** is a local stdio server. It exposes four read-only tools
  (`supermd_check`, `supermd_build`, `supermd_adapt`, `supermd_list`) and one
  prompt. It makes no network requests, reads no files outside this package, and
  writes nothing.
- **`eval/run-eval.mjs`** is optional. It reads an API key from `.env` (git-ignored)
  or the environment, sends prompts only to the endpoint you set, and writes only
  the report under `eval/results/`.
- **Runtime dependencies: none.** `package.json` declares no `dependencies`.

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

## Prompt-injection note for installed rules

Rules files are instructions to an agent. Treat an installed SuperMD block like
any other code you vendor: it is plain Markdown, so review it with `git diff`
after `supermd install`, and pin the version (`npx supermd@1.12.0 install …`) if
you want reproducible rules across a team.
