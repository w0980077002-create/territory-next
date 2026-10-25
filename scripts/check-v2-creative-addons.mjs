import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(fileURLToPath(new URL('..', import.meta.url)));
const converter = 'tools/3d-to-2d';
const skill = '.agents/skills/reference-uikit';
const exists = path => existsSync(join(root, path));
const read = path => readFileSync(join(root, path), 'utf8');

for (const path of [
  `${converter}/index.html`,
  `${converter}/css/style.css`,
  `${converter}/js/app.js`,
  `${converter}/js/modules/scene.js`,
  `${converter}/js/modules/loader.js`,
  `${converter}/js/modules/capture.js`,
  `${converter}/js/modules/i18n.js`,
  `${converter}/UPSTREAM_README.md`,
  `${converter}/UPSTREAM_README_RU.md`,
  `${converter}/SOURCE_NOTICE.md`,
  `${skill}/SKILL.md`,
  `${skill}/agents/openai.yaml`,
  `${skill}/references/paint-and-assets.md`,
  `${skill}/references/verification-and-delivery.md`,
  `${skill}/scripts/audit_bundle.py`,
  `${skill}/SOURCE_NOTICE.md`,
]) {
  assert.ok(exists(path), `Missing Studio Igor integration: ${path}`);
}

const html = read(`${converter}/index.html`);
assert.match(html, /three@0\.160\.0/);
assert.match(html, /jszip@3\.10\.1/);
assert.match(html, /file-saver@2\.0\.5/);
assert.match(html, /type="module" src="js\/app\.js"/);
assert.match(html, /id="btn-generate"/);
assert.match(html, /id="btn-download-zip"/);
assert.match(read(`${converter}/js/modules/capture.js`), /generateSpriteSheets/);
assert.match(read(`${converter}/js/modules/loader.js`), /loadModelFromFile/);
assert.match(read(`${skill}/SKILL.md`), /Визуальная верность/);
assert.match(read(`${skill}/SKILL.md`), /callbacks/);

// Every relative JavaScript/CSS path used directly by the HTML must exist in
// the standalone workshop; external CDN paths are explicitly not copied.
for (const match of html.matchAll(/(?:href|src)="((?:css|js)\/[^"?#]+)"/g)) {
  const asset = join(converter, match[1]);
  assert.ok(exists(asset), `Broken converter HTML asset: ${asset}`);
}
// The converter is never imported by React or exposed on the game's Pages build.
assert.ok(!exists('src/v2/developer-tools'), 'Editor tool must remain isolated');
assert.ok(!exists('public-v2/developer-tools'), 'Developer tool must not be published inside the game');

const pkg = JSON.parse(read('package.json'));
assert.ok(pkg.scripts['qa:creative-addons']);
assert.match(pkg.scripts['art:sprite-converter'] ?? '', /http\.server 8765.*tools\/3d-to-2d/);

console.log('Creative addons present: standalone Studio Igor 3D→2D converter and reference-uikit skill (game isolated).');
