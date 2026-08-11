---
name: How to Use
category: docs
version: 1.0.0
summary: Assembling a SuperMD system prompt and installing it on common platforms.
---

# How to use SuperMD

## Assembly

A SuperMD system prompt is a concatenation of Markdown files:

```text
CORE  +  DOMAIN (0 or more)  +  STYLE (0 or 1)
```

1. **CORE** — always. Use the single assembled file `en/SUPERMD.md`. (The split files in `en/core/` contain the same rules with fuller examples; use them when you want to trim or study the core.)
2. **DOMAIN** — pick your field from `en/domains/`. Take the category file (`_category.md`) plus your sub-field file if one exists. If your field isn't covered, instantiate `en/adapters/UNIVERSAL-ADAPTER.md` — it covers any profession in one step.
3. **STYLE** — optionally add one file from `en/styles/` to pin the register (formal, conversational, or technical).

Paste them into the system prompt in that order. The YAML block at the top of each file is metadata; keeping or stripping it makes no difference to model behavior.

**Example — a nurse wanting formal documentation output:**

```text
en/SUPERMD.md
+ en/domains/healthcare/_category.md
+ en/domains/healthcare/nursing.md
+ en/styles/formal.md
```

## Where to paste it

| Platform | Location |
|---|---|
| ChatGPT | Settings → Personalization → Custom Instructions, or a Project's instructions |
| Claude | Project instructions, or Settings → Profile preferences |
| API (any vendor) | The `system` parameter / first system message |
| Copilot-style IDE tools | Workspace instruction file (e.g. `.github/copilot-instructions.md`, `CLAUDE.md`) |
| Local models (Ollama, LM Studio) | The system prompt field of the modelfile or chat UI |

If the platform limits system prompt length, keep CORE and drop STYLE first, then the category file — the sub-field module plus CORE is the highest-value pair.

## Verifying it works

Ask the model something that usually produces slop ("write about the importance of teamwork") with and without the prompt. The difference should be obvious in the first sentence. For systematic testing, see `eval/` in the repo root — the same harness we use for releases.
