// SuperMD MCP server — exposes compose / adapt / list / check as Model Context
// Protocol tools and the composed prompts as MCP prompts, over stdio.
// Zero dependencies; Node 18+. Any MCP-capable harness can use it:
//   claude mcp add supermd -- npx -y supermd mcp
//   codex mcp add supermd -- npx -y supermd mcp
//
// Transport: newline-delimited JSON-RPC 2.0 on stdin/stdout (MCP stdio
// transport). Nothing but protocol messages may be written to stdout; all
// diagnostics go to stderr.

import { createInterface } from 'node:readline';
import { catalog, compose, adapt } from './compose.mjs';
import { scan, loadLexicon, hardTotal, softTotal, detectLang } from './slop-scan.mjs';

// Newest first. The server answers `initialize` with the client's requested
// version when it is in this list, otherwise with the newest one it speaks.
// This is the handshake-era protocol (through 2025-11-25). Clients on the
// stateless 2026-07-28 revision probe `server/discover` first, get -32601, and
// fall back to `initialize`, as the spec's backward-compatibility rules require.
export const SUPPORTED_PROTOCOL_VERSIONS = ['2025-11-25', '2025-06-18', '2025-03-26', '2024-11-05'];

const LANGS = ['en', 'id'];
const STYLES = ['formal', 'conversational', 'technical'];

const TOOLS = [
  {
    name: 'supermd_check',
    title: 'Lint text for AI slop',
    description:
      'Scan text for known AI-slop patterns (filler openers, inflated vocabulary, vague attribution, sycophancy, empty closers, decorative structure). Returns hard hits (unambiguous slop) and soft hits (weak or context-dependent signals). Run it on a draft before delivering prose; rewrite until there are zero hard hits. It detects known surface patterns only; it does not prove the text is free of slop.',
    inputSchema: {
      type: 'object',
      properties: {
        text: { type: 'string', description: 'The text to scan.' },
        lang: { type: 'string', enum: LANGS, description: 'Language of the text. Auto-detected when omitted.' },
      },
      required: ['text'],
      additionalProperties: false,
    },
    annotations: { title: 'Lint text for AI slop', readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false },
  },
  {
    name: 'supermd_build',
    title: 'Compose a SuperMD system prompt',
    description:
      'Assemble the SuperMD anti-slop system prompt: the universal core, plus the module for a profession (for example "nursing" or "backend"), plus an optional style. Field matching is forgiving; an unknown field returns the closest matches. Use coreOnly for the core without a domain module.',
    inputSchema: {
      type: 'object',
      properties: {
        field: { type: 'string', description: 'Profession or sub-field slug or name, e.g. "software-engineering", "nursing". Omit with coreOnly.' },
        style: { type: 'string', enum: STYLES, description: 'Optional register to pin.' },
        lang: { type: 'string', enum: LANGS, description: 'Prompt language. Default en.' },
        coreOnly: { type: 'boolean', description: 'Return only the universal core.' },
      },
      additionalProperties: false,
    },
    annotations: { title: 'Compose a SuperMD system prompt', readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false },
  },
  {
    name: 'supermd_adapt',
    title: 'Instantiate the universal adapter for any profession',
    description:
      'Return the core plus the universal adapter with an instruction to instantiate it for a field that has no shipped module (for example "beekeeper"). Follow the returned instructions to build the field module.',
    inputSchema: {
      type: 'object',
      properties: {
        field: { type: 'string', description: 'Free-text description of the profession or field.' },
        lang: { type: 'string', enum: LANGS, description: 'Prompt language. Default en.' },
      },
      required: ['field'],
      additionalProperties: false,
    },
    annotations: { title: 'Instantiate the universal adapter', readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false },
  },
  {
    name: 'supermd_list',
    title: 'List shipped domain modules',
    description: 'List the shipped domain categories and sub-field slugs, optionally filtered to one category.',
    inputSchema: {
      type: 'object',
      properties: {
        category: { type: 'string', description: 'Optional category filter, e.g. "technology".' },
        lang: { type: 'string', enum: LANGS, description: 'Catalog language. Default en.' },
      },
      additionalProperties: false,
    },
    annotations: { title: 'List shipped domain modules', readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false },
  },
];

