// TERRITORY 2.0 — ensure official visual and source-to-spec-to-test completeness.
// No backend writes, no production credentials. Execute: node scripts/check-v2-master-spec.mjs
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { createHash } from 'node:crypto';

const read = p => readFileSync(p,'utf8');
const parse = p => JSON.parse(read(p));
const master = read('docs/TERRITORY_2_0_MASTER_TZ_RU.md');
const arch = read('docs/TERRITORY_2_0_TECHNICAL_ARCHITECTURE_RU.md');
const acceptance = read('docs/TERRITORY_2_0_ACCEPTANCE_AND_TRACEABILITY_RU.md');
const atlas = read('docs/TERRITORY_2_0_SCREEN_BY_SCREEN_CONTRACT_RU.md');
const unknown = read('docs/TERRITORY_2_0_UNVERIFIED_PARAMETERS_RU.md');
const research = read('docs/TERRITORY_2_0_REFERENCE_RESEARCH_20261024_RU.md');
const catalog = parse('docs/TERRITORY_2_0_EVIDENCE_CATALOG.json');
const trace = parse('docs/TERRITORY_2_0_IMPLEMENTATION_TRACE.json');

const imageFile = 'docs/reference/TERRITORY_2_0_APPROVED_2026-10-24.jpg';
assert.equal(trace.approvedVisualReference,imageFile);
assert.ok(existsSync(imageFile));
const bytes = readFileSync(imageFile);
assert.equal(bytes.byteLength,465531,'reference screenshot bytes unexpectedly altered');
assert.equal(createHash('sha256').update(bytes).digest('hex'),
'ab4201e4d5b168d9941b287329c097ec217bd6510af503e421a957132924384c',
'official UI reference changed — owner approval required');

for (let n=1;n<=34;n++) {
  const id='SCR-'+String(n).padStart(2,'0');
  assert.ok(master.includes('| '+id+' |'), 'missing spec screen '+id);
  assert.ok(atlas.includes('### '+id+'.'), 'missing screen interaction contract '+id);
}
for (let n=1;n<=13;n++) {
  const id='GMP-'+String(n).padStart(2,'0');
  assert.ok(master.includes('('+id+')'), 'missing spec gameplay group '+id);
}
for (let n=1;n<=55;n++) {
  const id='E2E-'+String(n).padStart(3,'0');
  assert.ok(acceptance.includes('**'+id+' '), 'missing test scenario '+id);
}
for (let n=1;n<=36;n++) {
  const id='U-'+String(n).padStart(3,'0');
  assert.ok(unknown.includes('| '+id+' |'), 'unresolved-parameter register missing '+id);
}
assert.ok(master.includes('Только') || master.includes('только'));
assert.ok(arch.includes('Idempotency-Key'));
assert.ok(arch.includes('RLS'));
assert.ok(arch.includes('initData'));
assert.ok(arch.includes('production'));
assert.ok(research.includes('Call of Odin'));
assert.ok(research.includes('Lootborn'));
assert.equal(catalog.features.length,53,'source-evidence count changed; regenerate trace');
assert.equal(trace.records.length,catalog.features.length,'trace count does not match source count');

const IDs = new Set();
const catalogMap=new Map(catalog.features.map(f=>[f.id,f]));
for (const row of trace.records) {
  assert.ok(!IDs.has(row.sourceId),'duplicate trace ID '+row.sourceId);
  IDs.add(row.sourceId);
  const original=catalogMap.get(row.sourceId);
  assert.ok(original,'orphan trace ID '+row.sourceId);
  assert.equal(row.claim,original.title,'out-of-sync source description '+row.sourceId);
  assert.equal(row.evidenceType,original.evidence,'changed source evidence grade');
  assert.equal(row.sourceURL,catalog.sources[original.source], 'source URL mismatch');
  assert.ok(/^https:\/\//.test(row.sourceURL),'no evidence link: '+row.sourceId);
  assert.ok(master.includes('| '+row.requirementId+' |'), 'unmapped master screen: '+row.sourceId);
  assert.ok(master.includes('('+row.scenarioId+')'), 'unmapped gameplay path: '+row.sourceId);
  assert.ok(acceptance.includes('**'+row.acceptanceId+' '), 'unmapped acceptance case: '+row.sourceId);
  assert.ok(row.implementationStatus==='NOT_VERIFIED_COMPLETE','research cannot claim shipped implementation: '+row.sourceId);
  if(original.evidence==='announcement-only')assert.equal(row.disposition,'announced-only', 'announcement incorrectly stated shipped');
  if(original.id==='COC-18'||original.id==='COC-19')assert.equal(row.disposition,'historical-risk-not-to-copy');
}
assert.deepEqual([...IDs].sort(),catalog.features.map(f=>f.id).sort(),'source claims missing from trace');
console.log('OK: owner image SHA-256 fixed; 34 screens, 13 gameplay scenarios, 55 E2E cases, 36 unresolved parameters; 53/53 researched claims traced to requirements and tests');
