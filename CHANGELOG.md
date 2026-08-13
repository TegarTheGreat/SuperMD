# Changelog

All notable changes to the SuperMD prompt collection. Format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/); versioning follows [SemVer](https://semver.org/) (module addition = minor, core rule meaning change = major, wording fix = patch).

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
