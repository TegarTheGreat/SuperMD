---
name: Integrations
category: docs
version: 1.0.0
summary: Installing SuperMD into Claude Code, Codex, Cursor, and fifteen other agent harnesses, plus the MCP server and the library API.
---

# Integrations

SuperMD is plain Markdown, so any harness that reads an instruction file can use it. `supermd install` writes the rules to the file each harness actually reads, in the shape it expects, without touching anything you wrote.

```bash
npx supermd install claude-code codex            # this project
npx supermd install claude-code --scope user     # every project, via your home directory
npx supermd install cursor --field backend       # core plus the Backend module
npx supermd install all --dry-run                # preview every harness, write nothing
npx supermd status                               # what is installed, and whether it is current
npx supermd uninstall all                        # remove exactly what was written
```

| Option | Effect |
|---|---|
| `--field NAME` | Add a profession module after the core (`supermd list` shows the names). Without it, only the core is installed. |
| `--style NAME` | Pin a register: `formal`, `conversational`, or `technical`. |
| `--lang en\|id` | English (default) or Bahasa Indonesia. |
| `--scope project\|user` | Project root (default) or your home directory. |
| `--dir PATH` | Project root other than the current directory. |
| `--dry-run` | Print the plan; write nothing. |
| `--force` | Overwrite or delete a dedicated rule file that SuperMD did not write. |

## What gets written

Run `supermd harnesses` for the live list. Every path, front-matter key, and size limit below comes from the vendor's own documentation, read on 2026-10-03.

| Harness (`id`) | Project file | User file | Notes |
|---|---|---|---|
| AGENTS.md (`agents-md`) | `AGENTS.md` | none | Open standard. Read natively by Codex, Cursor, Copilot, Windsurf, Amp, opencode, Zed, Junie, Goose, Kiro, Cline, Roo Code, and Augment. |
| Claude Code (`claude-code`) | `CLAUDE.md` | `~/.claude/CLAUDE.md` | Reads `AGENTS.md` only when no `CLAUDE.md` exists; see the bridge below. |
| Codex (`codex`) | `AGENTS.md` | `~/.codex/AGENTS.md` | All `AGENTS.md` files together are capped at 32 KiB (`project_doc_max_bytes`). |
| Cursor (`cursor`) | `.cursor/rules/supermd.mdc` | none | Written with `alwaysApply: true`. A plain `.md` in that folder is ignored. User rules live in Settings → Rules. |
| Windsurf (`windsurf`) | `.windsurf/rules/supermd.md` | none | Written with `trigger: always_on`. A workspace rule file is capped at 12,000 characters, so the core plus a module is split across numbered files. The global file is capped at 6,000, below the core. |
| GitHub Copilot (`copilot`) | `.github/copilot-instructions.md` | `~/.copilot/copilot-instructions.md` | The user file applies to Copilot CLI. |
| Gemini CLI / Antigravity (`gemini-cli`) | `GEMINI.md` | `~/.gemini/GEMINI.md` | Both read `GEMINI.md`. Antigravity truncates a rule file past 24,000 bytes. |
| Aider (`aider`) | `CONVENTIONS.md` | none | Aider does not load it by itself: run `aider --read CONVENTIONS.md` or add `read: CONVENTIONS.md` to `.aider.conf.yml`. |
| Cline (`cline`) | `.clinerules/supermd.md` | `~/.cline/rules/supermd.md` | A rule file without front matter is always active. |
| Roo Code (`roo`) | `.roo/rules/supermd.md` | `~/.roo/rules/supermd.md` | Files load in alphabetical order. |
| Continue (`continue`) | `.continue/rules/supermd.md` | none | Written with `alwaysApply: true`. |
| Zed (`zed`) | `.rules` | `~/.config/zed/AGENTS.md` | Zed uses the first match in its list, and `.rules` comes first. |
| JetBrains Junie (`junie`) | `.junie/AGENTS.md` | `~/.junie/AGENTS.md` | |
| Kiro (`kiro`) | `.kiro/steering/supermd.md` | `~/.kiro/steering/supermd.md` | Written with `inclusion: always`. |
| Augment (`augment`) | `.augment/rules/supermd.md` | `~/.augment/rules/supermd.md` | Written with `type: always_apply`. Workspace rules are capped at 49,512 characters in total. |
| opencode (`opencode`) | `AGENTS.md` | `~/.config/opencode/AGENTS.md` | |
| Amp (`amp`) | `AGENTS.md` | `~/.config/amp/AGENTS.md` | |
| Goose (`goose`) | `.goosehints` | `~/.config/goose/.goosehints` | |

