# What slop survives SuperMD

The hard lexicon says SuperMD removes unambiguous slop: 33 hard hits in the baseline answers, none with SuperMD, in every full eval run. That says nothing about forms the lexicon does not gate. This page audits those, with the numbers, including what did not work.

## Audit of the latest eval report

`node eval/audit-residual.mjs` compares baseline and SuperMD outputs per 1,000 words on four forms. The counts are regex counts without judgment, and bold run-in labels are often legitimate structure in specs and runbooks, so read the table as "what moved", not as a slop score.

| form | baseline count | SuperMD count | baseline per 1k words | SuperMD per 1k words |
|---|---|---|---|---|
| contrast punchline | 2 | 5 | 0.20 | 0.70 |
| bold run-in label | 82 | 70 | 8.07 | 9.75 |
| rhetorical-question opener | 2 | 0 | 0.20 | 0.00 |
| stacked transition opener | 2 | 0 | 0.20 | 0.00 |

What it shows:

- **Stacked transitions and rhetorical-question openers are gone** (2 and 2 in the baseline, 0 with SuperMD). The rules work where they name a concrete phrase.
- **Contrast punchlines went up, not down.** "X is not a strategy, it's the absence of one" appeared 2 times in the baseline answers and 5 with SuperMD, concentrated in the forceful-pushback scenario (`flawed-plan-bait`), where the model is told to disagree. The core already bans "It's not just X — it's Y"; the model keeps the shape and changes the words.
- **Bold run-in labels did not move** (8.1 versus 9.8 per 1,000 words). Rule 6 targets the decorative version, and the line between a decorative label and a useful one (a clause topic, a runbook step) is a judgment the rule text does not make. The repository's own modules use bold run-in labels for their six slots. This is open: SuperMD neither detects nor reduces it.

## Did a sharper rule fix the punchlines?

No, so it was not shipped. The probe (`eval/probe-contrast.mjs`) samples eight critique and decision prompts six times each at temperature 0.7, with the core as it was and with rule 5 rewritten to name the shape directly ([the rewrite](residual-slop/core-b-rejected-rule.md)), and counts the pattern with the same detector `supermd check` uses.

| condition | outputs | punchlines | per 1,000 words |
|---|---|---|---|
| core as shipped | 48 | 7 | 0.54 |
| rule 5 rewritten | 48 | 8 | 0.63 |

The difference is noise. The pattern appeared in two of the eight prompts in both conditions, the two that demand the harshest criticism. Rewording the rule does not change it; raw data is in [`probe-contrast.json`](residual-slop/probe-contrast.json).

## What shipped instead

- A soft `contrast-punchline` detector in the lexicon, so `supermd check` reports the form. It is soft by design: a hash is not encryption, and saying so is fine.
- The repository's own text now obeys the rule it teaches. Nine sentences in the English modules and their Indonesian mirrors used the construct ("an unbalanced entry is not a draft, it is nothing") and were rewritten to state the point directly. The detector found them.

## Reproduce

```bash
node eval/audit-residual.mjs eval/results/2026-10-03-deepseek-chat.md
DEEPSEEK_API_KEY=... node eval/probe-contrast.mjs --a git:HEAD --b docs/evidence/residual-slop/core-b-rejected-rule.md
```
