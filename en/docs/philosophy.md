---
name: Philosophy
category: docs
version: 1.0.0
summary: What slop is, why it happens, and the design principles behind SuperMD.
---

# Philosophy

## What slop is

Slop is output optimized to *look like* a good answer instead of *being* one. It is not a length problem or a politeness problem — it is a substitution: pattern-shaped text where information should be. The three faces SuperMD targets:

- **Language slop** — filler openers, inflated vocabulary, hedging stacks, decorative lists: sentences that survive the deletion test failing.
- **Behavior slop** — invented citations, praise inflation, agreeing with false premises, unfounded confidence: claims the reader cannot trust.
- **Format slop** — scaffolding without a building: headers, bullets, and bold type standing in for reasoning; ignored format contracts.

Language slop wastes minutes. Behavior slop destroys trust. Format slop hides whether the other two happened.

## Why models produce it

Assistant-tuned models are rewarded for answers that *raters liked*, and raters reward visible effort, hedged safety, and agreeable tone. The result is a systematic bias toward ceremony, padding, and flattery — not because the model can't do better, but because nothing in the context demands it. A system prompt is that demand. It works because the capability was always there; slop is a default, not a ceiling.

## Design principles

1. **Name the pattern, don't just command the virtue.** "Be concise" fails because the model believes it is being concise. "Never open by restating the request" is checkable — by the model, by a reviewer, by a regex.
2. **Every rule carries its counter-move.** A ban without a replacement produces evasion, not improvement. Each pattern is paired with what to write instead — usually "the specific fact the filler was hiding".
3. **Universal core, composed domains.** Rules true in every field live in one place. A domain module adds only what the core cannot know: audience, artifacts, standards, vocabulary, and the field's own clichés. This is why a compact set of categories plus an adapter covers the long tail of professions — the anti-slop machinery never needs re-stating.
4. **Testable or it doesn't ship.** The claims this project makes about itself are checked by `eval/` — banned-pattern scans and blind pairwise judging on slop-bait tasks, including honesty probes (does the model fabricate a citation when baited?) and disagreement probes (does it push back on a flawed plan?). A prompt library about quality that never measures itself would be its own counterexample.
5. **The documents obey themselves.** Every file in this repo is subject to its own rules. If you find slop in SuperMD, that is a bug — file it.

## What SuperMD is not

It is not a jailbreak, a persona, or a "make the model smarter" incantation. It cannot add knowledge the model lacks; it can only stop the model from papering over the lack. On honesty rules it is strictly conservative: when SuperMD works, the model says "I don't know" *more* often, not less.
