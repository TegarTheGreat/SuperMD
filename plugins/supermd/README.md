# SuperMD for Claude Code

Always-on anti-slop rules for Claude Code, plus profession modules, a slop linter, and MCP tools.

```text
/plugin marketplace add TegarTheGreat/SuperMD
/plugin install supermd@supermd
```

| Component | What it does |
|---|---|
| `hooks/` | A SessionStart hook injects the English core (`rules/core.md`) into every session. Claude Code truncates hook context at 10,000 characters; the core is about 9,000. For Bahasa Indonesia use `npx supermd install claude-code --lang id` instead. |
| `skills/supermd/` | Fetches a profession module (`supermd_build`) or builds one on the spot (`supermd_adapt`), and verifies drafts with `supermd_check`. |
| `commands/check.md` | `/supermd:check <file>` lints a file and fixes what it flags. |
| `.mcp.json` | Starts `npx -y supermd@latest mcp`, which serves the four tools to the agent. |

`rules/core.md` and the versions in the manifests are generated from the Markdown tree by `node scripts/sync-plugin.mjs`; CI fails when they are stale. Full guide: [integrations](../../en/docs/integrations.md).
