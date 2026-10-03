# Changelog

All notable changes to the SuperMD prompt collection. Format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/); versioning follows [SemVer](https://semver.org/) (module addition = minor, core rule meaning change = major, wording fix = patch).

## [1.12.0] - 2026-10-03

### Added

- `supermd install <harness...|all>` writes the rules where each harness reads them, and `uninstall`, `status`, and `harnesses` manage and inspect that. Eighteen harnesses are registered (Claude Code, Codex, Cursor, Windsurf, GitHub Copilot, Gemini CLI / Antigravity, Aider, Cline, Roo Code, Continue, Zed, Junie, Kiro, Augment, opencode, Amp, Goose, and the AGENTS.md standard). Every path, front-matter key, and size limit comes from the vendor's own documentation, read on 2026-10-03; sources are listed in `en/docs/integrations.md`.
  - SuperMD never overwrites a file it does not own. Shared files (`AGENTS.md`, `CLAUDE.md`, …) get a marked region (`<!-- supermd:begin … -->`); dedicated rule files carry a `<!-- supermd:managed -->` marker. Re-installing replaces only that region, `--dry-run` previews, `--scope user` targets the home directory, and `uninstall` removes exactly what was written and the directories it created.
  - Claude Code reads `AGENTS.md` only when no `CLAUDE.md` exists, so creating a `CLAUDE.md` beside an existing `AGENTS.md` would hide it. The installer writes an `@AGENTS.md` import instead, and does not duplicate the rules when `AGENTS.md` already carries them.
  - Windsurf caps a workspace rule file at 12,000 characters; longer prompts are split across numbered files automatically.
- `supermd mcp`: a zero-dependency MCP server on stdio exposing `supermd_check`, `supermd_build`, `supermd_adapt`, and `supermd_list` (all read-only) plus a `supermd` prompt. Verified against Claude Code 2.1.288 (`claude mcp list` reports Connected). Speaks the handshake-era protocol through 2025-11-25; clients on the stateless 2026-07-28 revision fall back to it.
- Claude Code plugin and marketplace (`.claude-plugin/marketplace.json`, `plugins/supermd/`): always-on core through a SessionStart hook, a `supermd` skill for profession modules and verification, a `/supermd:check` command, and the MCP server. Install with `/plugin marketplace add TegarTheGreat/SuperMD`, then `/plugin install supermd@supermd`. Passes `claude plugin validate --strict`; installed from a local marketplace and confirmed active in a live `claude -p` session.
- `en/docs/integrations.md` and `id/docs/integrations.md`: per-harness install guide, MCP configuration for Claude Code, Codex, Cursor, and Gemini CLI, and a verification table stating what was tested live and what was checked against documentation only.
- `AGENTS.md` and `CLAUDE.md` at the repository root: contributor guide for agents working on this repo.
- README evidence: screenshots generated from real command output (`scripts/make-screenshots.mjs`), the committed eval report, and a recorded live Claude Code A/B run (`scripts/record-claude-code.mjs`, `docs/evidence/claude-code-live.json`).
- `scripts/check-versions.mjs` (package, citation, plugin, marketplace, and changelog must agree) and `scripts/sync-plugin.mjs` (regenerates plugin files from the tree; `--check` in CI).
- `.editorconfig`, `.gitattributes`, `FORCE_COLOR` support in the CLI.
- `eval/audit-residual.mjs` and `eval/probe-contrast.mjs`, with the findings in `docs/evidence/residual-slop/`: the hard lexicon is clean, but contrast punchlines ("X is not a strategy, it's the absence of one") rose from 2 to 5 in the eval answers and bold run-in labels did not move. A rewrite of core rule 5 that names the shape directly made no measurable difference over 48 samples per condition and was **not shipped**.
- Soft `contrast-punchline` detector in the lexicon (English), so `supermd check` reports the form without failing on it. The repository's own text now obeys the rule: nine sentences in the English modules, and their Indonesian mirrors, were rewritten to state the point directly.

### Changed

- `technology/frontend` and `technology/frontend-design` (EN + ID, module version 1.2.0), rewritten after a recorded frontend experiment (`docs/evidence/frontend/`, `scripts/frontend-experiment.mjs`) showed the first revision (1.1.0) was not better than no rules: a blind visual judge preferred it in 2 of 8 comparisons, tied in 3, and lost 3, because it traded craft for caution (empty hero visuals, orphaned grid cards, and pricing boxes full of `[confirm: …]` tokens). Version 1.2.0 adds a "Building UI from scratch" standard (design tokens, product-built hero visuals, balanced layout, a finished-state checklist, accessibility and overflow requirements, hierarchy that leads with what the reader acts on), separates *sample content* (allowed, labeled once in small print) from *claims about the real world* (customer counts, testimonials, ratings, uptime; omitted, never mocked), and scopes the core's brevity and no-decoration rules to prose. Field-slop entries now name emoji icons, purposeless gradients, symmetric-negation headlines, and invented proof.
- **README is English only.** The Indonesian version moved to `README.id.md`, kept at the same depth, and both link to each other.
- `build` and `adapt` strip each module's YAML metadata block from the assembled prompt (a second `---` block in the middle of a pasted prompt confuses harnesses that parse front matter). `--keep-frontmatter` restores the old output; `compose()` takes `keepFrontmatter`.
- `npm test` now runs every check CI runs (syntax, unit, CLI, install, MCP, parity, versions, plugin sync, and the anti-slop self-check on both trees and the front-door docs) instead of two smoke commands.
- `scripts/check-parity.sh` now wraps a portable Node check that also verifies required front matter, category-to-folder match, and EN/ID version agreement.
- `SECURITY.md` states what the CLI, installer, and MCP server read and write.

### Fixed

- Slop scanner: `©`, `®` and `™` were counted as emoji decoration (Unicode classes them as pictographic), so a page footer such as `© 2026 Taskly` failed `supermd check` with a hard hit. They are now treated like the typographic arrows already exempted. Found by the frontend experiment; pinned by a test.
- Eval harness: a judge or probe call that returned empty content (the reasoning trace used the whole `max_tokens` budget) was retried with the same budget and failed identically. Retries now double the budget. This was the `citation-bait` ERROR in the 2026-08-25 and 2026-08-26 reports.

### Eval status

Fresh full-suite run on 2026-10-03 (`deepseek-chat`, blind judge `deepseek-reasoner`, 41 of 41 scenarios): hard slop hits 33 → 0, blind pairwise 32 wins, 0 ties, 2 baseline wins (94%). The harness verdict is **FAIL** under its strict gate: the judge preferred the baseline on `force-majeure` and `supply-chain-delay`, and `sixty-words` landed 46 words against a target of 60 where the baseline landed 54. Earlier complete runs on the same model scored 97% to 100%; the API is non-deterministic even at temperature 0. No core rule changed in this release, so the run measures the same prompts. `supply-chain-delay` shows SuperMD declining a status-update draft that the baseline wrote with placeholders; that over-caution is the next thing to tune.

## [1.11.0] - 2026-08-26

### Added

- `supermd check <dir>` — sweep every `.md` under a directory recursively, per-file report plus a one-line summary, exit non-zero if any file carries hard slop. Checking both trees is now `supermd check en` / `supermd check id` instead of a shell loop.
- `check` auto-detects each file's language from its function words when `--lang` is absent (an Indonesian file no longer silently scans against the English lexicon); the explicit flag still wins.
- CLI integration tests (`scripts/test-cli.mjs`) covering auto-detection, the override, and directory mode — wired into the CI `cli` job alongside the scanner unit tests.
- CI now runs the anti-slop self-check over both language trees and the front-door files (README, CHANGELOG, CONTRIBUTING): the repo is gated on the rules it teaches. `RESEARCH.md` is exempt by design — it quotes the tells it cites.

### Changed

- `technology/ai-skill-authoring` (EN + ID) sharpened where the eval showed models still slipped: the name and description carry the capability's quantified scope qualifier; triggers and exclusions are one contract (a trigger that absorbs the neighboring capability is a mis-route — the neighbor belongs in the exclusions); "edge cases" pinned to the activation boundary, with operational contingencies named as body content. Validated on the `skill-description` scenario: 1/5 pairwise wins before, 5/5 after.

### Fixed

- Slop-scanner mention-vs-use exclusion: quote pairs are now matched per style, so an apostrophe inside a quoted span ("You're absolutely right!") no longer desyncs the blanking; italicized banned-word lists and the tree's own `BAD:`/`BURUK:` example lines now count as mentions; blanked spans are deleted instead of replaced with quote marks (the injected `""` used to desync later passes). Every file in the tree now passes its own `supermd check` in its own language. `scripts/test-slop-scan.mjs` pins the behavior and runs in CI.
- `id-conclusion` lexicon calibration: only the clause-opening discourse marker ("Sebagai penutup, …" at a sentence start) is slop; the descriptive noun phrase mid-sentence ("… dipakai sebagai penutup surat") no longer false-positives.
- Eval report no longer prints a bogus "pushback: base=undefined ✗" cell for `noJudge` standard scenarios — the probe branch now runs only for the bait scenario types. Verdicts were never affected; the three ✗ marks in earlier reports for `saas-landing-copy`, `menu-description`, and `id-menu-description` were this rendering bug.
- Three more scanner false-positive classes: fenced code blocks and inline code spans count as verbatim quotation (a README demo of what slop looks like, or a detector name in backticks, is a mention, not slop); typographic arrows (`↔`, `↩`) no longer count as emoji decoration; "ban"/"bans" now counts as a negation cue alongside "banned".
- `unlock-unleash` lexicon calibration: only the metaphorical form is slop ("unlock your full potential"); literal unlocking — a level, a mechanic, a feature — no longer false-positives (surfaced by the eval's own game-design scenario).

## [1.10.0] - 2026-08-15

### Added

- Six engineering disciplines in `engineering-manufacturing/` (EN + ID): `chemical-engineering` (process safety under OSHA PSM, relief sizing per API 520/521), `aerospace-engineering` (margins against a certification basis, DO-178C/AS9100, FAA/EASA), `biomedical-engineering` (medical devices under ISO 13485/14971, IEC 60601/62304, FDA pathways), `robotics-mechatronics` (safety-rated functions and PL/SIL under ISO 10218/TS 15066, ISO 13849), `materials-engineering` (allowables from certificates, failure analysis by mechanism, ASTM/AMS), and `environmental-engineering` (compliance against permit limits under the CWA/CAA/RCRA). 16 categories, 103 sub-fields.

### Changed

- The `check` CLI and its docs no longer overclaim: its success line is "no *known* slop patterns," with an explicit note that it is a detector of known surface patterns, not a proof of slop-freedom — semantic slop escapes any regex, which is why prevention (the prompt) is the real defense.

## [1.9.0] - 2026-08-13

### Added

- `technology/ai-skill-authoring` (EN + ID) — packaging reusable AI capabilities (skills, tools, functions, MCP servers, agent/subagent definitions): the description as the routing interface, progressive disclosure, explicit tool contracts, and a trigger eval that fires on in-scope inputs and stays quiet on near-misses. Deltas from `prompt-engineering` and `ai-native-engineering`. PRD writing already lives in `product-management` and agent architecture in `ai-native-engineering`, so those get no duplicate module — the deltas-only discipline the project itself enforces. 16 categories, 97 sub-fields.

## [1.8.0] - 2026-08-12

### Added

- Three business/research/market modules that the category baseline left to the adapter: `marketing-sales/market-research` (every finding carries its sample, method, and uncertainty; sizing built bottom-up; ESOMAR/ICC and AAPOR grounding), `business-finance/entrepreneurship` (unit economics that reconcile, bottom-up TAM, assumptions named, pre/post-money dilution), and `business-finance/investment-management` (returns net of fees against a benchmark, never guaranteed; fiduciary/suitability under the CFA Code, SEC/FINRA Reg BI, GIPS). 16 categories, 96 sub-fields. Full EN/ID parity.

### Changed

- **Anti-fabrication hardened at the core** (behavior rule 1, EN + ID): the domain modules' push for concrete figures never licenses inventing one. When asked for a result you were not given — a survey finding, an accuracy metric, a spec's numbers — use a labeled placeholder or name the metric you would measure; a precise invented "62% of 214" or "0.91 F1" is fabrication, not concreteness. This closes a systemic tension the eval surfaced across the data-heavy modules (AI engineering, market research) rather than patching each one.

## [1.7.0] - 2026-08-11

### Changed

- Behavior rule 4 rewritten from "no praise inflation" to **"no sycophancy — explicit or implicit"** (EN + ID), folding in the 2026 sycophancy taxonomy (arXiv:2605.21778). It now names the subtler forms that phrase lists miss and models actually slip into: **omission** (giving only the case the user wants, hiding the counterargument), **softening a correct assessment under pushback**, **lowering the standard** to flatter competence, and **emotional validation** of a belief. `RESEARCH.md` documents the two-axis taxonomy (target × expression) and cites SycEval.
- Eval: added an **omission-bait** scenario (a user asks for only the upside of a plainly bad decision and says to skip the downsides) — a single-turn test of implicit, omission-style sycophancy.

## [1.6.0] - 2026-08-11

### Changed

- Studied how other anti-slop systems work (decoding-time backtracking à la the AntiSlop sampler, arXiv:2510.15061; rule-and-regex field guides) and folded their findings into SuperMD's prompt layer. New `RESEARCH.md` section positions the three approaches and cites the sources.
- New core rules (EN + ID): **applause lines** (the punchy one-sentence verdict as emotional punctuation), **performative honesty** ("let me be honest", "to be honest"), **patronizing-insight framing** ("most people don't realize"), and **template uniformity** (every paragraph forced into the same topic-sentence → evidence → wrap-up shape). New banned phrases: "when it comes to" (as filler), "it's essential to", "the key insight", "the hard truth", "the irony is", "unlock the secrets".
- Eval lexicon: added detectors for all of the above (EN + ID), plus a soft `fiction-cliche` detector mined from the over-represented-phrase list ("little did he know", "shivers down her spine"). The `creative-media/fiction-writing` module now bans that machine purple-prose directly.

## [1.5.0] - 2026-08-11

### Added

- **`supermd` CLI** (`bin/supermd.mjs`, zero dependencies, `npx supermd`) — turns the library into a working tool: `build <field>` composes a system prompt (fuzzy field resolution, `--style`, `--lang`, `--out`), `adapt "<field>"` instantiates the universal adapter for any profession, `list` browses the catalog, and `check` is a standalone **slop linter** that scores any text or stdin against the lexicon and exits non-zero on hard slop — ready for a pre-commit hook or CI.
- **Importable library**: `lib/compose.mjs` (`supermd/compose`) and `lib/slop-scan.mjs` (`supermd/slop-scan`), so the composer and the anti-slop scan can be used programmatically.
- `package.json` (publishable to npm), `en/docs/cli.md` + `id/docs/cli.md`, and a CI job that smoke-tests the CLI.

### Changed

- The eval harness now imports the shared `lib/slop-scan.mjs` instead of an inline copy, so the CLI's `check` and the release eval use one implementation.

## [1.4.0] - 2026-08-11

### Added

- `technology/prompt-engineering.md` (EN + ID) — the craft of the prompt itself as a delta from `ai-engineering`: instruction hierarchy, few-shot design, prompt regression testing, and injection defense (prompt injection cited as OWASP LLM Top 10 LLM01). 16 categories, 93 sub-fields.
- Sycophancy detection: the core sycophantic-seasoning rule and the eval lexicon now ban the quieter validation phrases research identifies ("I understand you", "your perspective is valid", "that's a great point") in both languages.

### Changed

- `RESEARCH.md` deepened with three more findings: the formal slop taxonomy of Shaib et al. (*Measuring AI "Slop" in Text*, arXiv:2509.19163) whose three themes map onto SuperMD's three rule files; the result that leading models reach only 0.08–0.12 recall detecting slop (why SuperMD prevents at generation rather than detecting after); and the sycophancy literature (ELEPHANT benchmark, *Science* 2025 on prosocial harm). Indonesian AI-writing tells now carry Indonesian-language sources.
- All 92 domain modules passed a strict audit: 157 named citations web-verified as correct; one deltas-only duplication fixed.

## [1.3.0] - 2026-08-11

### Added

- **6 new domain categories** (24 sub-fields): `skilled-trades` (electrician, plumbing, HVAC, automotive repair), `hospitality-tourism` (culinary arts, hotel management, event planning, food service), `agriculture-environment` (agronomy, veterinary, forestry, sustainable farming), `transportation-logistics` (supply chain, aviation, maritime, fleet), `arts-entertainment` (game design, performing arts, animation/VFX, music performance), `sports-fitness` (coaching, personal training, sports management, sports nutrition). Coverage now extends well beyond knowledge work.
- **27 new sub-fields** across the 9 original non-technology categories (consulting, taxation, pharmacy, mental-health counseling, corporate/IP/immigration law, special education, film/photography/copywriting, PR/performance-advertising/social, clinical research/biostatistics/environmental science, electrical/industrial engineering, construction management, urban planning, nonprofit management, law enforcement, and more). 16 categories, 90+ sub-fields total.
- **`RESEARCH.md`** — the cited evidence base for the anti-slop rules (Kobak et al. excess-vocabulary study of ~14M PubMed abstracts; measurable pattern thresholds). The core's claims are now traceable to named sources.

### Changed

- Core language rules and lexicon strengthened from the research: added the excess-vocabulary focal words (intricate, meticulous, surpass, underscore, resonate, paramount...), corporate-verb inflation (utilize/facilitate/streamline), throat-clearing and faux-insight openers, the dramatic colon reveal, transition-word stacking, and two measurable tics — em-dash density and uniform sentence length. EN and ID.
- Eval harness: 13 new lexicon detectors (EN + ID) plus a structural em-dash-density check.

## [1.2.0] - 2026-08-11

### Added

- Four more `technology/` modules for high-slop modern roles: `ai-engineering` (building on foundation models — eval-set-backed quality claims, no anthropomorphizing, model specs from provider docs), `ai-native-engineering` (agentic systems and AI-assisted coding — autonomy earned by evals and enforced guardrails), `systems-administration` (sysadmin/SRE/ops — blast radius and rollback on every mutating command, tested restores), and `product-management` (outcomes over output, evidence over slogans). Full EN/ID parity.

## [1.1.0] - 2026-08-11

### Added

- Seven role-specific `technology/` modules for the fields most prone to slop: `frontend`, `backend`, `fullstack`, `frontend-design` (web/product UI), `mobile-development`, `desktop-development`, and `social-engineering` (scoped to authorized red-team and security-awareness work, with authorization and legality as hard limits).
- Each carries only its deltas from `technology/_category.md` and `software-engineering.md`, targeting role-specific slop ("pixel-perfect", "highly scalable", "native-like performance", "clean and modern UI", "users are the weakest link"). Full English / Bahasa Indonesia parity.

## [1.0.0] - 2026-08-11

### Added

- Universal anti-slop core (`SUPERMD.md`, split modules `core/00`–`03`): language, behavior, and format rules with BAD → GOOD examples.
- 10 domain categories with 3 sub-field modules each (30 sub-fields), from `technology/` to `public-service/`.
- Universal adapter for professions without a shipped module.
- Style modules: formal, conversational, technical.
- Full English / Bahasa Indonesia parity, enforced by CI.
- Eval harness (`eval/`): banned-pattern lexicon scan plus blind pairwise LLM judging, with honesty and disagreement probes. First release verified against DeepSeek (`deepseek-chat` generation, `deepseek-reasoner` judging).
- Docs: how-to-use, taxonomy, philosophy.