Several harnesses can share one file. `supermd install codex amp opencode` writes `AGENTS.md` once.

## What the installer guarantees

- **It never overwrites your content.** In a shared file (`AGENTS.md`, `CLAUDE.md`, `GEMINI.md`, …) SuperMD owns only the region between `<!-- supermd:begin … -->` and `<!-- supermd:end -->`. Installing again replaces that region and nothing else.
- **It never takes over a file it does not own.** A dedicated rule file carries a `<!-- supermd:managed … -->` marker. If a file with that name exists without the marker, install stops with a conflict, and uninstall leaves it alone, unless you pass `--force`.
- **It undoes itself.** `uninstall` removes the region or the file, and deletes directories it created once they are empty. A file that held only the SuperMD block is deleted.
- **It is reviewable.** `--dry-run` prints the plan, and every change is an ordinary file change for `git diff`. Pin the version for a team with `npx supermd@1.12.0 install …`.

### The Claude Code bridge

Claude Code reads `AGENTS.md` only when no `CLAUDE.md` exists. If a repository has an `AGENTS.md` for Codex and you add a `CLAUDE.md`, Claude Code stops reading `AGENTS.md`. The installer prevents that. When it creates a `CLAUDE.md` next to an existing `AGENTS.md`, the new file starts with an `@AGENTS.md` import. When `AGENTS.md` already carries the SuperMD block, the import alone is written, so the rules are not loaded twice.

### Avoiding duplicates

Cursor, Copilot, Windsurf, and several others read `AGENTS.md` as well as their own file. Installing both loads the rules twice, which costs context and gains nothing. For a team on several tools, the lean setup is `supermd install agents-md claude-code`: one `AGENTS.md` for everything that reads it, and a `CLAUDE.md` that imports it.

## Claude Code

Three mechanisms, which combine freely:

1. **Rules file.** `npx supermd install claude-code` writes `CLAUDE.md`; add `--scope user` for `~/.claude/CLAUDE.md`. Works for both languages.
2. **Plugin.** Always-on core, a `supermd` skill for profession modules, a `/supermd:check` command, and the MCP server:

   ```text
   /plugin marketplace add TegarTheGreat/SuperMD
   /plugin install supermd@supermd
   ```

   The plugin injects the English core at session start. Claude Code truncates that injection at 10,000 characters and the Indonesian core is 10.5k, so for Indonesian use the rules file (`--lang id`).
3. **MCP tools.** `claude mcp add supermd -- npx -y supermd mcp` gives the agent `supermd_check` to lint its own drafts.

## MCP server

`supermd mcp` runs a local stdio server with four read-only tools and one prompt. It makes no network requests and writes nothing.

| Tool | Purpose |
|---|---|
| `supermd_check` | Lint text. Returns hard hits (unambiguous slop) and soft hits, with counts. The agent rewrites until there are no hard hits. |
| `supermd_build` | Return the core, plus a profession module and a style when given. |
| `supermd_adapt` | Return the core and the universal adapter for a profession with no module. |
| `supermd_list` | List the shipped modules. |

It speaks the handshake-era protocol through revision 2025-11-25. Clients on the stateless 2026-07-28 revision probe `server/discover`, receive a method-not-found error, and fall back to `initialize`, as that revision's backward-compatibility rules require.

