---
description: Lint a file, a directory, or pasted text for AI-slop patterns, then fix what it flags
argument-hint: <file | directory>
allowed-tools: Bash(npx -y supermd@latest check:*)
---

Run `npx -y supermd@latest check $ARGUMENTS` and read the report.

For every hard hit, rewrite the flagged passage with the specific fact it was hiding, or delete it. Leave soft hits alone unless the fix is obvious. Re-run the check on the edited file and report the before and after hard-hit counts.

The linter detects known surface patterns only. Passing it does not prove the text is free of slop, so also apply the deletion test: if a sentence can go without losing information, delete it.