const PROMPTS = [
  {
    name: 'supermd',
    title: 'SuperMD anti-slop prompt',
    description: 'The SuperMD universal core, optionally composed with a profession module and a style.',
    arguments: [
      { name: 'field', description: 'Profession or sub-field, e.g. "nursing". Omit for the core only.', required: false },
      { name: 'style', description: 'formal, conversational, or technical.', required: false },
      { name: 'lang', description: 'en or id. Default en.', required: false },
    ],
  },
];

const text = s => ({ content: [{ type: 'text', text: s }] });
const toolError = s => ({ content: [{ type: 'text', text: s }], isError: true });

function pickLang(v) {
  if (v === undefined) return 'en';
  if (!LANGS.includes(v)) throw Object.assign(new Error(`lang must be one of ${LANGS.join(', ')}`), { invalid: true });
  return v;
}

function callTool(name, args, ctx) {
  args = args && typeof args === 'object' ? args : {};
  switch (name) {
    case 'supermd_check': {
      if (typeof args.text !== 'string') return toolError('"text" is required and must be a string.');
      const lang = args.lang ? pickLang(args.lang) : detectLang(args.text);
      const hits = scan(args.text, lang, ctx.lexicon);
      const hard = hardTotal(hits), soft = softTotal(hits);
      const lines = [];
      if (!hard && !soft) lines.push(`No known slop patterns (${lang}).`);
      else {
        lines.push(`${hard} hard, ${soft} soft (${lang}). Hard = unambiguous slop, rewrite it. Soft = weak or context-dependent signal.`);
        for (const h of hits.hard) lines.push(`hard  ${h.name} x${h.count}  e.g. ${JSON.stringify(h.sample).slice(0, 80)}`);
        for (const h of hits.soft) lines.push(`soft  ${h.name} x${h.count}  e.g. ${JSON.stringify(h.sample).slice(0, 80)}`);
      }
      lines.push('Detector of known surface patterns only; not a proof of slop-freedom.');
      return { ...text(lines.join('\n')), structuredContent: { lang, hardTotal: hard, softTotal: soft, hard: hits.hard, soft: hits.soft } };
    }
    case 'supermd_build': {
      const lang = pickLang(args.lang);
      const r = compose({ field: args.field, style: args.style, lang, coreOnly: !!args.coreOnly || !args.field }, ctx.root);
      if (!r.ok && r.error === 'field-not-found') {
        const alts = (r.candidates || []).map(f => f.slug).join(', ');
        return toolError(`No module for "${r.field}".${alts ? ` Closest: ${alts}.` : ''} Any other profession: call supermd_adapt.`);
      }
      if (!r.ok) return toolError(r.error);
      const note = r.warnings.length ? `<!-- ${r.warnings.join('; ')} -->\n\n` : '';
      return text(note + r.prompt);
    }
    case 'supermd_adapt': {
      if (typeof args.field !== 'string' || !args.field.trim()) return toolError('"field" is required.');
      return text(adapt(args.field.trim(), pickLang(args.lang), ctx.root).prompt);
    }
    case 'supermd_list': {
      const lang = pickLang(args.lang);
      const only = typeof args.category === 'string' && args.category.toLowerCase();
      const cats = catalog(lang, ctx.root).filter(c => !only || c.category.includes(only));
      if (!cats.length) return toolError(`No category matching "${args.category}".`);
      const out = cats.map(c => `${c.categoryName} [${c.category}]\n${c.fields.map(f => `  ${f.slug}  ${f.name}`).join('\n')}`);
      return { ...text(out.join('\n\n')), structuredContent: { categories: cats.map(c => ({ category: c.category, name: c.categoryName, fields: c.fields.map(f => ({ slug: f.slug, name: f.name })) })) } };
    }
    default:
      return null;
  }
}

