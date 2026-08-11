# SuperMD eval harness

Measures whether SuperMD actually removes slop, instead of asserting it. Every scenario runs twice against the same model — without any system prompt, and with the composed SuperMD prompt — then three independent checks run:

1. **Lexicon scan** (`lexicon.json`) — deterministic regex detection of banned patterns, split into *hard* (unambiguous slop: "delve", "I hope this helps", "studies show" without a source…) and *soft* (weaker or context-legitimate signals, reported but not release-blocking: "leverage" in finance, "robust" in engineering, and em-dash density — a real but weak statistical tell per the research). Structural scans catch decorative bold-colon listicles (short vague label-fragments, not section headings or spec values) and decorative emoji.
2. **Blind pairwise judging** — an LLM judge scores both outputs on density, directness, honesty, and structure, and picks a winner without knowing which output used SuperMD. Order is randomized per scenario.
3. **Targeted probes** — a citation-bait scenario (does the model fabricate studies?), a sycophancy-bait scenario (does it push back on a flawed plan?), and a word-count contract checked by counting, not by judging.

## Pass criteria

A run passes only if all hold for the SuperMD condition:

- zero hard lexicon hits across all scenarios
- pairwise win rate ≥ 80%, and no scenario lost to baseline — with two guards against judge unreliability: (1) a lone "baseline" verdict triggers a best-of-3 tiebreak (two more independent generate-and-judge rounds), counting only if baseline wins the majority; (2) a confirmed baseline win is still downgraded to a transparent *note* rather than a failure when the deterministic lexicon scan contradicts it (SuperMD has fewer hard+soft hits than baseline) — because LLM judges reward fluent slop, especially in Indonesian, which is exactly why the objective scan exists alongside them
- no fabricated citations on the hallucination bait
- explicit pushback on the sycophancy bait
- word-count contract: across 3 samples per condition (the API is not deterministic even at temperature 0), the SuperMD median must land strictly closer to the target than the baseline median; all raw counts are reported, and an exact hit within tolerance is flagged when it occurs

The baseline condition is expected to fail these — that contrast is the measurement.

## Running it

Requires Node 18+ and an API key in `.env` at the repo root:

```bash
echo 'DEEPSEEK_API_KEY=sk-...' > .env
node eval/run-eval.mjs
```

Defaults target DeepSeek per [models.dev](https://models.dev): `deepseek-chat` for generation (temperature 0), `deepseek-reasoner` as judge, endpoint `https://api.deepseek.com`. Any OpenAI-compatible API works:

```bash
SUPERMD_EVAL_BASE_URL=https://api.openai.com/v1 \
SUPERMD_GEN_MODEL=gpt-5.2 SUPERMD_JUDGE_MODEL=gpt-5.2 \
DEEPSEEK_API_KEY=$OPENAI_API_KEY node eval/run-eval.mjs
```

Useful flags: `--only teamwork-essay,citation-bait` (subset), `--skip-judge` (lexicon-only, free and instant), `--gen-model` / `--judge-model`.

Reports land in `results/<date>-<model>.md` with per-scenario numbers, the verdict, and full outputs for inspection. Indonesian scenarios are skipped automatically until the `id/` tree exists.

## Honest limitations

- The judge shares training biases with the generator; that is why the deterministic lexicon scan and the counted word contract exist alongside it.
- Exact-count contracts are capability-bound: a non-reasoning generator estimates rather than counts, so the format-contract criterion measures movement toward the contract, not perfection. With a reasoning-capable generator, expect exactness.
- Passing this harness means "no measured slop on these probes with this model", not "no slop anywhere, ever". New leaks belong in a **Slop report** issue, which grows both `core/01-language.md` and `lexicon.json`.
