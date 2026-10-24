// TERRITORY 2.0: owner-approved mobile BUTTONS and visual system regression.
// The 10 selectable backgrounds are a FUTURE project; current scenery is frozen.
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import {createHash} from 'node:crypto';

const read=p=>readFileSync(p,'utf8');
const app=read('src/v2/NextApp.tsx');
const controls=read('src/v2/owner-ui-controls.css');
const scene=readFileSync('public/v2-winter-stage-v5.webp');
const reference=readFileSync('docs/reference/TERRITORY_2_0_APPROVED_2026-10-24.jpg');
const unchangedGitBlob=(buf)=>createHash('sha1')
  .update(Buffer.from('blob '+buf.byteLength+'\0')).update(buf).digest('hex');

assert.equal(unchangedGitBlob(scene),'cb2964f9582fdd20bcc551ce1aaa98852ba365b3',
  'Current scene changed without owner approval — backgrounds are a separate future stage');
assert.equal(createHash('sha256').update(reference).digest('hex'),
  'ab4201e4d5b168d9941b287329c097ec217bd6510af503e421a957132924384c',
  'Official unique visual reference changed unexpectedly');

assert(app.includes("import './sunlit-reference-polish.css';\nimport './owner-ui-controls.css';"),
  'Control system must be loaded AFTER all old overrides');
assert(!/\.v2-battle\s*[,{]|\.v2-biome-\d\s*[,{]/.test(controls.replace(/\/\*[\s\S]*?\*\//g,'')),
  'Do not touch or polish any battle scenery as part of control-pass');
assert(controls.includes('.v2-left-buttons')&&controls.includes('.v2-right-buttons'));
assert(controls.includes('.v2-shortcut-emblem')&&controls.includes('.v2-shortcut-label'));
assert(controls.includes('.v2-shortcut--settings'));
assert(controls.includes('.v2-command-actions .v2-control'));
assert(controls.includes('.v2-equipment .v2-gear'));
assert(controls.includes('.v2-bottom button:not(.main)'));
assert(controls.includes('clip-path:polygon(50% 0%,96% 22%,96% 78%,50% 100%,4% 78%,4% 22%)'),
  'The owner approved raised blue crossed-axes battle hexagon');
assert(controls.includes('env(safe-area-inset-bottom)'));
assert(controls.includes('@media(max-width:370px)'));
assert(controls.includes('@media(max-height:650px)'));
assert(controls.includes('prefers-reduced-motion'));

for(const label of ['Задания','События','Друзья','Награды','Приглашение','Социальные награды','Морской набор']){
  assert(read('src/v2/interfaceContract.ts').includes("label: '"+label+"'"),
    'Owner-approved left entry missing: '+label);
}
assert(app.includes('v2-shortcut--')||app.includes("'v2-shortcut v2-shortcut--'"));
assert(app.includes("id!=='settings'")&&app.includes('aria-label={label}'),
  'Top-right grid menu must have accessible name, no extra caption');
assert(app.includes("skills:'v2-ui-skills-book.svg'"),
  'New Skills book icon must appear in bottom bar');
assert(app.includes("asset('v2-ui-crown.svg')"),
  'Ranking control must use original gold crown icon');
assert(app.includes('aria-pressed={speed===2}'),'Speed toggle must expose state');
assert(app.includes('aria-pressed={auto}'),'Auto-battle toggle must expose state');
assert(app.includes('v2-nav-demo')&&app.includes("asset('battle-stone.webp')"),
  'Raised Fight must show count with stone icon');
for(const path of ['public/v2-ui-skills-book.svg','public/v2-ui-crown.svg']){
  assert(existsSync(path),'Missing original fantasy icon: '+path);
  const svg=read(path);
  assert(svg.includes('<svg ')&&svg.includes('</svg>')&&svg.includes('viewBox='));
  assert(svg.includes('<defs>')&&svg.includes('filter='));
}
assert(!app.includes('src/game/supabase') && !app.includes("from '../game/"),
  'V2 UI must not import V1 backend');
console.log('OK: controls unified, interactive states exposed, fight hex and icons present; current scene + unique owner reference cryptographically unchanged');