function getPrompt(name, args, ctx) {
  if (name !== 'supermd') throw Object.assign(new Error(`Unknown prompt: ${name}`), { invalid: true });
  args = args || {};
  const lang = pickLang(args.lang);
  const r = compose({ field: args.field, style: args.style, lang, coreOnly: !args.field }, ctx.root);
  if (!r.ok) throw Object.assign(new Error(r.error === 'field-not-found' ? `No module for "${r.field}"` : r.error), { invalid: true });
  return { description: 'SuperMD anti-slop system prompt', messages: [{ role: 'user', content: { type: 'text', text: r.prompt } }] };
}

// Build a stateless message handler. `handle(msg)` returns a JSON-RPC response
// object, or null when the message needs no response (notifications).
export function createServer({ root, version = '0.0.0' } = {}) {
  const ctx = { root, lexicon: loadLexicon(root) };
  const ok = (id, result) => ({ jsonrpc: '2.0', id, result });
  const fail = (id, code, message) => ({ jsonrpc: '2.0', id, error: { code, message } });

  function handle(msg) {
    if (!msg || typeof msg !== 'object' || msg.jsonrpc !== '2.0' || typeof msg.method !== 'string') {
      return fail(msg && msg.id !== undefined ? msg.id : null, -32600, 'Invalid Request');
    }
    const { id, method, params } = msg;
    const isNotification = id === undefined;
    if (isNotification) return null; // notifications/initialized, notifications/cancelled, ... need no reply

    try {
      switch (method) {
        case 'initialize': {
          const asked = params && params.protocolVersion;
          const protocolVersion = SUPPORTED_PROTOCOL_VERSIONS.includes(asked) ? asked : SUPPORTED_PROTOCOL_VERSIONS[0];
          return ok(id, {
            protocolVersion,
            capabilities: { tools: { listChanged: false }, prompts: { listChanged: false } },
            serverInfo: { name: 'supermd', title: 'SuperMD', version },
            instructions:
              'SuperMD removes AI slop. Call supermd_check on any prose draft before delivering it and rewrite until it reports zero hard hits. Call supermd_build to fetch the anti-slop system prompt for a profession.',
          });
        }
        case 'ping': return ok(id, {});
        case 'tools/list': return ok(id, { tools: TOOLS });
        case 'tools/call': {
          if (!params || typeof params.name !== 'string') return fail(id, -32602, 'Invalid params: "name" is required');
          let result;
          try { result = callTool(params.name, params.arguments, ctx); }
          catch (e) { return e.invalid ? ok(id, toolError(e.message)) : ok(id, toolError(`Tool failed: ${e.message}`)); }
          return result ? ok(id, result) : fail(id, -32602, `Unknown tool: ${params.name}`);
        }
        case 'prompts/list': return ok(id, { prompts: PROMPTS });
        case 'prompts/get': {
          if (!params || typeof params.name !== 'string') return fail(id, -32602, 'Invalid params: "name" is required');
          try { return ok(id, getPrompt(params.name, params.arguments, ctx)); }
          catch (e) { return fail(id, e.invalid ? -32602 : -32603, e.message); }
        }
        default:
          return fail(id, -32601, `Method not found: ${method}`);
      }
    } catch (e) {
      return fail(id, -32603, `Internal error: ${e.message}`);
    }
  }
  return { handle };
}

// Run the server on stdin/stdout until stdin closes.
export function serveStdio({ root, version }) {
  const server = createServer({ root, version });
  const send = msg => process.stdout.write(JSON.stringify(msg) + '\n');
  const rl = createInterface({ input: process.stdin, crlfDelay: Infinity });
  rl.on('line', line => {
    if (!line.trim()) return;
    let msg;
    try { msg = JSON.parse(line); }
    catch { return send({ jsonrpc: '2.0', id: null, error: { code: -32700, message: 'Parse error' } }); }
    if (Array.isArray(msg)) {
      const replies = msg.map(m => server.handle(m)).filter(Boolean);
      if (replies.length) send(replies);
    } else {
      const reply = server.handle(msg);
      if (reply) send(reply);
    }
  });
  return new Promise(resolve => rl.on('close', resolve));
}
