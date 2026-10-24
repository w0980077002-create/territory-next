// Evidence contract for TERRITORY 2.0. No gameplay, currency or drop-rate calculations.
// Run: node scripts/check-v2-evidence.mjs
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';

const root = process.cwd();
const data = JSON.parse(readFileSync('docs/TERRITORY_2_0_EVIDENCE_CATALOG.json', 'utf8'));
const grades = new Set(['official','official-channel','secondary','announcement-only']);
const refs = new Set();
const systems = new Set();
assert.equal(data.asOf, '2026-10-24');
assert.ok(existsSync(data.visualReference), 'owner-approved original screenshot is missing');
assert.ok(data.features.length >= 40, 'research catalog unexpectedly truncated');
for (const item of data.features) {
  assert.ok(/^((LW|COC)-\d{2})$/.test(item.id), 'bad source ID: '+item.id);
  assert.ok(!refs.has(item.id), 'duplicate ID: '+item.id);
  assert.ok(!systems.has(item.game+':'+item.system), 'duplicate mechanic: '+item.system);
  refs.add(item.id); systems.add(item.game+':'+item.system);
  assert.ok(grades.has(item.evidence), 'unknown evidence grade: '+item.id);
  assert.ok(typeof item.title === 'string' && item.title.length > 10, 'missing verified feature title');
  assert.ok(data.sources[item.source]?.startsWith('https://'), 'missing source URL: '+item.id);
  assert.equal(item.implementation,'candidate-not-complete', 'evidence must never be marked shipped by catalog alone');
}
assert.ok(data.features.some(x => x.game.startsWith('lootborn')));
assert.ok(data.features.some(x => x.game === 'coc'));
assert.ok(data.features.some(x=>x.evidence === 'announcement-only'), 'do not present announced features as shipped');
for (const path of ['docs/TERRITORY_2_0_REFERENCE_RESEARCH_20261024_RU.md','docs/TERRITORY_2_0_SOURCE_BASED_BACKLOG_RU.md','docs/TERRITORY_2_0_APPROVED_UI_LOCK_RU.md']) {
  assert.ok(existsSync(path), 'missing required document: '+path);
}
const lock = readFileSync('docs/TERRITORY_2_0_APPROVED_UI_LOCK_RU.md','utf8');
assert.ok(lock.includes(data.visualReference.split('/').at(-1)), 'approved reference not linked from lock');
console.log('OK: owner-approved image + '+data.features.length+' sourced V2 reference mechanics; no mechanic auto-claimed implemented');
