# Changelog

All notable changes to the SuperMD prompt collection. Format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/); versioning follows [SemVer](https://semver.org/) (module addition = minor, core rule meaning change = major, wording fix = patch).

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
