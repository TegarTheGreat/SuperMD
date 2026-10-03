#!/usr/bin/env node
// Keeps the Claude Code plugin in step with the Markdown tree and package.json.
//   node scripts/sync-plugin.mjs           regenerate
//   node scripts/sync-plugin.mjs --check   fail (exit 1) if anything is stale
//
// Generated: plugins/supermd/rules/core.md (the English core, front matter
// stripped) and the version fields in both manifests. Everything else in the
// plugin is hand-written. Zero dependencies; Node 18+.

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { compose } from '../lib/compose.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const check = process.argv.includes('--check');
const HOOK_CAP = 10000; // Claude Code truncates SessionStart additionalContext beyond this many characters

const version = JSON.parse(readFileSync(join(ROOT, 'package.json'), 'utf8')).version;
const core = compose({ lang: 'en', coreOnly: true }, ROOT).prompt + '\n';
if (core.length > HOOK_CAP) {
  console.error(`The English core is ${core.length} characters; Claude Code truncates SessionStart context at ${HOOK_CAP}. Trim the core or move the plugin to an output style.`);
  process.exit(1);
}

const stale = [];
function put(rel, content) {
  const abs = join(ROOT, rel);
  const cur = existsSync(abs) ? readFileSync(abs, 'utf8') : null;
  if (cur === content) return;
  if (check) { stale.push(rel); return; }
  mkdirSync(dirname(abs), { recursive: true });
  writeFileSync(abs, content);
  console.log(`updated ${rel}`);
}

put('plugins/supermd/rules/core.md', core);

const setVersion = (rel, edit) => {
  const j = JSON.parse(readFileSync(join(ROOT, rel), 'utf8'));
  edit(j);
  put(rel, JSON.stringify(j, null, 2) + '\n');
};
setVersion('plugins/supermd/.claude-plugin/plugin.json', j => { j.version = version; });
setVersion('.claude-plugin/marketplace.json', j => { j.metadata.version = version; j.plugins[0].version = version; });

if (stale.length) {
  console.error('Stale plugin files (run `node scripts/sync-plugin.mjs`):\n' + stale.map(f => '  ' + f).join('\n'));
  process.exit(1);
}
if (check) console.log(`Plugin files match the tree (core ${core.length}/${HOOK_CAP} characters).`);
