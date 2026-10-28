import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import ts from 'typescript';
import {PGlite} from '@electric-sql/pglite';

const read=(file)=>readFileSync(file,'utf8');
const js=(file)=>ts.transpileModule(read(file),{compilerOptions:{
  module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022
}}).outputText;
const combatUrl='data:text/javascript;base64,'+
  Buffer.from(js('server/combat/resolvePve.ts')).toString('base64');
const orchestratorJs=js('server/combat/runAuthoritativePve.ts')
  .replace(/from ['"]\.\/resolvePve\.ts['"]/, 'from "'+combatUrl+'"');
const orchestrator=await import('data:text/javascript;base64,'+
  Buffer.from(orchestratorJs).toString('base64'));
const {beginServerPve,resumeServerPve,finishServerPve}=orchestrator;
const db=new PGlite();
const uid=n=>n.toString(16).padStart(8,'0')+'-0000-4000-8000-'+n.toString(16).padStart(12,'0');
const [p1,p2,c1,c2]=[1,2,3,4].map(uid);
const hero={hp:240,attack:45,defense:12,critBps:0,dodgeBps:0};
const enemy={hp:95,attack:16,defense:4,critBps:0,dodgeBps:0};
const hard={hp:9999,attack:900,defense:10,critBps:0,dodgeBps:0};
const rules={maxTurns:30,enemyAttackEvery:2,defenseReductionBps:5000,
  criticalMultiplierBps:15000,bossRageThresholdBps:5000,bossRageMultiplierBps:14000};
const sql={unsafe:async(query,params)=>(await db.query(query,[...params])).rows};
const user1={telegramUserId:111},user2={telegramUserId:222};
const directBegin=(user,battle,seed=123)=>db.query(
  'select territory_v2.begin_pve_execution($1::bigint,$2::uuid,$3::bigint) as snapshot',
  [user,battle,seed]);
const totals=async()=>({
  receipts:Number((await db.query('select count(*) as n from territory_v2.operation_receipts')).rows[0].n),
  clears:Number((await db.query('select count(*) as n from territory_v2.pve_stage_clears')).rows[0].n),
  ledger:Number((await db.query('select count(*) as n from territory_v2.wallet_ledger')).rows[0].n),
  items:Number((await db.query('select count(*) as n from territory_v2.item_instances')).rows[0].n),
});
try {
  const migration=read('server/staging/territory_v2_pve_execution.sql');
  const noComments=migration.replace(/--[^\n]*/g,'');
  assert(!/\b(?:drop|truncate)\s+(?:table|schema)/i.test(noComments));
  assert(!/security\s+definer/i.test(noComments));
  assert(!/\b(?:public\.|auth\.|storage\.)/i.test(noComments));
  await db.exec('create role anon; create role authenticated; create role service_role bypassrls;');
  for(const file of [
    'server/staging/territory_v2_schema.sql',
    'server/staging/territory_v2_pve_protocol.sql',
    'server/staging/territory_v2_pve_stage_progress.sql',
    'server/staging/territory_v2_pve_execution.sql'
  ])await db.exec(read(file));
  await db.exec(migration); // re-entrant migration, no duplicate trigger
  const grants=await db.query(`select
    has_function_privilege('anon','territory_v2.begin_pve_execution(bigint,uuid,bigint)','EXECUTE') as begin_anon,
    has_function_privilege('authenticated','territory_v2.read_pve_execution(bigint,uuid)','EXECUTE') as read_auth,
    has_function_privilege('anon','territory_v2.finish_pve_execution(bigint,uuid,uuid,uuid,text,text,text,integer)','EXECUTE') as finish_anon,
    has_function_privilege('service_role','territory_v2.finish_pve_execution(bigint,uuid,uuid,uuid,text,text,text,integer)','EXECUTE') as finish_service`);
  assert.deepEqual(grants.rows,[{
    begin_anon:false,read_auth:false,finish_anon:false,finish_service:true
  }]);
  const rls=await db.query(`select tablename,rowsecurity from pg_tables
    where schemaname='territory_v2' and tablename in
    ('pve_class_profiles','pve_stage_profiles','pve_active_rules','pve_execution_snapshots')`);
  assert.equal(rls.rows.length,4);
  assert(rls.rows.every(r=>r.rowsecurity===true));
  await db.query('insert into territory_v2.players(id,telegram_user_id) values($1,111),($2,222)',[p1,p2]);
  await db.query("insert into territory_v2.characters(id,player_id,class_id) values($1,$2,'berserker'),($3,$4,'ranger')",[c1,p1,c2,p2]);
  await db.exec('set role service_role');
  await assert.rejects(()=>directBegin(111,uid(10)),/PVE_EXECUTION_HERO_PROFILE_MISSING/);
  assert.deepEqual(await totals(),{receipts:0,clears:0,ledger:0,items:0});
  await assert.rejects(()=>db.query(
    'insert into territory_v2.pve_class_profiles values($1,$2,$3::jsonb)',
    ['berserker',1,JSON.stringify({...hero,critBps:20000})]),/check constraint/i);
  await db.query('insert into territory_v2.pve_class_profiles values($1,$2,$3::jsonb)',
    ['berserker',1,JSON.stringify(hero)]);
  await db.query('insert into territory_v2.pve_class_profiles values($1,$2,$3::jsonb)',
    ['ranger',1,JSON.stringify(hero)]);
  await db.query('insert into territory_v2.pve_stage_profiles values($1,$2,$3::jsonb,$4)',
    [1,1,JSON.stringify(enemy),false]);
  await db.query('insert into territory_v2.pve_stage_profiles values($1,$2,$3::jsonb,$4)',
    [1,2,JSON.stringify(enemy),false]);
  await db.query('insert into territory_v2.pve_stage_profiles values($1,$2,$3::jsonb,$4)',
    [1,3,JSON.stringify(hard),true]);
  await db.query('insert into territory_v2.pve_rulebooks(version,config,enabled) values($1,$2::jsonb,true)',
    ['test_v1',JSON.stringify(rules)]);
  await assert.rejects(()=>directBegin(111,uid(10)),/PVE_EXECUTION_RULES_MISSING/);
  await db.exec("insert into territory_v2.pve_active_rules(singleton,version) values(true,'test_v1')");
  await assert.rejects(()=>directBegin(333,uid(10)),/PVE_EXECUTION_UNREGISTERED/);
  await assert.rejects(()=>directBegin(111,uid(10),0),/PVE_EXECUTION_INVALID_REQUEST/);

  const first=await beginServerPve(sql,user1);
  assert.equal(first.stageId,'chapter1.wave1');
  assert.equal(first.rulesetVersion,'test_v1');
  assert(!('seed' in first),'seed must never be in the public-facing start result');
  assert(!('hero' in first));
  const persisted=(await directBegin(111,first.battleId,987654321)).rows[0].snapshot;
  assert.equal(persisted.battleId,first.battleId);
  assert.equal(persisted.rules.version,'test_v1');
  assert(Number.isSafeInteger(persisted.seed) && persisted.seed>0,'snapshot keeps a valid server seed');
  assert.deepEqual(await resumeServerPve(sql,user1,first.battleId),first);
  await assert.rejects(()=>resumeServerPve(sql,user2,first.battleId),/V2_PVE_NOT_FOUND/);
  await assert.rejects(()=>finishServerPve(sql,user2,first.battleId),/V2_PVE_NOT_FOUND/);
  await assert.rejects(()=>beginServerPve(sql,user1),/PVE_ACTIVE_BATTLE_EXISTS/);
  await assert.rejects(()=>db.query(
    'update territory_v2.pve_execution_snapshots set snapshot=$1::jsonb where battle_id=$2',
    ['{}',first.battleId]),/PVE_SNAPSHOT_IMMUTABLE/);
  // Profile changes after start cannot affect this immutable battle.
  await db.query('update territory_v2.pve_class_profiles set stats=$1::jsonb where class_id=$2',
    [JSON.stringify({...hero,hp:1,attack:1}),'berserker']);
  const won=await finishServerPve(sql,user1,first.battleId);
  assert.equal(won.battle.outcome,'victory');
  assert.equal(won.firstClear.nextWave,2);
  assert.equal(won.awardsGranted,false);
  assert.deepEqual(await finishServerPve(sql,user1,first.battleId),won,
    'repeated server settle must replay identical receipt and progress');
  assert.deepEqual(await totals(),{receipts:2,clears:1,ledger:0,items:0});

  // Restore test class profile; next stage will be used to verify atomicity.
  await db.query('update territory_v2.pve_class_profiles set stats=$1::jsonb where class_id=$2',
    [JSON.stringify(hero),'berserker']);
  const second=await beginServerPve(sql,user1);
  assert.equal(second.stageId,'chapter1.wave2');
  await db.query('update territory_v2.characters set stage_wave=3 where id=$1',[c1]);
  const before=await totals();
  await assert.rejects(()=>finishServerPve(sql,user1,second.battleId),/PVE_STAGE_OUTDATED/);
  assert.deepEqual(await totals(),before,'failed stage clear rolls back resolve receipt too');
  const state=(await db.query('select status from territory_v2.battle_sessions where id=$1',[second.battleId])).rows[0];
  assert.equal(state.status,'running');
  await db.query('update territory_v2.characters set stage_wave=2 where id=$1',[c1]);
  const secondResult=await finishServerPve(sql,user1,second.battleId);
  assert.equal(secondResult.battle.outcome,'victory');
  assert.equal(secondResult.firstClear.nextWave,3);

  // A legitimate defeat is recorded but never progresses a stage.
  const third=await beginServerPve(sql,user1);
  assert.equal(third.stageId,'chapter1.wave3');
  const defeated=await finishServerPve(sql,user1,third.battleId);
  assert.equal(defeated.battle.outcome,'defeat');
  assert.equal(defeated.firstClear,null);
  assert.deepEqual(await finishServerPve(sql,user1,third.battleId),defeated);
  const char=(await db.query('select stage_chapter,stage_wave,xp from territory_v2.characters where id=$1',[c1])).rows[0];
  assert.equal(char.stage_chapter,1);assert.equal(char.stage_wave,3);assert.equal(Number(char.xp),0);

  // Other player's battle cannot be resolved using player one's Telegram ID.
  const other=await beginServerPve(sql,user2);
  await assert.rejects(()=>db.query(
    'select territory_v2.finish_pve_execution($1::bigint,$2::uuid,$3::uuid,$4::uuid,$5::text,$6::text,$7::text,$8::integer)',
    [111,other.battleId,uid(901),uid(902),'a'.repeat(64),'victory','enemy_defeated',3]
  ),/PVE_FINISH_NOT_OWNED/);
  const otherResult=await finishServerPve(sql,user2,other.battleId);
  assert.equal(otherResult.battle.outcome,'victory');
  assert.equal(otherResult.firstClear.nextWave,2);
  const after=await totals();
  assert.equal(after.clears,3);
  assert.equal(after.ledger,0);
  assert.equal(after.items,0);

  for(const id of [{telegramUserId:0},{telegramUserId:1.5},null]){
    await assert.rejects(()=>beginServerPve(sql,id),/V2_PVE_IDENTITY_NOT_VERIFIED/);
  }
  await assert.rejects(()=>finishServerPve(sql,user1,'../admin'),/V2_PVE_INVALID_BATTLE_ID/);
  await db.exec('reset role');
  await db.exec('set role anon');
  await assert.rejects(()=>directBegin(111,uid(99)),/permission denied/i);
  await assert.rejects(()=>db.query(
    'select territory_v2.read_pve_execution($1::bigint,$2::uuid)',[111,first.battleId]),
    /permission denied/i);
  console.log('OK: private authoritative PvE start/resume/finish; immutable seeded snapshots; first clear, rollback, replay, defeat, multi-user isolation, RLS and zero rewards');
} finally {
  await db.close();
}
