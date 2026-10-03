// The harness registry: where each AI coding harness reads always-on
// instructions. Data only — lib/harnesses.mjs does the writing.
//
// Each target: { scope: 'project'|'user', path, mode: 'block'|'owned', … }
//   block    — shared Markdown file; SuperMD owns only its marked region
//   owned    — dedicated file SuperMD writes whole (`frontmatter` is emitted first)
//   maxChars — per-file character cap the harness enforces (the prompt is split)
// Paths starting with `~/` resolve against the user's home directory.
//
// Every path, front-matter key, and limit below was read from the vendor's own
// documentation on 2026-10-03; en/docs/integrations.md lists the source page
// for each. A harness with no `user` target has no documented user-level file.

const AGENTS_MD = { scope: 'project', path: 'AGENTS.md', mode: 'block' };

export const HARNESSES = [
  {
    id: 'agents-md',
    name: 'AGENTS.md',
    aliases: ['agents', 'agentsmd'],
    note: 'Open standard. Read natively by Codex, Cursor, Copilot, Windsurf, Amp, opencode, Zed, Junie, Goose, Kiro, Cline, Roo Code, Augment and more.',
    targets: [AGENTS_MD],
  },
  {
    id: 'claude-code',
    name: 'Claude Code',
    aliases: ['claude', 'claudecode'],
    note: 'Reads CLAUDE.md. It reads AGENTS.md only when no CLAUDE.md exists, so SuperMD bridges the two with an @AGENTS.md import.',
    targets: [
      { scope: 'project', path: 'CLAUDE.md', mode: 'block' },
      { scope: 'user', path: '~/.claude/CLAUDE.md', mode: 'block' },
    ],
  },
  {
    id: 'codex',
    name: 'Codex',
    aliases: ['openai-codex', 'codex-cli'],
    note: 'Reads AGENTS.md; all AGENTS.md files together are capped at 32 KiB (project_doc_max_bytes).',
    targets: [
      AGENTS_MD,
      { scope: 'user', path: '~/.codex/AGENTS.md', mode: 'block' },
    ],
  },
  {
    id: 'cursor',
    name: 'Cursor',
    note: 'Project rules must be .mdc files. User rules live in Settings → Rules, not in a file.',
    targets: [
      {
        scope: 'project', path: '.cursor/rules/supermd.mdc', mode: 'owned',
        frontmatter: { description: 'SuperMD anti-slop rules: no filler, no invented facts, no sycophancy', alwaysApply: true },
      },
    ],
    userNote: 'Cursor keeps user-level rules in Settings → Rules; paste the output of `supermd build --core-only` there.',
  },
  {
    id: 'windsurf',
    name: 'Windsurf',
    aliases: ['devin', 'devin-desktop'],
    note: 'Now Devin Desktop. Workspace rule files are capped at 12,000 characters each, so longer prompts are split across files.',
    targets: [
      { scope: 'project', path: '.windsurf/rules/supermd.md', mode: 'owned', frontmatter: { trigger: 'always_on' }, maxChars: 12000 },
    ],
    userNote: 'Windsurf caps the single global rules file at 6,000 characters, below the core; install per project instead.',
  },
  {
    id: 'copilot',
    name: 'GitHub Copilot',
    aliases: ['github-copilot', 'vscode-copilot'],
    note: 'Repository-wide instructions. Copilot CLI also reads the user-level file.',
    targets: [
      { scope: 'project', path: '.github/copilot-instructions.md', mode: 'block' },
      { scope: 'user', path: '~/.copilot/copilot-instructions.md', mode: 'block' },
    ],
  },
  {
    id: 'gemini-cli',
    name: 'Gemini CLI / Antigravity',
    aliases: ['gemini', 'antigravity', 'agy'],
    note: 'Both read GEMINI.md. Antigravity caps each rule file at 24,000 bytes.',
    targets: [
      { scope: 'project', path: 'GEMINI.md', mode: 'block' },
      { scope: 'user', path: '~/.gemini/GEMINI.md', mode: 'block' },
    ],
  },
  {
    id: 'aider',
    name: 'Aider',
    note: 'Aider does not auto-load CONVENTIONS.md; load it with --read or a read: key in .aider.conf.yml.',
    targets: [{ scope: 'project', path: 'CONVENTIONS.md', mode: 'block' }],
    after: () => ['Aider does not load it automatically: run `aider --read CONVENTIONS.md`, or add `read: CONVENTIONS.md` to .aider.conf.yml'],
  },
  {
    id: 'cline',
    name: 'Cline',
    note: 'A rule file without front matter is always active.',
    targets: [
      { scope: 'project', path: '.clinerules/supermd.md', mode: 'owned' },
      { scope: 'user', path: '~/.cline/rules/supermd.md', mode: 'owned' },
    ],
  },
  {
    id: 'roo',
    name: 'Roo Code',
    aliases: ['roo-code'],
    targets: [
      { scope: 'project', path: '.roo/rules/supermd.md', mode: 'owned' },
      { scope: 'user', path: '~/.roo/rules/supermd.md', mode: 'owned' },
    ],
  },
  {
    id: 'continue',
    name: 'Continue',
    aliases: ['continue-dev'],
    targets: [
      { scope: 'project', path: '.continue/rules/supermd.md', mode: 'owned', frontmatter: { name: 'SuperMD', alwaysApply: true } },
    ],
    userNote: 'Continue documents no user-level rules directory; reference the project file from config.yaml if you want it everywhere.',
  },
  {
    id: 'zed',
    name: 'Zed',
    note: 'Zed uses the first match in its list (.rules, .cursorrules, …, AGENTS.md), so .rules wins.',
    targets: [
      { scope: 'project', path: '.rules', mode: 'block' },
      { scope: 'user', path: '~/.config/zed/AGENTS.md', mode: 'block' },
    ],
  },
  {
    id: 'junie',
    name: 'JetBrains Junie',
    aliases: ['jetbrains'],
    targets: [
      { scope: 'project', path: '.junie/AGENTS.md', mode: 'block' },
      { scope: 'user', path: '~/.junie/AGENTS.md', mode: 'block' },
    ],
  },
  {
    id: 'kiro',
    name: 'Kiro',
    targets: [
      { scope: 'project', path: '.kiro/steering/supermd.md', mode: 'owned', frontmatter: { inclusion: 'always' } },
      { scope: 'user', path: '~/.kiro/steering/supermd.md', mode: 'owned', frontmatter: { inclusion: 'always' } },
    ],
  },
  {
    id: 'augment',
    name: 'Augment',
    aliases: ['augment-code', 'auggie'],
    note: 'Workspace guidelines and rules are capped at 49,512 characters in total; user guidelines at 24,576.',
    targets: [
      { scope: 'project', path: '.augment/rules/supermd.md', mode: 'owned', frontmatter: { type: 'always_apply' } },
      { scope: 'user', path: '~/.augment/rules/supermd.md', mode: 'owned', frontmatter: { type: 'always_apply' } },
    ],
  },
  {
    id: 'opencode',
    name: 'opencode',
    targets: [
      AGENTS_MD,
      { scope: 'user', path: '~/.config/opencode/AGENTS.md', mode: 'block' },
    ],
  },
  {
    id: 'amp',
    name: 'Amp',
    targets: [
      AGENTS_MD,
      { scope: 'user', path: '~/.config/amp/AGENTS.md', mode: 'block' },
    ],
  },
  {
    id: 'goose',
    name: 'Goose',
    targets: [
      { scope: 'project', path: '.goosehints', mode: 'block' },
      { scope: 'user', path: '~/.config/goose/.goosehints', mode: 'block' },
    ],
  },
];
