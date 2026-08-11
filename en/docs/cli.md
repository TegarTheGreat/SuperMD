---
name: CLI
category: docs
version: 1.0.0
summary: The supermd command — compose prompts and lint text for slop, from the terminal, with no install.
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

Options: `--style formal|conversational|technical`, `--lang en|id`, `--core-only`, `--out FILE`, `--no-banner` (drop the leading provenance comment).

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

## Lint text for slop — `check`

Score any text against the anti-slop lexicon — the same deterministic scan the eval harness uses. It reads a file or standard input, prints each pattern it finds with a severity, and exits non-zero when it finds *hard* (unambiguous) slop, so it drops into a pre-commit hook or CI:

```bash
npx supermd check draft.md
cat article.txt | npx supermd check --lang id
llm-output.txt | npx supermd check && echo "clean"
```

*Hard* hits are unambiguous slop (filler openers, invented-authority phrases, sycophancy). *Soft* hits are weaker or context-legitimate signals (em-dash density, "leverage") that are reported but never fail the check. A banned phrase quoted on a prohibition line ("Do not use 'I hope this helps'") is read as teaching avoidance, not as slop.

## Use it as a library

The two modules are importable:

```js
import { compose, adapt, catalog } from 'supermd/compose';
import { scan } from 'supermd/slop-scan';

const { prompt } = compose({ field: 'backend', style: 'technical', lang: 'en' });
const hits = scan(myText, 'en');   // { hard: [...], soft: [...] }
```