| Harness | Add the server |
|---|---|
| Claude Code | `claude mcp add supermd -- npx -y supermd mcp` |
| Codex | `codex mcp add supermd -- npx -y supermd mcp` |
| Cursor | In `.cursor/mcp.json` or `~/.cursor/mcp.json`: `{"mcpServers": {"supermd": {"command": "npx", "args": ["-y", "supermd", "mcp"]}}}` |
| Gemini CLI | The same `mcpServers` object under `mcpServers` in `.gemini/settings.json` |
| Any other MCP client | Command `npx`, arguments `-y supermd mcp`, transport stdio |

## Use it as a library

For a harness without an instruction file, or your own agent, compose the prompt in code and pass it as the system prompt:

```js
import { compose } from 'supermd/compose';
import { scan } from 'supermd/slop-scan';
import { planInstall, applyPlan } from 'supermd/harnesses';

const { prompt } = compose({ field: 'backend', style: 'technical', lang: 'en' });
// pass `prompt` as the system message of any chat API

const hits = scan(draft, 'en');   // { hard: [...], soft: [...] }
```

## Verification status

| What | Status |
|---|---|
| Claude Code 2.1.288: `CLAUDE.md` install | Tested live. A recorded A/B run through `claude -p` is in `docs/evidence/claude-code-live.json`. |
| Claude Code 2.1.288: plugin | Passes `claude plugin validate --strict`. Installed from a local marketplace and confirmed active in a live session. |
| Claude Code 2.1.288: MCP server | `claude mcp list` reports Connected. 21 scripted protocol tests cover the handshake, every tool, and the stdio transport. |
| Installer behavior (every harness) | 30 automated tests in `scripts/test-install.mjs`: markers, idempotence, dry run, conflicts, user scope, splitting, the Claude Code bridge, and uninstall. |
| File locations, front matter, and limits for the other harnesses | Checked against each vendor's documentation on 2026-10-03. Not run live in this release. If a harness changed its convention since, open an issue with the documentation link. |

## Sources

Read on 2026-10-03.

- Claude Code: [memory](https://code.claude.com/docs/en/memory), [plugins reference](https://code.claude.com/docs/en/plugins-reference), [marketplaces](https://code.claude.com/docs/en/plugin-marketplaces), [hooks](https://code.claude.com/docs/en/hooks)
- Codex: [AGENTS.md guide](https://developers.openai.com/codex/guides/agents-md)
- Cursor: [rules](https://cursor.com/docs/context/rules), [MCP](https://cursor.com/docs/context/mcp)
- Windsurf (Devin Desktop): [memories and rules](https://docs.devin.ai/desktop/cascade/memories), [AGENTS.md](https://docs.devin.ai/desktop/cascade/agents-md)
- GitHub Copilot: [repository instructions](https://docs.github.com/en/copilot/how-tos/configure-custom-instructions/add-repository-instructions), [Copilot CLI](https://docs.github.com/en/copilot/how-tos/copilot-cli/customize-copilot/add-custom-instructions)
- Gemini CLI: [GEMINI.md](https://geminicli.com/docs/cli/gemini-md/). Antigravity CLI: [rules](https://antigravity.google/docs/rules/)
- Aider: [conventions](https://aider.chat/docs/usage/conventions.html)
- Cline: [rules](https://docs.cline.bot/customization/cline-rules). Roo Code: [custom instructions](https://docs.roocode.com/features/custom-instructions). Continue: [rules](https://docs.continue.dev/customize/deep-dives/rules)
- Zed: [instructions](https://github.com/zed-industries/zed/blob/main/docs/src/ai/instructions.md). Junie: [guidelines](https://junie.jetbrains.com/docs/guidelines-and-memory.html). Kiro: [steering](https://kiro.dev/docs/steering/). Augment: [guidelines](https://docs.augmentcode.com/setup-augment/guidelines)
- opencode: [rules](https://opencode.ai/docs/rules/). Amp: [AGENTS.md](https://ampcode.com/docs/customize/agents-md). Goose: [goosehints](https://goose-docs.ai/docs/guides/context-engineering/using-goosehints)
- [AGENTS.md standard](https://agents.md/), [MCP specification](https://modelcontextprotocol.io/specification/versioning)
