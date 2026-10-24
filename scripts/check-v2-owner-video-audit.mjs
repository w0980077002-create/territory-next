// Owner's real 2026-10-24 gameplay video: documented visual-regression audit.
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import {createHash} from 'node:crypto';
const read=path=>readFileSync(path,'utf8');
const app=read('src/v2/NextApp.tsx');
const style=read('src/v2/visual/reference-audit-fixes.css');
const spec=read('docs/TERRITORY_2_0_OWNER_VIDEO_AUDIT_20261024_RU.md');
const locked=readFileSync('docs/reference/TERRITORY_2_0_APPROVED_2026-10-24.jpg');
assert.equal(createHash('sha256').update(locked).digest('hex'),
  'ab4201e4d5b168d9941b287329c097ec217bd6510af503e421a957132924384c');
assert(app.includes("import './visual/reference-templates.css';\\nimport './visual/reference-audit-fixes.css';".replace('\\n','\n')),
  'Audit CSS must be loaded after all prior design overrides');
for(const expr of [
  '.v2-shell .v2-left-buttons','.v2-shell .v2-right-buttons',
  '.v2-shell .v2-bottom','.v2-shell .v2-bottom button.main',
  '-webkit-line-clamp:2','max-height:18px','@media(max-width:370px)',
  '@media(max-height:650px)','prefers-reduced-motion',
]) assert(style.includes(expr),'Missing mobile-visual correction: '+expr);
assert(!style.includes('.v2-battle{') && !style.includes('.v2-biome-'),
  'Video audit must not modify the locked battle background');
for(let n=1;n<=14;n++)assert(spec.includes('V-'+String(n).padStart(3,'0')),
  'Missing concrete owner-reported visual issue '+n);
for(const [f,title] of [
  ['docs/video-frames/01_combat.jpg','00:00'],
  ['docs/video-frames/02_warehouse.jpg','00:16'],
  ['docs/video-frames/03_gems.jpg','01:30'],
  ['docs/video-frames/04_quests.jpg','02:30'],
  ['docs/video-frames/05_adventure.jpg','03:16'],
  ['docs/video-frames/06_skills.jpg','03:46']
]){
 assert(existsSync(f),'Missing video screenshot on GitHub: '+f);
 const image=readFileSync(f);
 assert(image.length>15000 && image[0]===0xff && image[1]===0xd8,
   'Extracted screenshot must be a genuine JPEG');
 assert(spec.includes(title),'Video timecode missing: '+title);
}
assert(['камни','задания','навыки'].every(x=>spec.toLocaleLowerCase('ru-RU').includes(x)),'Missing major video sections');
assert(spec.includes('ВНЕШНИЙ ВИД')&&spec.includes('Приоритет'));
console.log('OK: screenshot byte-identity, 14 documented visual bugs, V2-only mobile adjustments, 6 real owner video frames in GitHub');
