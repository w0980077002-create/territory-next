import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import ts from 'typescript';
const transpile=p=>ts.transpileModule(readFileSync(p,'utf8'),{
  compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022},
}).outputText;
const data=js=>'data:text/javascript;base64,'+Buffer.from(js).toString('base64');
const progressURL=data(transpile('src/v2/core/progression.ts'));
const {createV2DemoProgress}=await import(progressURL);
const source=transpile('src/v2/core/demoQuests.ts');
const {
  V2_DEMO_QUEST_DEFINITIONS,createV2DemoQuestState,
  v2DemoQuestPeriods,recordV2DemoQuestVictory,
  listV2DemoQuests,claimV2DemoQuest,parseV2DemoQuestState,
}=await import(data(source));
const moment=Date.parse('2026-10-24T11:30:00Z'); // Saturday UTC
const sun=Date.parse('2026-10-25T11:30:00Z'); // Sunday UTC, new weekly period
const mon=Date.parse('2026-10-26T11:30:00Z');
const original=createV2DemoQuestState(moment);
assert.equal(original.dayKey,'2026-10-24');
assert.equal(original.weekKey,'2026-10-18','week starts Sunday at 00:00 UTC');
assert.deepEqual(v2DemoQuestPeriods(Date.parse('2026-10-24T23:59:59.999Z')),
 {day:'2026-10-24',week:'2026-10-18'});
assert.deepEqual(v2DemoQuestPeriods(Date.parse('2026-10-25T00:00:00.000Z')),
 {day:'2026-10-25',week:'2026-10-25'});
assert.deepEqual(v2DemoQuestPeriods(Date.parse('2026-03-29T00:00:00Z')),
 {day:'2026-03-29',week:'2026-03-29'},'DST must never affect UTC reset');
assert.deepEqual(v2DemoQuestPeriods(sun),{day:'2026-10-25',week:'2026-10-25'});
assert.deepEqual(v2DemoQuestPeriods(mon),{day:'2026-10-26',week:'2026-10-25'});
assert.throws(()=>v2DemoQuestPeriods(NaN),RangeError);
assert.equal(V2_DEMO_QUEST_DEFINITIONS.length,7);
let q=original;
const receipt=i=>'v2-demo-encounter-'+i;
q=recordV2DemoQuestVictory(q,receipt(1),false,moment);
const once=q;
assert.strictEqual(recordV2DemoQuestVictory(q,receipt(1),true,moment),once,
  'duplicated battle receipt cannot increase quest counters, even changed boss flag');
assert.equal(q.dayWins,1);
assert.equal(q.dayBosses,0);
assert.equal(q.weekWins,1);
assert.equal(recordV2DemoQuestVictory(q,'fake receipt',true,moment),q);
q=recordV2DemoQuestVictory(q,receipt(2),false,moment);
q=recordV2DemoQuestVictory(q,receipt(3),true,moment);
assert.equal(q.dayWins,3);
assert.equal(q.dayBosses,1);
assert.equal(q.weekWins,3);
assert.equal(q.weekBosses,1);
let progress={...createV2DemoProgress(),wins:3,bosses:1};
let quests=listV2DemoQuests(q,progress,2,moment);
assert.equal(quests.filter(x=>x.ready).length,5);
const first=quests.find(x=>x.definition.id==='first_win');
assert.equal(first.key,'first_win@story');
const taken=claimV2DemoQuest(q,'first_win',progress,2,moment);
assert.deepEqual(claimV2DemoQuest(taken,'first_win',progress,2,moment),taken,
  'claim can be redeemed only once');
assert.equal(taken.claimed.length,1);
assert.equal(listV2DemoQuests(taken,progress,2,moment).find(x=>x.definition.id==='first_win').claimed,true);
assert.equal(claimV2DemoQuest(q,'week_wins',progress,2,moment),q,
  'claim before achievement completes is forbidden');
assert.equal(claimV2DemoQuest(q,'not_a_quest',progress,2,moment),q);
let newDay=recordV2DemoQuestVictory(taken,receipt(4),false,sun);
assert.equal(newDay.dayWins,1);
assert.equal(newDay.dayBosses,0);
assert.equal(newDay.weekWins,1);
assert.equal(newDay.weekBosses,0);
assert.equal(newDay.weekKey,'2026-10-25');
assert.equal(newDay.claimed[0],'first_win@story','story receipts survive period rollovers');
assert.strictEqual(recordV2DemoQuestVictory(newDay,receipt(1),false,sun),newDay,
  'old encounter cannot be replayed into a new period');
for(let i=5;i<16;i++)newDay=recordV2DemoQuestVictory(newDay,receipt(i),i===8||i===10,sun);
assert.equal(newDay.weekWins,12);
assert.equal(newDay.weekBosses,2);
progress={...progress,wins:15,bosses:3};
quests=listV2DemoQuests(newDay,progress,2,sun);
assert.equal(quests.find(x=>x.definition.id==='week_wins').ready,true);
assert.equal(quests.find(x=>x.definition.id==='week_boss').ready,true);
const claimed=claimV2DemoQuest(newDay,'week_wins',progress,2,sun);
assert.equal(claimed.claimed.at(-1),'week_wins@2026-10-25');
assert.equal(claimV2DemoQuest(claimed,'week_wins',progress,2,mon).claimed.length,2);
assert.deepEqual(parseV2DemoQuestState(JSON.parse(JSON.stringify(claimed))),claimed);
for(const payload of [
  {...claimed,version:2},
  {...claimed,dayWins:-1},
  {...claimed,dayBosses:999},
  {...claimed,claimed:['week_wins@2026-10-25','week_wins@2026-10-25']},
  {...claimed,claimed:['wallet.add@2026-10-25']},
  {...claimed,seenBattles:['v2-demo-encounter-1','v2-demo-encounter-1']},
  {...claimed,seenBattles:['bogus']},
]){
  assert.equal(parseV2DemoQuestState(payload),null,'damaged or forged quest ledger accepted');
}
const logic=readFileSync('src/v2/core/demoQuests.ts','utf8');
assert(!logic.includes('SUPABASE_')&&!logic.includes('service_role'));
assert(!logic.includes('Math.random'));
const app=readFileSync('src/v2/NextApp.tsx','utf8');
assert(app.includes('recordV2DemoQuestVictory('));
assert(app.includes('claimV2DemoQuest('));
assert(app.includes('quests:questState'),'Must persist all quest state with other V2 demo data');
const drawer=readFileSync('src/v2/QuestExperience.tsx','utf8');
assert(drawer.includes('onClaim(d.id)')&&drawer.includes('disabled={!row.ready}'));
assert(drawer.includes('mode===\'events\'')&&drawer.includes('mode===\'rewards\''));
assert(!drawer.includes('gold+')&&!drawer.includes('setProgress('),'Quest receipt must not mint fake currency');
console.log('OK: V2 story/daily/weekly quests, Sunday at 00:00 UTC, single claim, idempotent kills, rollover, browser persistence, zero wallet access');
