import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import ts from 'typescript';
const input=readFileSync('src/v2/core/demoPort.ts','utf8');
const js=ts.transpileModule(input,{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}}).outputText;
const {
 V2_DEMO_MINING_DURATION_MS,V2_DEMO_PROFESSION_LEVEL_CAP,
 V2_DEMO_PROFESSION_UNLOCK_BLUE_GEMS,V2_DEMO_RESOURCES,
 createV2DemoMiningState,parseV2DemoMiningState,beginV2DemoMining,
 claimV2DemoMining,cancelV2DemoMining,v2DemoMiningSecondsLeft,
}=await import('data:text/javascript;base64,'+Buffer.from(js).toString('base64'));
const ms=Date.parse('2026-10-24T09:30:00Z');
assert.equal(V2_DEMO_MINING_DURATION_MS,14400000,'Owner-approved one extraction = four hours');
assert.equal(V2_DEMO_PROFESSION_LEVEL_CAP,300);
assert.equal(V2_DEMO_PROFESSION_UNLOCK_BLUE_GEMS,1000);
assert.equal(V2_DEMO_RESOURCES.length,3,'UI has three DEMO examples, not a promise of profession taxonomy');
let state=createV2DemoMiningState();
assert.equal(state.version,1);
assert.equal(v2DemoMiningSecondsLeft(state,ms),0);
const first=beginV2DemoMining(state,'ore',ms);
assert.equal(first.job.id,1);
assert.equal(first.job.finishAt,ms+V2_DEMO_MINING_DURATION_MS);
assert.equal(v2DemoMiningSecondsLeft(first,ms),14400);
assert.equal(v2DemoMiningSecondsLeft(first,ms+3600000),10800);
assert.equal(v2DemoMiningSecondsLeft(first,ms+V2_DEMO_MINING_DURATION_MS),0);
assert.strictEqual(beginV2DemoMining(first,'wood',ms+1000),first,'one active job at any time');
assert.strictEqual(beginV2DemoMining(first,'herbs',ms+V2_DEMO_MINING_DURATION_MS+1),first,'must claim before another job');
assert.strictEqual(claimV2DemoMining(first,ms+V2_DEMO_MINING_DURATION_MS-1),first,'no early claim');
assert.strictEqual(claimV2DemoMining(first,ms-100000),first,'rewinding device clock cannot grant claim');
const claimed=claimV2DemoMining(first,ms+V2_DEMO_MINING_DURATION_MS);
assert.equal(claimed.job,null);
assert.deepEqual(claimed.claimedJobs,[1]);
assert.deepEqual(claimV2DemoMining(claimed,ms+V2_DEMO_MINING_DURATION_MS),claimed,'no second claim');
const second=beginV2DemoMining(claimed,'wood',ms+V2_DEMO_MINING_DURATION_MS+1);
assert.equal(second.job.id,2);
const cancelled=cancelV2DemoMining(second);
assert.equal(cancelled.job,null);
assert.deepEqual(cancelled.cancelledJobs,[2]);
assert.equal(cancelV2DemoMining(cancelled),cancelled);
const serialized=parseV2DemoMiningState(JSON.parse(JSON.stringify(cancelled)));
assert.deepEqual(serialized,cancelled);
for(const candidate of [
 {...first,version:2},
 {...first,nextJobId:1},
 {...first,job:{...first.job,finishAt:ms+3600000}},
 {...first,job:{...first.job,resource:'red_gems'}},
 {...claimed,claimedJobs:[1,1]},
 {...claimed,claimedJobs:[2]},
 {...claimed,cancelledJobs:[1]},
 {...claimed,nextJobId:-1},
 {...first,job:{...first.job,startedAt:-1}},
 {...first,job:{...first.job,id:99999999}},
]){
 assert.equal(parseV2DemoMiningState(candidate),null,
   'Invalid or tampered mining job must not be restored');
}
assert.strictEqual(beginV2DemoMining(state,'gems',ms),state,'no invented currency mining');
assert.strictEqual(beginV2DemoMining(state,'ore',NaN),state);
const app=readFileSync('src/v2/NextApp.tsx','utf8');
assert(app.includes("overlay==='port'||overlay==='professions'"),'Port and professions screens must be live');
assert(app.includes('onClaim={()=>setMiningState(s=>claimV2DemoMining(s,Date.now()))}'));
assert(app.includes('mining:miningState'),'Mining job must be included in isolated V2 save');
const save=readFileSync('src/v2/core/localDemoSave.ts','utf8');
assert(save.includes('parseV2DemoMiningState(raw.mining)'),'must validate data from untrusted localStorage');
const ui=readFileSync('src/v2/PortExperience.tsx','utf8');
assert(ui.includes('V2_DEMO_PROFESSION_UNLOCK_BLUE_GEMS'));
assert(ui.includes('V2_DEMO_PROFESSION_LEVEL_CAP'));
assert(ui.includes('Тестовый таймер'));
assert(ui.includes('одну добычу')||ui.includes('одна добыча'));
assert(!/wallet_ledger|apply_wallet_delta|SUPABASE_SERVICE_ROLE_KEY/.test(input+ui));
assert(!/\.v2-battle\.v2-biome|city-bg|winter-stage/i.test(readFileSync('src/v2/portExperience.css','utf8')),
  'Port UI must never polish or change battle background');
console.log('OK: four-hour V2 mining, one active, cancel/claim exactly once, immutable job clock, 300 profession cap, no wallet or background writes');
