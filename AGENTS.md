# AGENTS.md

Guide for AI coding agents (and humans) working on this repository. SuperMD is a Markdown prompt library, mirrored in English and Bahasa Indonesia, with a zero-dependency Node CLI on top.

## Layout

- `en/`, `id/` — two mirrored trees. `SUPERMD.md` is the assembled core, `core/` the same rules split by concern, `domains/<category>/` the 103 field modules, `styles/` and `adapters/` the optional layers.
- `bin/supermd.mjs`, `lib/` — the CLI and its importable modules (`compose`, `slop-scan`, `harnesses`, `mcp`).
- `eval/` — the anti-slop test harness (`run-eval.mjs`) and the broader benchmark (`bench.mjs`). `eval/results/` holds generated reports and raw benchmark data; never edit them by hand.
- `plugins/supermd/` and `.claude-plugin/` — the Claude Code plugin and marketplace manifest. Generated parts are marked and checked in CI.
- `scripts/` — tests and checks. `docs/` — screenshots and recorded evidence for the README.

## Commands

```bash
npm test                          # every check below, in order
node scripts/check-parity.mjs     # en/ and id/ hold the same files with consistent front matter
node bin/supermd.mjs check en     # the anti-slop self-check; also run it on id/ and the front-door docs
node scripts/sync-plugin.mjs      # regenerate plugin files after changing the core or the version
```

## Rules for changes

1. **Every file obeys the rules it teaches.** `supermd check <path>` must report no hard slop for anything you write. `RESEARCH.md` is the one exemption, because it quotes the tells it cites.
2. **Both languages, always.** A change under `en/` needs the matching change under `id/`, with the same structure and meaning. `check-parity.mjs` enforces paths and front matter, not translation quality.
3. **Domain modules state only deltas** from their category and from the core. Named regulations and standards must be real; when unsure, write the generic form.
4. **The Markdown tree is the source of truth.** The CLI, the plugin, and the screenshots derive from it. Do not copy prompt text into code.
5. **No runtime dependencies.** `package.json` declares none and CI keeps it that way. Node 18+.
6. **Do not weaken a core rule to make a test pass.** Core changes need an eval run (`node eval/run-eval.mjs`) and a `CHANGELOG.md` entry.
7. Version bumps touch `package.json`, `CITATION.cff`, and the plugin manifests together; `npm test` fails if they disagree.
