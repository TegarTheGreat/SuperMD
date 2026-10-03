---
name: CLI
category: docs
version: 1.0.0
summary: The supermd command — compose prompts, install them into agent harnesses, lint text for slop, and run an MCP server, with no install.
---

# The `supermd` CLI

The Markdown library is the source of truth; the CLI is a convenience layer over it. It has zero dependencies and needs only Node 18+. Run it without installing:

```bash
npx supermd <command>
```

Or clone the repo and run `node bin/supermd.mjs <command>` directly.

## Compose a prompt — `build`

Assemble a system prompt from a field. The CLI resolves the field to its module, adds the category context and the universal core, and prints the result:

```bash
npx supermd build software-engineering --style technical
npx supermd build nursing --lang id --out prompt.txt
npx supermd build --core-only          # just the universal core, nothing else
```

Field matching is forgiving: `nurse` resolves to `nursing`, `frontend` to Frontend Engineering. When a term is ambiguous or unknown, the CLI lists the closest sub-fields and points you at `adapt`.

Options: `--style formal|conversational|technical`, `--lang en|id`, `--core-only`, `--out FILE`, `--no-banner` (drop the leading provenance comment), `--keep-frontmatter`. Each module's YAML metadata block is stripped from the assembled prompt by default, because a second `---` block in the middle of a pasted prompt confuses harnesses that parse front matter.

## Any profession — `adapt`

For a field with no shipped module, instantiate the universal adapter. The output is a ready system prompt that makes the model build the field module itself before answering:

```bash
npx supermd adapt "beekeeper"
npx supermd adapt "notaris" --lang id
```

## Browse the catalog — `list`

```bash
npx supermd list                # all 16 categories
npx supermd list technology     # one category's sub-fields and their slugs
```

## Install into a harness — `install`, `uninstall`, `status`, `harnesses`

Write the rules where a coding agent reads them, without touching your own content. The full guide, with every harness, file path, and guarantee, is in [integrations.md](integrations.md).

```bash
npx supermd install claude-code codex          # this project
npx supermd install cursor --field backend     # core plus a profession module
npx supermd install claude-code --scope user   # every project, via your home directory
npx supermd install all --dry-run              # preview, write nothing
npx supermd status                             # what is installed, and whether it is current
npx supermd uninstall all                      # remove exactly what was written
npx supermd harnesses                          # the supported harnesses and their files
```

Options: `--field NAME`, `--style NAME`, `--lang en|id`, `--scope project|user`, `--dir PATH`, `--dry-run`, `--force`. Exit code 1 means a file was left untouched because SuperMD does not own it.

## MCP server — `mcp`

```bash
claude mcp add supermd -- npx -y supermd mcp
codex mcp add supermd -- npx -y supermd mcp
```

A local stdio server with four read-only tools (`supermd_check`, `supermd_build`, `supermd_adapt`, `supermd_list`) and one prompt. An agent calls `supermd_check` on its own draft and rewrites until there are no hard hits. Details and configuration for other clients: [integrations.md](integrations.md#mcp-server).

## Lint text for slop — `check`

Score any text against the anti-slop lexicon — the same deterministic scan the eval harness uses. It reads a file, a directory (every `.md` under it, recursively), or standard input, prints each pattern it finds with a severity, and exits non-zero when it finds *hard* (unambiguous) slop, so it drops into a pre-commit hook or CI:

```bash
npx supermd check draft.md
npx supermd check docs/                          # sweep a whole tree, one summary line
cat article.txt | npx supermd check
llm-output.txt | npx supermd check && echo "clean"
```

The language is auto-detected per file from its function words; pass `--lang en|id` to override — the flag wins over detection.

*Hard* hits are unambiguous slop (filler openers, invented-authority phrases, sycophancy). *Soft* hits are weaker or context-legitimate signals (em-dash density, "leverage") that are reported but never fail the check. A banned phrase quoted or italicized on a prohibition line — "Do not use 'I hope this helps'", a `BAD:` example, an italicized banned-word list — is read as teaching avoidance, not as slop.

**What `check` is and is not.** It is a deterministic detector of *known* surface patterns — a blocklist, like a spell-checker. Passing it means "none of the known tells are present," never "this text is slop-free." Semantic slop — verbose text that says nothing, a subtly fabricated figure, generic reasoning dressed as insight — is not a regex and no code catches it reliably (even strong LLMs score poorly at detecting slop spans; see `RESEARCH.md`). The real defense is prevention: SuperMD in the system prompt stops the model emitting slop in the first place. `check` is a cheap second line, useful in a pre-commit hook or CI, not a certificate.

## Use it as a library

The two modules are importable:

```js
import { compose, adapt, catalog } from 'supermd/compose';
import { scan } from 'supermd/slop-scan';

const { prompt } = compose({ field: 'backend', style: 'technical', lang: 'en' });
const hits = scan(myText, 'en');   // { hard: [...], soft: [...] }
```

`supermd/harnesses` (the installer's planner) and `supermd/mcp` (the server) are importable too. Color output follows the terminal; set `FORCE_COLOR=1` to force it or `NO_COLOR=1` to disable it.
