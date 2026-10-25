import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(fileURLToPath(new URL('..', import.meta.url)));
const skill = join(root, '.agents', 'skills', 'ref2game');

for (const path of [
  'SKILL.md', 'LICENSE', 'references/animation.md', 'references/art.md',
  'scripts/setup.sh', 'scripts/qa.mjs', 'scripts/render.mjs',
  'scripts/rigcut.py', 'scripts/partrig.py', 'scripts/jointr.py',
  'scripts/compare.py', 'templates/live/gl.js', 'templates/live/lib.js',
]) {
  assert.ok(existsSync(join(skill, path)), `Missing ref2game file: ${path}`);
}

const lic = readFileSync(join(skill, 'LICENSE'), 'utf8');
assert.match(lic, /MIT License/);
assert.match(lic, /Copyright \(c\) 2026 studioigor/);
assert.ok(existsSync(join(root, 'AGENTS.md')), 'Missing repo agent instructions');
assert.ok(existsSync(join(root, 'docs', 'TERRITORY_2_0_CANON', 'SOURCE_OF_TRUTH_RU.md')), 'Missing approved V2 canonical spec');

const qa = readFileSync(join(skill, 'scripts', 'qa.mjs'), 'utf8');
assert.match(qa, /SCENE\.QA/);
assert.match(qa, /foot slide|foot slides|planted foot/i);
assert.match(qa, /rig/);
const preparer = readFileSync(join(root, 'scripts', 'prepare-v2-art-workshop.mjs'), 'utf8');
assert.match(preparer, /\.workshop/);
assert.match(preparer, /flag: 'wx'/);
assert.match(preparer, /--dry-run/);
assert.match(preparer, /MOTION_PROMPTS\.md/);
assert.match(preparer, /RUN-IN-PLACE/);
assert.ok(existsSync(join(root, 'docs', 'TERRITORY_2_0_MOTION_PIPELINE_RU.md')));

console.log('V2 art workshop: MIT skill present, rig QA hooks and isolated briefs verified.');
