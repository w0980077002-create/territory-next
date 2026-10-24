import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import ts from 'typescript';
const source=ts.transpileModule(readFileSync('src/v2/core/bossEncounters.ts','utf8'),{
 compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}
}).outputText;
const api=await import('data:text/javascript;base64,'+Buffer.from(source).toString('base64'));
assert.equal(api.V2_BOSSES.length,10);
assert.equal(new Set(api.V2_BOSSES.map(x=>x.art)).size,10);
assert.equal(new Set(api.V2_BOSSES.map(x=>x.name)).size,10);
for(let stage=1;stage<=100;stage++){
 const kind=stage%10===0?'boss':stage%5===0?'elite':'normal';
 const art=api.artForStage(stage,kind);assert(art.startsWith('art/'));
 if(kind==='boss'){
  assert.equal(api.bossForStage(stage).stageId,stage);
  assert.equal(api.bossPhaseAt(stage,100,100).phase,1);
  assert.equal(api.bossPhaseAt(stage,50,100).phase,2);
  assert.equal(api.bossPhaseAt(stage,20,100).phase,3);
  assert(api.bossPhaseAt(stage,20,100).attackMultiplier>1);
 }else{
  assert.equal(api.bossForStage(stage),null);
  assert.equal(api.bossPhaseAt(stage,20,100).phase,0);
 }
}
assert.equal(api.bossForStage(0),null);
assert.equal(api.bossForStage(110),null);
assert.equal(api.bossPhaseAt(10,NaN,100).phase,0);
const f=p=>readFileSync(p,'utf8');
assert(f('src/v2/core/moduleCombat.ts').includes('config:state.config'));
assert(f('src/v2/core/gameplayOverhaul.ts').includes("bossStageId:info.kind==='boss'?info.id:undefined"));
assert(f('src/v2/NextApp.tsx').includes('artForStage(currentStage.id,currentStage.kind)'));
console.log('OK: 10 unique independent bosses with three actual attack phases, boss art and UX');
