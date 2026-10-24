// TERRITORY 2.0: pure campaign preview regression tests (no production backend).
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import ts from 'typescript';

const source=readFileSync('src/v2/core/campaignFlow.ts','utf8');
const js=ts.transpileModule(source,{
  compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}
}).outputText;
const flow=await import('data:text/javascript;base64,'+Buffer.from(js).toString('base64'));
const {DEMO_WAVES_PER_CHAPTER,DEMO_START_CHAPTER,chapterIsUnlocked,canEnterDemoRoute,
nextDemoChapterVictory,chooseDemoChapter,demoCombatSample}=flow;
assert.equal(DEMO_WAVES_PER_CHAPTER,5,'fixture waves changed without review');
assert.equal(DEMO_START_CHAPTER,6,'demo fixture changed without review');
assert.equal(chapterIsUnlocked(6,6),true);
assert.equal(chapterIsUnlocked(7,6),false);
for (const invalid of [-1,0,3.5,NaN,Infinity]) assert.equal(chapterIsUnlocked(invalid,6),false);
assert.equal(chooseDemoChapter(7,6),null,'skip-locked-chapter exploit');
assert.deepEqual(chooseDemoChapter(2,6),{chapter:2,wave:1});
assert.equal(canEnterDemoRoute({chapter:6,wave:0},6),false);
assert.equal(canEnterDemoRoute({chapter:6,wave:6},6),false);
assert.equal(canEnterDemoRoute({chapter:7,wave:1},6),false);

for(let wave=1;wave<5;wave++){
  const result=nextDemoChapterVictory({chapter:6,wave},6);
  assert.equal(result.bossCleared,false);
  assert.equal(result.nextRoute.chapter,6);
  assert.equal(result.nextRoute.wave,wave+1);
  assert.equal(result.highestUnlockedChapter,6);
}
const last=nextDemoChapterVictory({chapter:6,wave:5},6);
assert.equal(last.bossCleared,true);
assert.deepEqual(last.nextRoute,{chapter:7,wave:1});
assert.equal(last.highestUnlockedChapter,7);
const replay=nextDemoChapterVictory({chapter:1,wave:5},7);
assert.equal(replay.highestUnlockedChapter,7,'replay cannot lock or jump past earned chapters');
assert.throws(()=>nextDemoChapterVictory({chapter:8,wave:1},7),RangeError);
for(const [encounter,tick] of [[1,0],[1,10],[99,19],[123,999]]){
  const roll=demoCombatSample(encounter,tick);
  assert(roll>=0 && roll<1);
  assert.equal(roll,demoCombatSample(encounter,tick),'sample must be reproducible for visual test');
}
assert.notEqual(demoCombatSample(1,1),demoCombatSample(1,2),'ticks need independent samples');

const layout=readFileSync('src/v2/interfaceContract.ts','utf8');
const app=readFileSync('src/v2/NextApp.tsx','utf8');
const css=readFileSync('src/v2/approved-ui.css','utf8');
for (const label of ['Задания','События','Друзья','Награды','Приглашение','Социальные награды','Морской набор']){
  assert(layout.includes("label: '"+label+"'"),'left shortcut missing: '+label);
}
assert(app.includes('V2_LEFT_SHORTCUTS.map('),'UI does not render all seven shortcuts');
const stageMap=readFileSync('src/v2/visual/StageMapExperience.tsx','utf8');
assert(app.includes('<StageMapExperience state={campaign}'),'100-stage map is not mounted');
assert(stageMap.includes('disabled={!available}'),'locked stage must be disabled in UI');
assert(stageMap.includes('stage.id<=state.highestUnlockedStage'),'stage lock must use V2 campaign source');
assert(app.includes('nextDemoChapterVictory'),'stage result must use progression gate');
assert(app.includes('demoCombatSample(encounterId,b.tick)'),'battle animation must be deterministic demo');
assert(!app.includes('Math.random('),'unpredictable preview visual causes inconsistent screenshots');
for(const s of ['v2-stage-track','v2-stage-enter','v2-extra-follower','v2-skill-tabs','v2-left-buttons']){
  assert(css.includes('.'+s),'missing CSS: '+s);
}
assert(app.includes("import './approved-ui.css'"));
console.log('OK: locked demo chapters, boss unlock, reproducible battle, approved 7 shortcuts, UI styles');
