import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import ts from 'typescript';

const source=readFileSync('server/combat/resolvePve.ts','utf8');
const code=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}}).outputText;
const {resolvePveEncounter,validatePveEncounter}=await import('data:text/javascript;base64,'+Buffer.from(code).toString('base64'));

const hero={hp:240,attack:45,defense:12,critBps:0,dodgeBps:0};
const enemy={hp:95,attack:16,defense:4,critBps:0,dodgeBps:0};
const rules={version:'local_pve_test',maxTurns:30,enemyAttackEvery:2,defenseReductionBps:5000,
criticalMultiplierBps:15000,bossRageThresholdBps:5000,bossRageMultiplierBps:14000};
const base={battleId:'88888888-8888-4888-8888-888888888888',
stageId:'chapter1.wave1',classId:'berserker',isBoss:false,hero,enemy,seed:87654321,rules};
const result=resolvePveEncounter(base);
assert.equal(result.outcome,'victory');
assert.equal(result.reason,'enemy_defeated');
assert.equal(result.finalEnemyHp,0);
assert(result.turns>=2 && result.turns<=rules.maxTurns);
assert.equal(result.rulesetVersion,rules.version);
assert.deepEqual(resolvePveEncounter(base),result,'same immutable snapshot and seed -> identical replay');
assert.equal(result.events.filter(x=>x.kind==='death').length,1);
assert(result.events.every(x=>x.damage>=0 && x.heroHp>=0 && x.enemyHp>=0));
assert(result.events.every(x=>Number.isSafeInteger(x.turn)&&x.turn>=1));
const defeat=resolvePveEncounter({...base,hero:{...hero,hp:12,attack:1},enemy:{...enemy,hp:200,attack:900}});
assert.equal(defeat.outcome,'defeat');
assert.equal(defeat.reason,'hero_defeated');
assert.equal(defeat.finalHeroHp,0);
const timeout=resolvePveEncounter({...base,hero:{...hero,attack:1},enemy:{...enemy,hp:999999,attack:1},rules:{...rules,maxTurns:3,enemyAttackEvery:2}});
assert.equal(timeout.outcome,'defeat','timeout is never presented as victory');
assert.equal(timeout.reason,'turn_limit');
assert.equal(timeout.turns,3);
const boss=resolvePveEncounter({...base,isBoss:true,enemy:{...enemy,hp:240,attack:20},rules:{...rules,maxTurns:30,bossRageThresholdBps:9000}});
assert.equal(boss.events.filter(x=>x.kind==='boss_rage').length,1,'boss phase must fire once');
const dodge=resolvePveEncounter({...base,enemy:{...enemy,dodgeBps:10000},rules:{...rules,maxTurns:3}});
assert(dodge.events.some(x=>x.kind==='dodge'&&x.source==='hero'));
const crit=resolvePveEncounter({...base,hero:{...hero,critBps:10000}});
assert(crit.events.some(x=>x.kind==='critical'&&x.source==='hero'));
for(const changed of [
  {battleId:'not-a-uuid'},
  {stageId:'../../admin'},
  {seed:0},
  {seed:NaN},
  {rules:{...rules,maxTurns:0}},
  {rules:{...rules,maxTurns:999999}},
  {rules:{...rules,enemyAttackEvery:0}},
  {rules:{...rules,criticalMultiplierBps:0}},
  {rules:{...rules,bossRageMultiplierBps:100000}},
  {hero:{...hero,hp:-1}},
  {hero:{...hero,critBps:20000}},
  {enemy:{...enemy,attack:1e20}},
]) {
  assert.throws(()=>validatePveEncounter({...base,...changed}),RangeError,'invalid battle/config must be rejected');
}
assert(!/(Math\.random\s*\(|fetch\s*\(|createClient\s*\(|supabase|grantGold|wallet_ledger)/.test(source.replace(/\/\*[\s\S]*?\*\//g,'')),
  'simulation engine must not grant rewards or call browser/client API');
assert(!readFileSync('src/v2/NextApp.tsx','utf8').includes('server/combat/resolvePve'),
  'server combat code must not be imported into static demo');
console.log('OK: validated server-only combat, victory, defeat, timeout, boss phase, replay, 12 malicious inputs, no client awards');
