#!/usr/bin/env node
// Tests for the MCP server (lib/mcp.mjs): protocol handshake, tool contracts,
// error shapes, and the real stdio transport via `supermd mcp`.
// Zero dependencies; exit 1 on any failure.

import { strict as assert } from 'node:assert';
import { spawn } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createServer, SUPPORTED_PROTOCOL_VERSIONS } from '../lib/mcp.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const server = createServer({ root: ROOT, version: 'test' });
const rpc = (method, params, id = 1) => server.handle({ jsonrpc: '2.0', id, method, params });
const call = (name, args) => rpc('tools/call', { name, arguments: args }).result;

let failures = 0;
async function t(name, fn) {
  try { await fn(); console.log(`  ok  ${name}`); }
  catch (e) { failures++; console.error(`FAIL  ${name}\n      ${e.message}`); }
}

await t('initialize echoes a supported protocol version', () => {
  const r = rpc('initialize', { protocolVersion: SUPPORTED_PROTOCOL_VERSIONS.at(-1), capabilities: {}, clientInfo: { name: 't', version: '0' } });
  assert.equal(r.result.protocolVersion, SUPPORTED_PROTOCOL_VERSIONS.at(-1));
  assert.equal(r.result.serverInfo.name, 'supermd');
  assert.ok(r.result.capabilities.tools && r.result.capabilities.prompts);
});

await t('initialize falls back to the newest version for an unknown one', () => {
  const r = rpc('initialize', { protocolVersion: '1999-01-01' });
  assert.equal(r.result.protocolVersion, SUPPORTED_PROTOCOL_VERSIONS[0]);
});

await t('notifications get no response', () => {
  assert.equal(server.handle({ jsonrpc: '2.0', method: 'notifications/initialized' }), null);
});

await t('ping returns an empty result', () => {
  assert.deepEqual(rpc('ping').result, {});
});

await t('unknown method returns -32601', () => {
  assert.equal(rpc('nope').error.code, -32601);
});

await t('malformed request returns -32600', () => {
  assert.equal(server.handle({ id: 7, method: 'ping' }).error.code, -32600);
});

await t('tools/list advertises four read-only tools with input schemas', () => {
  const { tools } = rpc('tools/list').result;
  assert.deepEqual(tools.map(x => x.name).sort(), ['supermd_adapt', 'supermd_build', 'supermd_check', 'supermd_list']);
  for (const x of tools) {
    assert.equal(x.inputSchema.type, 'object', x.name);
    assert.equal(x.annotations.readOnlyHint, true, x.name);
  }
});

await t('supermd_check flags hard slop and reports structured counts', () => {
  const r = call('supermd_check', { text: "In today's fast-paced world, let's delve into the tapestry. I hope this helps!" });
  assert.ok(!r.isError);
  assert.ok(r.structuredContent.hardTotal >= 3, JSON.stringify(r.structuredContent));
  assert.equal(r.structuredContent.lang, 'en');
  assert.match(r.content[0].text, /hard/);
});

await t('supermd_check passes clean text', () => {
  const r = call('supermd_check', { text: 'Hash passwords with bcrypt. The lookup takes 40 ms.' });
  assert.equal(r.structuredContent.hardTotal, 0);
  assert.match(r.content[0].text, /No known slop/);
});

await t('supermd_check auto-detects Indonesian', () => {
  const r = call('supermd_check', { text: 'Pastikan kata sandi disimpan dengan bcrypt, bukan teks biasa, karena itu mencegah kebocoran data pengguna.' });
  assert.equal(r.structuredContent.lang, 'id');
});

await t('supermd_check rejects a missing text argument as a tool error', () => {
  const r = call('supermd_check', {});
  assert.equal(r.isError, true);
});

await t('supermd_build composes core + field without front matter', () => {
  const r = call('supermd_build', { field: 'nursing', style: 'formal' });
  const body = r.content[0].text;
  assert.ok(!r.isError);
  assert.match(body, /SuperMD Core/);
  assert.match(body, /Nursing/i);
  assert.ok(!/^---$/m.test(body), 'front matter leaked into the prompt');
});

await t('supermd_build with no field returns the core only', () => {
  const body = call('supermd_build', {}).content[0].text;
  assert.match(body, /SuperMD Core/);
  assert.ok(!/Nursing/.test(body));
});

await t('supermd_build with an unknown field returns a tool error with suggestions', () => {
  const r = call('supermd_build', { field: 'zzzz-not-a-field' });
  assert.equal(r.isError, true);
  assert.match(r.content[0].text, /supermd_adapt/);
});

await t('supermd_build rejects an invalid lang as a tool error', () => {
  assert.equal(call('supermd_build', { lang: 'fr' }).isError, true);
});

await t('supermd_adapt wraps the adapter with the instantiate instruction', () => {
  const body = call('supermd_adapt', { field: 'beekeeper' }).content[0].text;
  assert.match(body, /beekeeper/);
  assert.match(body, /Universal Adapter/);
});

await t('supermd_list filters by category', () => {
  const r = call('supermd_list', { category: 'healthcare' });
  assert.ok(r.structuredContent.categories.length === 1);
  assert.ok(r.structuredContent.categories[0].fields.some(f => f.slug === 'nursing'));
});

await t('unknown tool is a -32602 protocol error', () => {
  assert.equal(rpc('tools/call', { name: 'nope', arguments: {} }).error.code, -32602);
});

await t('prompts/list and prompts/get serve the composed prompt', () => {
  assert.equal(rpc('prompts/list').result.prompts[0].name, 'supermd');
  const g = rpc('prompts/get', { name: 'supermd', arguments: { field: 'backend', lang: 'id' } }).result;
  assert.equal(g.messages[0].role, 'user');
  assert.match(g.messages[0].content.text, /SuperMD/);
});

await t('prompts/get with an unknown field returns -32602', () => {
  assert.equal(rpc('prompts/get', { name: 'supermd', arguments: { field: 'zzzz-not-a-field' } }).error.code, -32602);
});

await t('stdio transport: `supermd mcp` speaks newline-delimited JSON-RPC', async () => {
  const child = spawn('node', [join(ROOT, 'bin', 'supermd.mjs'), 'mcp'], { cwd: ROOT, stdio: ['pipe', 'pipe', 'pipe'] });
  let out = '', errOut = '';
  child.stdout.on('data', d => (out += d));
  child.stderr.on('data', d => (errOut += d));
  const msgs = [
    { jsonrpc: '2.0', id: 1, method: 'initialize', params: { protocolVersion: '2025-06-18', capabilities: {}, clientInfo: { name: 't', version: '0' } } },
    { jsonrpc: '2.0', method: 'notifications/initialized' },
    { jsonrpc: '2.0', id: 2, method: 'tools/call', params: { name: 'supermd_check', arguments: { text: 'I hope this helps!' } } },
  ];
  for (const m of msgs) child.stdin.write(JSON.stringify(m) + '\n');
  child.stdin.end();
  await new Promise(res => child.on('close', res));
  const lines = out.trim().split('\n').map(l => JSON.parse(l));
  assert.equal(lines.length, 2, `expected 2 responses, got ${lines.length}; stderr: ${errOut}`);
  assert.equal(lines[0].id, 1);
  assert.equal(lines[1].result.structuredContent.hardTotal > 0, true);
  assert.equal(errOut, '', 'server must keep stderr quiet on the happy path');
});

if (failures) { console.error(`\n${failures} MCP test(s) failed`); process.exit(1); }
console.log('\nall MCP tests pass');
