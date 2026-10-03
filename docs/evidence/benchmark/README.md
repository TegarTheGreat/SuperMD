# Benchmark: 103 modules, three generators, three judges, and an agent with tools

Run on 2026-10-03 with `node eval/bench.mjs`. Everything here is reproducible from `eval/bench.mjs`, `eval/bench/`, and the raw data in `eval/results/bench-*.json`. The generated tables are in [results.md](results.md) and the numbers behind the charts in [summary.json](summary.json).

The 41-scenario eval answers one question: does SuperMD beat no rules on the cases it was built around? This benchmark asks four others.

1. Does every module do what it says, or only the 28 the eval covers?
2. Does the effect hold on other models, and with a second judge?
3. Does it help with the text agents write besides chat answers (commit messages, review comments, release notes)?
4. Does it change what an agent with tools does in a repository?

It also contains the result I did not expect: the headline win rate depends on how the judge is asked.

## Results in one table

| question | measured | what it says |
|---|---|---|
| Banned patterns (hard slop) | 103 modules: 138 → 12 hits. Three generators on 15 scenarios: 70 → 0. Agent final messages: 0 → 0 | Holds everywhere there is something to remove. The baseline Claude Code agent was already clean. |
| Length | 26% to 40% fewer words per answer on chat tasks | Consistent. |
| Stating a figure as fact with no source named | 31% → 9% of 103 "give me the number" requests | Real effect. |
| Giving the figure and the source to check | 33% → 31% | No gain. The answers that stopped inventing mostly stopped answering. |
| Withholding the figure entirely | 37% → 62% by the judge. In 23 of the 27 changed answers that I read, 9 were cases where the baseline also declined and the judge mislabeled it, so the true rise is smaller | The cost of caution. Part of it is correct (data the model cannot have), part is over-caution on stable, well-known values. |
| Blind pairwise, rubric that asks for density, directness, honesty, structure | DeepSeek judge: 69 wins, 15 ties, 19 losses of 103. Claude Sonnet, same rubric: 52 / 27 / 24 | SuperMD wins under the rubric it was written to satisfy. A second judge halves the margin. |
| Blind pairwise, no rubric ("which is better for the person who asked") | Modules, Claude Sonnet: 47 / 24 / 32. Cross-model, Sonnet: 1 / 2 / 9. DeepSeek: 3 / 2 / 7. Haiku: 7 / 3 / 2 | **The advantage disappears or reverses.** See below. |
| Invented citations, sycophancy probes | No change (0 → 0 invented, pushback 2 → 2 of 2 on DeepSeek and Haiku, 1 → 1 of 2 on Sonnet) | The baselines already passed these probes, so they cannot show a gain. |
| Engineering artifacts (8 tasks) | DeepSeek 1 win, 6 ties, 1 loss. Sonnet 4 / 3 / 1 | Small and mostly ties. |
| Agent with tools (Claude Code, Sonnet, 12 runs per condition) | 12 of 12 tasks passed in both. Cost per run $0.071 → $0.103 | No outcome gain on small tasks. About 45% more cost per run, from the added context and longer commit bodies. |

## Method

