import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import ts from 'typescript';
const js=ts.transpileModule(readFileSync('src/v2/core/demoMail.ts','utf8'),{
 compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022},
}).outputText;
const {
 createV2DemoMailState,listV2DemoMail,recordV2DemoMailBattle,
 updateV2DemoMail,parseV2DemoMailState,V2_DEMO_MAIL_LIMIT,
}=await import('data:text/javascript;base64,'+Buffer.from(js).toString('base64'));
let s=createV2DemoMailState();
assert.equal(listV2DemoMail(s).length,3);
assert.equal(listV2DemoMail(s)[0].id,'welcome');
const t=Date.parse('2026-10-26T15:00:00Z');
assert.strictEqual(recordV2DemoMailBattle(s,'v2-demo-encounter-1',1,t),s,'ordinary kills are not mail spam');
assert.strictEqual(recordV2DemoMailBattle(s,'v2-demo-encounter-1',5,NaN),s);
assert.strictEqual(recordV2DemoMailBattle(s,'v2-demo-encounter-1',101,t),s);
assert.strictEqual(recordV2DemoMailBattle(s,'bogus',5,t),s);
s=recordV2DemoMailBattle(s,'v2-demo-encounter-1',5,t);
assert.equal(s.reports[0].kind,'elite');
assert.equal(listV2DemoMail(s)[0].id,'battle:v2-demo-encounter-1');
assert.equal(listV2DemoMail(s)[0].sentAt,'2026-10-26 15:00 UTC');
assert.strictEqual(recordV2DemoMailBattle(s,'v2-demo-encounter-1',10,t+1),s,'receipt is idempotent');
const invalidId='battle:v2-demo-encounter-999';
assert.strictEqual(updateV2DemoMail(s,'read',invalidId),s);
s=updateV2DemoMail(s,'read','welcome');
assert.equal(s.read.length,1);
assert.strictEqual(updateV2DemoMail(s,'read','welcome'),s);
s=updateV2DemoMail(s,'review','welcome');
assert.deepEqual(s.reviewed,['welcome']);
s=updateV2DemoMail(s,'archive','welcome');
assert.deepEqual(s.archived,['welcome']);
s=updateV2DemoMail(s,'restore','welcome');
assert.equal(s.archived.length,0);
s=updateV2DemoMail(s,'read-all');
assert.equal(s.read.length,4);
assert.strictEqual(updateV2DemoMail(s,'read-all'),s);
assert.deepEqual(parseV2DemoMailState(JSON.parse(JSON.stringify(s))),s);
for(let i=2;i<90;i++)s=recordV2DemoMailBattle(s,'v2-demo-encounter-'+i,i%2?20:10,t+i);
assert.equal(s.reports.length,V2_DEMO_MAIL_LIMIT);
assert.equal(listV2DemoMail(s).length,V2_DEMO_MAIL_LIMIT+3);
assert.equal(s.read.filter(x=>x.startsWith('battle:')).length,0,'evicted read IDs pruned');
assert.equal(s.reports.at(-1).receiptId,'v2-demo-encounter-89');
for(const bad of [
 {...s,version:2},
 {...s,read:['unlisted']},
 {...s,read:['welcome','welcome']},
 {...s,reviewed:['welcome'],read:[]},
 {...s,archived:['welcome'],read:[]},
 {...s,reports:[...s.reports,s.reports[0]]},
 {...s,reports:s.reports.map((r,i)=>i===0?{...r,stageId:1}:r)},
 {...s,reports:s.reports.map((r,i)=>i===0?{...r,wonAt:-1}:r)},
]){
 assert.equal(parseV2DemoMailState(bad),null,'forged mail state accepted');
}
const src=readFileSync('src/v2/core/demoMail.ts','utf8');
assert(!src.includes('supabase')&&!src.includes('service_role')&&!src.includes('localStorage'));
console.log('OK: V2 offline mail history, receipts, archive/read/review, retention and validation');
