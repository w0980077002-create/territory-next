// TERRITORY 2.0 local demo persistence regression.
// Tests in Node only, no browser V1 key, live Supabase, wallet or Telegram secret.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import ts from 'typescript';

function code(path){
  return ts.transpileModule(readFileSync(path,'utf8'),{
    compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}
  }).outputText;
}
function asURL(src){
  return 'data:text/javascript;base64,'+Buffer.from(src).toString('base64');
}
const progressURL=asURL(code('src/v2/core/progression.ts'));
const buildURL=asURL(code('src/v2/core/previewBuilds.ts'));
let module=code('src/v2/core/localDemoSave.ts');
module=module.replace(/from ['"]\.\/progression['"]/, "from '"+progressURL+"'");
module=module.replace(/from ['"]\.\/previewBuilds['"]/, "from '"+buildURL+"'");
const {
  createV2DemoProgress,
  applyV2DemoVictory,
}=await import(progressURL);
const {
  V2_LOCAL_DEMO_SAVE_KEY,
  V2_LOCAL_DEMO_SAVE_VERSION,
  encodeV2LocalDemoSave,decodeV2LocalDemoSave,
  readV2LocalDemoSave,writeV2LocalDemoSave,
  clearV2LocalDemoSave,v2DemoStorage,
}=await import(asURL(module));
assert.equal(V2_LOCAL_DEMO_SAVE_VERSION,1);
assert.equal(v2DemoStorage(),null,'Node has no window');
assert(V2_LOCAL_DEMO_SAVE_KEY.startsWith('territory-next-v2:'));
const values=new Map([['territory-v1-live-player','keep-forever']]);
const storage={
  getItem:k=>values.get(k)??null,
  setItem:(k,v)=>{values.set(k,v);},
  removeItem:k=>{values.delete(k);}
};
let progress=createV2DemoProgress();
progress=applyV2DemoVictory(progress,'v2-demo-encounter-1',6,2,.2);
const payload={
  version:1,savedAt:Date.now(),chapter:6,wave:3,highestUnlockedChapter:6,
  encounterId:2,heroClass:'berserker',rune:'frost',companion:'warcow',
  speed:2,auto:false,victories:1,defeats:0,progress,
  builds:[
    {slot:1,build:{heroClass:'berserker',rune:'frost',companion:'warcow'}},
    {slot:2,build:null},{slot:3,build:null}
  ]
};
assert.equal(writeV2LocalDemoSave(storage,payload),true);
const loaded=readV2LocalDemoSave(storage);
assert(loaded,'Valid V2 browser save lost on reload');
assert.equal(loaded.chapter,6);
assert.equal(loaded.wave,3);
assert.equal(loaded.auto,false);
assert.equal(loaded.speed,2);
assert.equal(loaded.progress.wins,1);
assert.equal(loaded.progress.gold,progress.gold);
assert.equal(loaded.builds[0].build.companion,'warcow');
assert.equal(loaded.progress.receipts[0],'v2-demo-encounter-1');
assert.equal(applyV2DemoVictory(loaded.progress,'v2-demo-encounter-1',6,2,.99),loaded.progress,
  'Refresh/replay must not regrant even demo victory');
assert.equal(loaded.progress.latestLoot,null,'Never accept stored loot claims');
const copy=JSON.parse(encodeV2LocalDemoSave(payload));
const invalid=[
  {...copy,version:2},
  {...copy,chapter:1000,highestUnlockedChapter:1},
  {...copy,encounterId:-1},
  {...copy,heroClass:'hacker'},
  {...copy,auto:'yes'},
  {...copy,progress:{...copy.progress,gold:-1}},
  {...copy,progress:{...copy.progress,gems:1e18}},
  {...copy,progress:{...copy.progress,level:301}},
  {...copy,progress:{...copy.progress,wins:0}},
  {...copy,progress:{...copy.progress,receipts:['v2-demo-encounter-1','v2-demo-encounter-1']}},
  {...copy,builds:[{slot:1,build:null}]},
  {...copy,builds:[{slot:1,build:{heroClass:'admin',rune:'flame',companion:'warcow'}},{slot:2,build:null},{slot:3,build:null}]},
];
for(const bad of invalid){
  assert.equal(decodeV2LocalDemoSave(JSON.stringify(bad)),null,
    'Damaged or injected browser save accepted');
}
const forged=JSON.parse(encodeV2LocalDemoSave(payload));
forged.progress.equipped.weapon.stats.attack=999999999;
const cleaned=decodeV2LocalDemoSave(JSON.stringify(forged));
assert(cleaned);
assert(cleaned.progress.equipped.weapon.stats.attack<999999999,
  'Items must be reconstructed from original demo rules, not fabricated stats');
const dup=JSON.parse(encodeV2LocalDemoSave(payload));
dup.progress.inventory.push(dup.progress.equipped.weapon);
assert.equal(decodeV2LocalDemoSave(JSON.stringify(dup)),null,'Duplicate equipped/warehouse item');
assert.equal(decodeV2LocalDemoSave('not-json'),null);
assert.equal(decodeV2LocalDemoSave('x'.repeat(400001)),null);
assert.equal(readV2LocalDemoSave({getItem(){throw Error('browser disabled')}}),null);
assert.equal(writeV2LocalDemoSave({setItem(){throw Error('quota')}},payload),false);
assert.equal(clearV2LocalDemoSave(storage),true);
assert.equal(readV2LocalDemoSave(storage),null);
assert.equal(values.get('territory-v1-live-player'),'keep-forever',
  'Never touch data belonging to the first Territory');
const app=readFileSync('src/v2/NextApp.tsx','utf8');
assert(app.includes('readV2LocalDemoSave(v2DemoStorage())'));
assert(app.includes('writeV2LocalDemoSave('));
assert(app.includes('clearV2LocalDemoSave(v2DemoStorage())'));
assert(app.includes('window.confirm('));
assert(!app.includes('import { supabase }'));
console.log('OK: durable local-only V2 test session; reload & presets, no replay, no forged items, V1 key untouched');