**Generators.** `deepseek-chat` at temperature 0, and Claude `haiku` and `sonnet` through `claude -p` (the aliases Claude Code resolved on the run date; Claude's temperature is its default). One sample per cell.

**Conditions.** *Without* is the generator with no SuperMD. *With* is the core plus the field module, built the way `supermd build` builds it.

- Suite 2 gives the Claude generators the prompt as the system prompt, with Claude Code's own system prompt replaced (baseline: one neutral sentence). A smoke test with Claude Code's default prompt showed the baseline Haiku declining a teamwork essay as outside its scope as a software agent. Kept, that would have turned the baseline's refusals into SuperMD wins, so the smoke-test outputs were deleted and are not in the numbers.
- Suites 3 and 4 install SuperMD as `CLAUDE.md` over Claude Code's defaults, as `supermd install claude-code` does, because the artifacts there are what Claude Code writes.

**Suite 1, all 103 modules.** DeepSeek wrote, from each module's own summary and hard limits, one ordinary task and one "temptation": a quick request for a figure, code, or deadline that the module says must come from an authoritative source. The 103 pairs are committed in `eval/bench/module-prompts.json` and were not used to tune any module. They do aim at what each module forbids, so this measures whether a module does what it states, not how often real users ask for such figures.

**Judges.** Every pairwise comparison runs in both orders and counts as a win or a loss only when both orders agree. There are three judges: `deepseek-reasoner` with a rubric (density, directness, honesty, structure), Claude Sonnet with the same rubric, and Claude Sonnet with no rubric. A separate `deepseek-reasoner` pass labels each temptation answer: did it state a specific value, and did it state it as fact without naming a source to check.

**Suite 4 tasks.** Fix failing tests (`slugify`), implement from tests (`parseDuration`), write a README from the code of a small CLI, and a wrong-test case where the correct move is to keep the code and fix the test. Each ends in a commit. Pass is an objective check: tests run, no flag in the README that the CLI lacks, and the median function still returns 2.5 for `[1, 2, 3, 4]`.

**Cost of the run.** Claude Code calls: $17.96 over 676 calls, of which the two Claude judge passes over the 103 module pairs were $10.61. DeepSeek: 1.88 million input and 1.42 million output tokens.

## The rubric result

The blind judge in the 41-scenario eval, and in this benchmark's main comparison, scores density, directness, honesty, and structure. Those are the things SuperMD is written to improve. When a second model uses the same rubric, SuperMD's lead on the 103 module tasks drops from 69 wins to 52. When the same Claude Sonnet is asked only which answer is better for the person who asked, the pairs split 47 wins, 24 ties, 32 losses on module tasks, and on the 12 judged cross-model scenarios per generator the three judges read as follows.

| generator | rubric judge (W / T / L) | Claude Sonnet, same rubric | Claude Sonnet, no rubric |
|---|---|---|---|
| deepseek | 8 / 3 / 1 | 10 / 0 / 2 | 3 / 2 / 7 |
| haiku | 12 / 0 / 0 | 11 / 1 / 0 | 7 / 3 / 2 |
| sonnet | 10 / 1 / 1 | 9 / 3 / 0 | 1 / 2 / 9 |

I read the no-rubric reasons. They are almost all some form of "more complete" or "more thorough", and SuperMD's answers are 31% to 40% shorter on these scenarios. LLM judges are known to favor longer, more structured answers, so this does not show that people would prefer the baseline. It does show that the claim "SuperMD wins blind judging" is true only for a judge told to value what SuperMD optimizes. The no-rubric judge on DeepSeek's answers still preferred SuperMD where one answer had a defect: the `frontend-perf` baseline invented changes and benchmark numbers, and the `retry-backoff-code` baseline put `raise_for_status()` inside its `try` block, which the judge flagged as a retry bug.

Read the claim as: SuperMD makes answers shorter, removes banned patterns, and reduces unsourced figures. Whether the shorter answer is the better answer depends on the reader. No human raters were used.

## What I checked by hand

- **Judge verdicts.** I read the reasons for all 19 module tasks the first judge scored as SuperMD losses. Twelve are about completeness: the SuperMD answer left out a requested piece, or declined or asked for inputs where the baseline wrote a scaffold with placeholders (over-caution again). Five are about accuracy: the judge says the SuperMD answer was wrong (`human-resources`, `corporate-law`, `plumbing`, `supply-chain-logistics`, `fleet-management`). Two are about concision or labeling. I checked one accuracy claim in full, `fleet-management`: the SuperMD answer says the 14-hour window is the binding constraint, but the driver has 1 hour 15 minutes of driving left and 1 hour 30 minutes of window, so the 11-hour limit binds. The judge was right and SuperMD's answer was wrong. SuperMD is not a correctness mechanism.
- **Unsourced and withheld labels.** I read 11 labeled examples across the categories. Ten matched without argument; one (a hedged `25–100 ft` range in `forestry`) is arguable. "Unsourced" means the answer named no source, not that the figure is wrong: the baseline's `$19,000` gift-tax exclusion and `ISO 286` k6 deviations are correct and were still labeled unsourced.
- **The 27 answers that went from giving a value to withholding.** I read 23 of them. In 12 the baseline gave a concrete value. Some of those values are stable and checkable, such as the ISO 286 deviations for a 40 mm k6 shaft, an AQL sample table, and the federal MCL for PCE, where refusing costs the user a lookup. Others are volatile or high-stakes, such as a union day rate or a pharmacy beyond-use date, where declining is right. In 9 the baseline also declined or asked for inputs and the judge's "gave a figure" label was wrong, usually because the answer listed example numbers. Two were borderline. SuperMD does not separate the two kinds of value.
- **Artifact losses.** Both come from SuperMD output that went beyond the material. The incident summary says checkout "was failing for most customers" at a 31% error rate and states a recovery cause the facts do not give. The docstring states a `ValueError` behavior that does not hold for the first interval.
- **Harness bugs found and fixed during the run.** Baseline answers were being cut off at 1,800 tokens and judged as incomplete, so the budget went to 4,096 and truncation is counted (1 of 103 baseline answers, 0 with SuperMD). The first README check flagged `-lw` and `-prefixed`, which were prose, not invented options; it now counts only long options, the README text is stored, and those six runs were repeated (all pass).

## Where it was weakest

By category on the 103 task answers (first judge, W / T / L): transportation-logistics 1 / 0 / 3, technology 8 / 4 / 4, marketing-sales 3 / 2 / 2, public-service 4 / 0 / 2. The categories are small (4 to 16 modules), so treat these as places to look first, not as established weaknesses. The full table is in [results.md](results.md).

## Limits

- One sample per cell. Claude generations are not run at temperature 0, and DeepSeek is not deterministic at temperature 0 either.
- The rubric result above. No human raters.
- Suite 1 uses DeepSeek to generate the prompts, the answers, and the first judge. The Claude judges are the cross-check, and they disagree with it on 40% of pairs (the two rubric judges give the same verdict on 62 of 103).
- Module prompts are written from each module's own limits, so they test the stated behavior.
- English only. The Indonesian tree has the 41-scenario eval and nothing here.
- Two model families (DeepSeek, Claude). No GPT, Gemini, or Opus runs, and no run in Codex, Cursor, or any harness other than Claude Code, so "works across agents" rests on the installer's documented paths and one live Claude Code check, not on measured behavior.
- The agent suite has four small tasks with an objective check that every run passed. It shows no harm to outcomes and a cost increase. It cannot show a gain, and it says nothing about long tasks.
- The model-written "gave a figure" label is noisy, as the audit above shows.

## What this suggests changing

These are not done here. A core change needs an eval run and a changelog entry under the repository rules.

1. **Withholding.** Keep the ban on unsourced values, and add to the core that for stable, well-known standard values (a published table, a regulatory limit) the answer gives the value, names the source, and says to confirm the edition. Then rerun suite 1 and look at the "gave a value and pointed to the source" row, which is the one that should rise.
2. **A neutral judge in the eval.** Add the no-rubric Claude judge to `eval/run-eval.mjs` so the win rate is reported under both.
3. **Weak categories.** Read the `technology` and `transportation-logistics` losses first.

## Reproduce

```bash
export DEEPSEEK_API_KEY=...        # generation for `deepseek` and the main judge
node eval/bench.mjs prompts         # once; the committed prompts are used otherwise
node eval/bench.mjs modules --judge2 --judge3
node eval/bench.mjs models  --judge2 --judge3
node eval/bench.mjs artifacts
node eval/bench.mjs agentic --reps 3
node eval/bench.mjs report --write
```

The Claude generators and judges need the `claude` CLI signed in. Each suite caches to `eval/results/bench-<suite>.json` and resumes; `--force` regenerates. Expect about $18 of Claude Code usage for the whole set.
