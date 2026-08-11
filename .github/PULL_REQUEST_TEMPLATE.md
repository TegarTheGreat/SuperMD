<!-- Thanks for contributing. The checklist below is what review will check anyway — self-checking saves a round trip. -->

## What this PR changes

<!-- One or two sentences. Which files, which fields, why. -->

## Checklist

- [ ] Both language trees updated: every changed/added path exists in `en/` **and** `id/` with identical structure (`bash scripts/check-parity.sh` passes) — or the PR is labeled `needs-translation`.
- [ ] Front-matter present and valid on every content file: `name`, `category`, `version`, `summary`.
- [ ] The text obeys the rules it teaches: no filler, no banned vocabulary, no decorative lists, deletion test applied (see `en/SUPERMD.md`).
- [ ] Every named regulation/standard is real, or written in the generic honest form. No invented citations.
- [ ] Sub-field modules contain only deltas from their `_category.md` — no repetition of parent or core.
- [ ] `npx markdownlint-cli2 "**/*.md"` passes locally.
- [ ] Core rule changes only: `CHANGELOG.md` updated and eval run results included in the PR description.
