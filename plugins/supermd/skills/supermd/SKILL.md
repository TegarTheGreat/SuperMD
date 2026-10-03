---
name: supermd
description: Apply SuperMD anti-slop rules and profession modules. Use when drafting or reviewing prose such as docs, READMEs, commit messages, PR descriptions, reports, emails, or explanations; when the user names a profession (nursing, backend, legal, accounting, and so on) and wants output in that field's conventions; or when asked to remove AI slop, filler, or sycophancy from text.
---

# SuperMD

The always-on core rules are already in this session's context. This skill covers the two things the core cannot: a profession's own norms, and verifying a draft.

## Add a profession module

When the user works in a specific field, fetch that field's module and follow it for the rest of the task. A module adds only what the core cannot know: the audience, the typical deliverables, the quality bar, exact terminology, the field's own clichés, and the facts that must never be guessed.

1. Call the `supermd_build` MCP tool with `field` set to the profession, for example `nursing`, `backend`, or `contract-drafting`. Pass `style` (`formal`, `conversational`, `technical`) only when the user wants a pinned register, and `lang: "id"` for Bahasa Indonesia. Without MCP, run `npx -y supermd@latest build <field>`.
2. If the tool reports no module for the field, call `supermd_adapt` with a short description of the profession and follow its instructions to build the module on the spot. `supermd_list` shows what ships.

## Verify a draft before delivering it

Call `supermd_check` on any prose you wrote for the user, or run `npx -y supermd@latest check <file>`. Rewrite until it reports zero hard hits. The linter flags known surface patterns only: it cannot see verbose text that says nothing, or a plausible invented figure. Apply the deletion test yourself, and never promote a guess to a fact.
