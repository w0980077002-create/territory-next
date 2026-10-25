import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(fileURLToPath(new URL('..', import.meta.url)));
const read = path => readFileSync(join(root, path), 'utf8');

const contact = read('tools/animation-review/contact_sheet.py');
const uiDiff = read('tools/agent-qa/ui-diff-check.sh');
const zones = read('.studio/zones.conf');

assert.match(read('tools/animation-review/LICENSE'), /MIT License/);
assert.match(read('tools/animation-review/LICENSE'), /2026 studioigor/);
assert.match(read('tools/agent-qa/LICENSE'), /MIT License/);
assert.match(contact, /def probe\(/);
assert.match(contact, /def (?:do_)?sheet|sheet\s+extracts/);
assert.match(contact, /before\/after|compare/);
assert.match(uiDiff, /git diff --name-only/);
assert.match(uiDiff, /ZONES|zones\.conf/);
assert.match(zones, /src\/v2\/visual/);

const pkg = JSON.parse(read('package.json'));
for (const command of ['art:video:sheet', 'art:video:compare', 'qa:ui-diff', 'qa:studio-tools']) {
  assert.ok(pkg.scripts[command], `Missing npm script ${command}`);
}

console.log('Studio Igor helpers: MIT video review and scoped UI diff available; no game imports or production changes.');
