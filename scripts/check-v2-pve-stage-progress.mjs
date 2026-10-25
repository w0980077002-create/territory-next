import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {PGlite} from '@electric-sql/pglite';

const read=(name)=>readFileSync(name,'utf8');
const migration=read('server/staging/territory_v2_pve_stage_progress.sql');
const db=new PGlite();
const id=(n)=>n.toString(16).padStart(8,'0')+'-0000-4000-8000-'+n.toString(16).padStart(12,'0');
const [p1,p2,c1,c2]=[1,2,3,4].map(id);
const hash='a'.repeat(64);
const trace='b'.repeat(64);
const open=(player,character,battle)=>db.query(
  'select territory_v2.begin_authoritative_pve($1::uuid,$2::uuid,$3::uuid,$4::text,$5::text)',
  [player,character,battle,'v2_test',hash]);
const settle=(battle,receipt,outcome='victory')=>db.query(
  'select territory_v2.record_authoritative_pve_result($1::uuid,$2::uuid,$3::text,$4::text,$5::text,$6::integer)',
  [battle,receipt,trace,outcome,outcome==='victory'?'enemy_defeated':'hero_defeated',7]);
const clear=(battle,receipt)=>db.query(
  'select territory_v2.record_authoritative_stage_clear($1::uuid,$2::uuid) as result',
  [battle,receipt]);
