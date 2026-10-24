import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {PGlite} from '@electric-sql/pglite';

const schema=readFileSync('server/staging/territory_v2_schema.sql','utf8');
const pve=readFileSync('server/staging/territory_v2_pve_protocol.sql','utf8');
const db=new PGlite();
const p1='11111111-1111-4111-8111-111111111111';
const p2='22222222-2222-4222-8222-222222222222';
const c1='33333333-3333-4333-8333-333333333333';
const c2='44444444-4444-4444-8444-444444444444';
const b1='55555555-5555-4555-8555-555555555555';
const b2='66666666-6666-4666-8666-666666666666';
const b3='77777777-7777-4777-8777-777777777777';
const receipt='88888888-8888-4888-8888-888888888888';
const secondReceipt='99999999-9999-4999-8999-999999999999';
const hash='a'.repeat(64);
const trace='b'.repeat(64);
const open=(p,c,b,version='test_rules',snapshot=hash)=>db.query(
  'select territory_v2.begin_authoritative_pve($1::uuid,$2::uuid,$3::uuid,$4::text,$5::text) as id',
  [p,c,b,version,snapshot]);
const settle=(b,r,traceHash,outcome,reason,turns)=>db.query(
  'select territory_v2.record_authoritative_pve_result($1::uuid,$2::uuid,$3::text,$4::text,$5::text,$6::integer) as result',
  [b,r,traceHash,outcome,reason,turns]);
const snapshot=async()=>({
  sessions:Number((await db.query('select count(*) as count from territory_v2.battle_sessions')).rows[0].count),
  receipts:Number((await db.query('select count(*) as count from territory_v2.operation_receipts')).rows[0].count),
  ledger:Number((await db.query('select count(*) as count from territory_v2.wallet_ledger')).rows[0].count)
});
try {
  assert(!/\b(?:drop|truncate)\s+(?:table|schema)/i.test(pve.replace(/--[^\n]*/g,'')));
  await db.exec('create role anon; create role authenticated; create role service_role bypassrls;');
  await db.exec(schema);
  await db.exec(pve);
  const grants=await db.query(`select
    has_function_privilege('anon','territory_v2.begin_authoritative_pve(uuid,uuid,uuid,text,text)','EXECUTE') as begin_anon,
    has_function_privilege('authenticated','territory_v2.record_authoritative_pve_result(uuid,uuid,text,text,text,integer)','EXECUTE') as settle_auth,
    has_function_privilege('service_role','territory_v2.begin_authoritative_pve(uuid,uuid,uuid,text,text)','EXECUTE') as begin_service,
    has_function_privilege('service_role','territory_v2.record_authoritative_pve_result(uuid,uuid,text,text,text,integer)','EXECUTE') as settle_service`);
  assert.deepEqual(grants.rows,[{begin_anon:false,settle_auth:false,begin_service:true,settle_service:true}]);
  const rls=await db.query("select tablename,rowsecurity from pg_tables where schemaname='territory_v2' and tablename like 'pve_%'");
  assert.equal(rls.rows.length,2);
  assert(rls.rows.every(x=>x.rowsecurity===true));
  await db.query("insert into territory_v2.players(id,telegram_user_id) values($1,1),($2,2)",[p1,p2]);
  await db.query("insert into territory_v2.characters(id,player_id,class_id) values($1,$2,'berserker'),($3,$4,'ranger')",[c1,p1,c2,p2]);
  await db.exec("insert into territory_v2.pve_rulebooks(version,config,enabled) values ('test_rules','{\"maxTurns\":20}'::jsonb,true),('off_rules','{}'::jsonb,false)");
  await db.exec('set role service_role');
  await assert.rejects(()=>open(p1,c2,b1),/PVE_CHARACTER_NOT_OWNED/);
  await assert.rejects(()=>open(p1,c1,b1,'off_rules'),/PVE_RULES_NOT_ENABLED/);
  assert.equal((await open(p1,c1,b1)).rows[0].id,b1);
  assert.equal((await open(p1,c1,b1)).rows[0].id,b1,'same operation repeats safely');
  await assert.rejects(()=>open(p2,c2,b1),/PVE_START_CONFLICT|PVE_CHARACTER_NOT_OWNED/);
  await assert.rejects(()=>open(p1,c1,b1,'test_rules','c'.repeat(64)),/PVE_START_CONFLICT/);
  await assert.rejects(()=>open(p1,c1,b2),/PVE_ACTIVE_BATTLE_EXISTS/);
  assert.deepEqual(await snapshot(),{sessions:1,receipts:0,ledger:0});
  const res=(await settle(b1,receipt,trace,'victory','enemy_defeated',3)).rows[0].result;
  assert.equal(res.awardsGranted,false);
  assert.equal(res.outcome,'victory');
  assert.equal(res.receiptId,receipt);
  assert.deepEqual((await settle(b1,receipt,trace,'victory','enemy_defeated',3)).rows[0].result,res);
  await assert.rejects(()=>settle(b1,secondReceipt,trace,'victory','enemy_defeated',3),/PVE_RESULT_CONFLICT/);
  await assert.rejects(()=>settle(b1,receipt,'c'.repeat(64),'victory','enemy_defeated',3),/PVE_RESULT_CONFLICT/);
  await assert.rejects(()=>settle(b1,receipt,trace,'defeat','hero_defeated',3),/PVE_RESULT_CONFLICT/);
  await assert.rejects(()=>settle(b2,secondReceipt,trace,'victory','enemy_defeated',2),/PVE_BATTLE_NOT_FOUND/);
  await assert.rejects(()=>settle(b1,receipt,trace,'victory','turn_limit',4),/INVALID_PVE_RESULT/);
  assert.deepEqual(await snapshot(),{sessions:1,receipts:1,ledger:0},'resolve never produces money or XP');
  const x=await db.query('select stage_chapter,stage_wave,level,xp from territory_v2.characters where id=$1',[c1]);
  assert.equal(x.rows[0].stage_chapter,1);
  assert.equal(x.rows[0].stage_wave,1);
  assert.equal(Number(x.rows[0].xp),0);
  assert.equal((await open(p1,c1,b2)).rows[0].id,b2,'after settlement another fight can start');
  assert.deepEqual(await snapshot(),{sessions:2,receipts:1,ledger:0});
  await db.exec('reset role');
  await db.exec('set role anon');
  await assert.rejects(()=>open(p1,c1,b3),/permission denied/i);
  await assert.rejects(()=>settle(b1,receipt,trace,'victory','enemy_defeated',3),/permission denied/i);
  await db.exec('reset role');
  console.log('OK: PvE lifecycle in private PostgreSQL: authorized ownership, one active, idempotent final receipt, no fake progress or wallet reward, anon denied');
} finally {await db.close();}
