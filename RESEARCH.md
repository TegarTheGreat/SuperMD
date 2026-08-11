# Research basis

SuperMD's rules are not a matter of taste. The patterns it bans are the measurable statistical signatures of machine-generated text documented in the sources below. This file is the evidence base; when a rule cites "the AI vocabulary shift" or "em-dash density", this is what it means. Every claim here is traceable to a named source — the same standard the prompts themselves enforce.

Last updated: 2026-08-11.

## Excess-vocabulary studies

Kobak, González-Márquez, Horváth & Lause, *Delving into LLM-assisted writing in biomedical publications through excess vocabulary* (arXiv:2406.07016, 2024; published in *Science Advances*, 2025). Tracked word frequencies across ~14 million PubMed abstracts, 2010–2024, and measured the abrupt post-ChatGPT rise in specific "style words".

- At least 10% of 2024 abstracts showed signs of LLM processing — up to 30% in some sub-corpora.
- Of ~280 excess style words in 2024, **66% were verbs and 18% adjectives** — the shift is stylistic, not topical.
- Frequently cited focal words: *delve, intricate, commendable, meticulous, surpass, elevate, foster, tapestry, realm, navigate, landscape, pivotal, resonate, testament, underscore, showcasing, compelling, paramount, crucial, unwavering, alignment*.
- "delve" appeared at roughly 25× its pre-ChatGPT rate before dropping once it was publicly named as a tell — evidence the fingerprint is real and adaptable.

These focal words populate the banned-vocabulary list in `core/01-language.md` and the eval lexicon.

## Measurable pattern thresholds

SlopDetector, *Signs of AI Writing: 12 Patterns With Reproducible Thresholds* (2026). Useful because each signal is a number, not an impression:

- **Em-dash density** — human prose 3.7–10 per 1,000 words; GPT-4.1 ≈ 10.62; a flag at >20. Feeds the punctuation-tic rule.
- **Sentence-length variance (burstiness = SD ÷ mean)** — human 0.6–1.2; AI 0.2–0.4. Feeds the sentence-rhythm rule.
- **Rule-of-three autopilot**, **"not just X, it's Y" contrast**, **empty openers**, **fake-authority phrases**, **transition-word stacking**, **corporate verb inflation** (*utilize, facilitate, leverage*), and the **deletion test** (>50% of sentences carrying no restateable fact) — each maps directly to a numbered rule in the core.

The meta-finding matters as much as the list: **no single word convicts**. Three or four signals failing together in one short passage is the real signal. SuperMD therefore bans the patterns as a set and measures them together in `eval/`, rather than treating any one word as forbidden magic.

## Newer conversational tells

Beyond the vocabulary studies, 2025–2026 field guides catalog structural tics the older lists miss: throat-clearing openers ("Here's the thing", "Let me be clear"), faux-insight setups ("What nobody tells you", "The part everyone misses"), dramatic colon reveals ("The best part: it learns."), and single-sentence dramatic fragments. These are folded into the opener and structure rules.

## Sources

- [Delving into LLM-assisted writing in biomedical publications through excess vocabulary — Science Advances (2025)](https://www.science.org/doi/10.1126/sciadv.adt3813) · [arXiv preprint 2406.07016](https://arxiv.org/abs/2406.07016)
- [Delving into PubMed Records — Perspectives on Medical Education (2024)](https://pmejournal.org/articles/10.5334/pme.1929)
- [Signs of AI Writing: 12 Patterns With Reproducible Thresholds — SlopDetector (2026)](https://slopdetector.org/blog/signs-of-ai-writing)
- [ChatGPT is changing the way we write — The Conversation (2024)](https://theconversation.com/chatgpt-is-changing-the-way-we-write-heres-how-and-why-its-a-problem-239601)

## How to update

When a new study or credible field guide adds a pattern, add it here with its source, add the rule to `core/01-language.md` (and the assembled `SUPERMD.md`), add a detector to `eval/lexicon.json`, and mirror all of it in `id/`. A pattern in the prompt without a source here is a gap; a source here without a rule is unfinished work.