const character=async(cid)=>{
  const r=await db.query('select stage_chapter,stage_wave,highest_unlocked_chapter,revision,xp from territory_v2.characters where id=$1',[cid]);
  return r.rows[0];
};
const counts=async()=>({
  clears:Number((await db.query('select count(*) as n from territory_v2.pve_stage_clears')).rows[0].n),
  receipts:Number((await db.query('select count(*) as n from territory_v2.operation_receipts')).rows[0].n),
  ledger:Number((await db.query('select count(*) as n from territory_v2.wallet_ledger')).rows[0].n),
  items:Number((await db.query('select count(*) as n from territory_v2.item_instances')).rows[0].n),
});
try {
  const executable=migration.replace(/--[^\n]*/g,'');
  assert(!/\b(?:drop|truncate)\s+(?:table|schema)/i.test(executable));
  assert(!/security\s+definer/i.test(executable));
  assert(!/\b(?:public\.|auth\.|storage\.)/i.test(executable));
  await db.exec('create role anon; create role authenticated; create role service_role bypassrls;');
  await db.exec(read('server/staging/territory_v2_schema.sql'));
  await db.exec(read('server/staging/territory_v2_pve_protocol.sql'));
  await db.exec(migration);
  // Reapplying a migration must preserve existing rows and keep functions private.
  await db.exec(migration);
  const permissions=await db.query(`select
    has_function_privilege('anon','territory_v2.record_authoritative_stage_clear(uuid,uuid)','EXECUTE') as anon,
    has_function_privilege('authenticated','territory_v2.record_authoritative_stage_clear(uuid,uuid)','EXECUTE') as authenticated,
    has_function_privilege('service_role','territory_v2.record_authoritative_stage_clear(uuid,uuid)','EXECUTE') as service,
    (select rowsecurity from pg_tables where schemaname='territory_v2' and tablename='pve_stage_clears') as rls`);
  assert.deepEqual(permissions.rows,[{anon:false,authenticated:false,service:true,rls:true}]);
  await db.query('insert into territory_v2.players(id,telegram_user_id) values($1,11),($2,22)',[p1,p2]);
  await db.query("insert into territory_v2.characters(id,player_id,class_id) values($1,$2,'berserker'),($3,$4,'ranger')",[c1,p1,c2,p2]);
  await db.exec("insert into territory_v2.pve_rulebooks(version,config,enabled) values('v2_test','{}'::jsonb,true)");
  await db.exec('set role service_role');

  const b1=id(11),r1=id(12),a1=id(13);
  await assert.rejects(()=>clear(id(999),a1),/PVE_STAGE_BATTLE_NOT_FOUND/);
  await open(p1,c1,b1);
  await assert.rejects(()=>clear(b1,a1),/PVE_STAGE_REQUIRES_SETTLED_VICTORY/);
  assert.deepEqual(await counts(),{clears:0,receipts:0,ledger:0,items:0});
  await settle(b1,r1);
  const first=(await clear(b1,a1)).rows[0].result;
  assert.equal(first.chapter,1);
  assert.equal(first.wave,1);
  assert.equal(first.nextChapter,1);
  assert.equal(first.nextWave,2);
  assert.equal(first.campaignCompleted,false);
  assert.equal(first.xpGranted,false);
  assert.equal(first.awardsGranted,false);
  assert.deepEqual((await clear(b1,a1)).rows[0].result,first,'same battle+receipt must replay exactly');
  await assert.rejects(()=>clear(b1,id(14)),/PVE_STAGE_CLEAR_CONFLICT/);
  assert.deepEqual(await character(c1),{
    stage_chapter:1,stage_wave:2,highest_unlocked_chapter:1,revision:'1',xp:'0'
  });
  assert.deepEqual(await counts(),{clears:1,receipts:2,ledger:0,items:0});

  // A defeat may settle but can never unlock the next wave.
  const b2=id(21),r2=id(22);
  await open(p1,c1,b2);
  await settle(b2,r2,'defeat');
  await assert.rejects(()=>clear(b2,id(23)),/PVE_STAGE_REQUIRES_SETTLED_VICTORY/);
  assert.equal((await character(c1)).stage_wave,2);

  // A new victory at the same stage advances only once.
  const b3=id(31),r3=id(32),a3=id(33);
  await open(p1,c1,b3);
  await settle(b3,r3);
  await assert.rejects(()=>clear(b3,a1),/PVE_STAGE_RECEIPT_CONFLICT/);
  await clear(b3,a3);
  assert.equal((await character(c1)).stage_wave,3);

  // Stale settled result cannot skip a stage after a separate server update.
  const b4=id(41),r4=id(42);
  await open(p1,c1,b4);
  await settle(b4,r4);
  await db.query('update territory_v2.characters set stage_wave=4 where id=$1',[c1]);
  await assert.rejects(()=>clear(b4,id(43)),/PVE_STAGE_OUTDATED/);

  // Another player has an independent lock, receipt and progression.
  const b5=id(51),r5=id(52),a5=id(53);
  await open(p2,c2,b5);
  await settle(b5,r5);
  await clear(b5,a5);
  assert.equal((await character(c2)).stage_wave,2);
  assert.equal((await character(c1)).stage_wave,4);

  // Last wave of chapter 1 -> first wave of chapter 2, no hidden XP.
  await db.query('update territory_v2.characters set stage_chapter=1,stage_wave=20 where id=$1',[c1]);
  const b6=id(61),r6=id(62),a6=id(63);
  await open(p1,c1,b6);
  await settle(b6,r6);
  const rollover=(await clear(b6,a6)).rows[0].result;
  assert.equal(rollover.nextChapter,2);
  assert.equal(rollover.nextWave,1);
  assert.equal((await character(c1)).highest_unlocked_chapter,2);

  // Final wave is terminal and can be cleared once, not farmed for receipts.
  await db.query('update territory_v2.characters set stage_chapter=5,stage_wave=20,highest_unlocked_chapter=5 where id=$1',[c1]);
  const b7=id(71),r7=id(72),a7=id(73);
  await open(p1,c1,b7);
  await settle(b7,r7);
  const ending=(await clear(b7,a7)).rows[0].result;
  assert.equal(ending.campaignCompleted,true);
  assert.equal(ending.nextChapter,5);
  assert.equal(ending.nextWave,20);
  assert.deepEqual((await clear(b7,a7)).rows[0].result,ending);
  const b8=id(81),r8=id(82);
  await open(p1,c1,b8);
  await settle(b8,r8);
  const before=await counts();
  await assert.rejects(()=>clear(b8,id(83)),/PVE_STAGE_ALREADY_CLEARED/);
  assert.deepEqual(await counts(),before,'failed replay cannot leave a receipt');
  assert.equal(Number((await character(c1)).xp),0);
  assert.equal((await counts()).ledger,0);
  assert.equal((await counts()).items,0);

  await db.exec('reset role');
  await db.exec('set role authenticated');
  await assert.rejects(()=>clear(b1,a1),/permission denied/i);
  await db.exec('reset role');
  await db.exec('set role anon');
  await assert.rejects(()=>clear(b1,a1),/permission denied/i);
  console.log('OK: private PvE first-clear, 5x20 stage progression, idempotency, stale/defeat/duplicate rejection, zero payouts, RLS');
} finally {
  await db.close();
}
