// Owner decision: no profession system or inherited genre-style requirements in TERRITORY 2.0.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=(p)=>readFileSync(p,'utf8');
const activeSources=[
 'src/v2/NextApp.tsx','src/v2/interfaceContract.ts',
 'src/v2/PortExperience.tsx','src/v2/core/demoPort.ts',
 'src/v2/portExperience.css','scripts/generate-v2-original-art.mjs'
];
for(const path of activeSources){
 const body=read(path);
 assert(!/professions|profession|профессии|профессия|лицензия мастера|лицензии мастера/i.test(body),
  'Removed gameplay system cannot appear in V2: '+path);
}
const master=read('docs/TERRITORY_2_0_MASTER_TZ_RU.md');
const atlas=read('docs/TERRITORY_2_0_SCREEN_BY_SCREEN_CONTRACT_RU.md');
const art=read('docs/TERRITORY_2_0_APPROVED_UI_LOCK_RU.md');
const spec=read('docs/TERRITORY_2_0_TECHNICAL_ARCHITECTURE_RU.md');
assert(master.includes('| SCR-13 | Исключённый пункт |'));
assert(atlas.includes('### SCR-13. Раздел исключён владельцем'));
assert(!/profession|профессия|профессии|лицензия мастера/i.test(master+atlas+spec),
 'Removed section cannot be part of V2 active specification');
assert(!art.includes('Только яркая, насыщенная, качественная'));
assert(!master.includes('яркие взрослые викингские помощники'));
assert(!master.includes('не детская карикатура'));
assert(!master.includes('взрослое героическое фэнтези'));
assert(master.includes('только утверждённый скрин'));
const pkg=JSON.parse(read('package.json'));
assert(!('test:professions' in pkg.scripts));
assert(pkg.scripts['test:v2'].includes('check-v2-owner-scope.mjs'));
console.log('OK: no profession UI, unlock pricing, mastery system, or unapproved style restrictions in V2');
