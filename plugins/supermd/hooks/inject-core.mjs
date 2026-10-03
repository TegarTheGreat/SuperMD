// SessionStart hook: puts the SuperMD core into the session as additional
// context, so the rules are always on without editing CLAUDE.md.
// Reads only the file bundled in this plugin. Zero dependencies.
//
// Claude Code caps SessionStart additionalContext at 10,000 characters
// (scripts/sync-plugin.mjs fails the build if the core outgrows it). For the
// Indonesian core (10.5k characters), use `supermd install claude-code --lang id`.

import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const file = join(dirname(fileURLToPath(import.meta.url)), '..', 'rules', 'core.md');

process.stdout.write(JSON.stringify({
  hookSpecificOutput: {
    hookEventName: 'SessionStart',
    additionalContext: readFileSync(file, 'utf8'),
  },
}));
