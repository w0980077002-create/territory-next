import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {PGlite} from '@electric-sql/pglite';

// No network, no Supabase credentials: real PostgreSQL semantics in PGlite.
const db=new PGlite();
const read=file=>readFileSync(file,'utf8');
const uid=n=>n.toString(16).padStart(8,'0')+'-0000-4000-8000-'+n.toString(16).padStart(12,'0');
const [p1,p2,p3,c1,c2,c3,b1,b2,b3,b4,b5]=
  Array.from({length:11},(_,i)=>uid(i+1));
const hash='a'.repeat(64),trace='b'.repeat(64);
const open=(p,c,b)=>db.query(
  'select territory_v2.begin_authoritative_pve($1::uuid,$2::uuid,$3::uuid,$4::text,$5::text) as id',
  [p,c,b,'test_lifecycle',hash]);
const finish=(b,receipt)=>db.query(
  'select territory_v2.record_authoritative_pve_result($1::uuid,$2::uuid,$3::text,$4::text,$5::text,$6::integer) as result',
  [b,receipt,trace,'victory','enemy_defeated',3]);
const status=async b=>(await db.query(
  'select status from territory_v2.battle_sessions where id=$1',[b])).rows[0]?.status;
const count=async table=>Number((await db.query(
  'select count(*) as n from territory_v2.'+table)).rows[0].n);
const readLifecycle=(user,battle)=>db.query(
  'select territory_v2.read_pve_lifecycle($1::bigint,$2::uuid) as result',[user,battle]);
try{
  const lifecycle=read('server/staging/territory_v2_pve_lifecycle.sql');
  const noComments=lifecycle.replace(/--[^\n]*/g,'');
  assert(!/\b(?:truncate|drop\s+(?:table|schema))\b/i.test(noComments));
  assert(!/security\s+definer/i.test(noComments));
  assert(!/\b(?:public\.|auth\.|storage\.)/i.test(noComments));
  await db.exec('create role anon; create role authenticated; create role service_role bypassrls;');
  for(const file of [
    'server/staging/territory_v2_schema.sql',
    'server/staging/territory_v2_pve_protocol.sql',
    'server/staging/territory_v2_pve_stage_progress.sql',
    'server/staging/territory_v2_pve_execution.sql',
    'server/staging/territory_v2_pve_lifecycle.sql'
  ])await db.exec(read(file));
  await db.exec(lifecycle); // safe to run migration again
  const grants=(await db.query(`select
    has_function_privilege('anon','territory_v2.read_pve_lifecycle(bigint,uuid)','EXECUTE') as anon_read,
    has_function_privilege('authenticated','territory_v2.read_pve_lifecycle(bigint,uuid)','EXECUTE') as auth_read,
    has_function_privilege('service_role','territory_v2.read_pve_lifecycle(bigint,uuid)','EXECUTE') as service_read,
    has_table_privilege('anon','territory_v2.pve_session_policy','SELECT') as anon_policy,
    has_table_privilege('service_role','territory_v2.pve_session_expirations','SELECT') as service_audit`)).rows[0];
  assert.deepEqual(grants,{
    anon_read:false,auth_read:false,service_read:true,anon_policy:false,service_audit:true
  });
  const rls=(await db.query(`select tablename,rowsecurity from pg_tables
    where schemaname='territory_v2' and tablename in
    ('pve_session_policy','pve_session_expirations')`)).rows;
  assert.equal(rls.length,2);assert(rls.every(r=>r.rowsecurity));
  await db.query('insert into territory_v2.players(id,telegram_user_id) values($1,111),($2,222),($3,333)',[p1,p2,p3]);
  await db.query(`insert into territory_v2.characters(id,player_id,class_id)
    values($1,$2,'berserker'),($3,$4,'ranger'),($5,$6,'berserker')`,[c1,p1,c2,p2,c3,p3]);
  await db.exec(`insert into territory_v2.pve_rulebooks(version,config,enabled)
    values('test_lifecycle','{}'::jsonb,true)`);
  await db.exec('set role service_role');
  await assert.rejects(()=>open(p1,c1,b1),/PVE_SESSION_POLICY_NOT_CONFIGURED/);
  assert.equal(await count('battle_sessions'),0);
  await assert.rejects(()=>db.exec(`insert into territory_v2.pve_session_policy
    (singleton,min_duration_seconds,max_duration_seconds) values(true,30,10)`),/check constraint/i);
  await db.exec(`insert into territory_v2.pve_session_policy
    (singleton,min_duration_seconds,max_duration_seconds) values(true,3,20)`);
  assert.equal((await open(p1,c1,b1)).rows[0].id,b1);
  assert.equal((await readLifecycle(111,b1)).rows[0].result.status,'running');
  assert.equal((await readLifecycle(222,b1)).rows[0].result,null,'other user cannot inspect battle');
  await assert.rejects(()=>finish(b1,uid(100)),/PVE_SESSION_TOO_EARLY/);
  assert.equal(await status(b1),'running');
  assert.equal(await count('operation_receipts'),0,'early finish rolls back receipt');
  await db.query(`update territory_v2.battle_sessions
    set started_at=clock_timestamp()-interval '4 seconds' where id=$1`,[b1]);
  assert.equal((await finish(b1,uid(100))).rows[0].result.awardsGranted,false);
  assert.equal(await status(b1),'settled');
  assert.deepEqual((await finish(b1,uid(100))).rows[0].result,
    (await finish(b1,uid(100))).rows[0].result,'settled replay is idempotent');
  await assert.rejects(()=>db.query(`update territory_v2.battle_sessions
    set status='running' where id=$1`,[b1]),/PVE_SESSION_TERMINAL/);

  // A stuck session blocks a second battle until its deadline.
  assert.equal((await open(p1,c1,b2)).rows[0].id,b2);
  await assert.rejects(()=>open(p1,c1,b3),/PVE_ACTIVE_BATTLE_EXISTS/);
  assert.equal((await open(p2,c2,b4)).rows[0].id,b4,'different player remains independent');
  await db.query(`update territory_v2.battle_sessions
    set started_at=clock_timestamp()-interval '25 seconds' where id=$1`,[b2]);
  assert.equal((await readLifecycle(111,b2)).rows[0].result.status,'expired',
    'stale status is visible without mutating DB');
  assert.equal(await status(b2),'running');
  await assert.rejects(()=>finish(b2,uid(101)),/PVE_SESSION_EXPIRED/);
  assert.equal(await count('operation_receipts'),1,'expired finish grants no receipt');
  assert.equal((await open(p1,c1,b3)).rows[0].id,b3,
    'new start atomically expires only the old session of this player');
  assert.equal(await status(b2),'expired');
  assert.equal(await status(b4),'running','other player session was untouched');
  assert.equal(await count('pve_session_expirations'),1);
  const audit=(await db.query(`select battle_id,player_id,reason
    from territory_v2.pve_session_expirations`)).rows[0];
  assert.deepEqual({battle_id:audit.battle_id,player_id:audit.player_id,reason:audit.reason},
    {battle_id:b2,player_id:p1,reason:'session_timeout'});
  assert.equal((await open(p1,c1,b2)).rows[0].id,b2,
    'retrying an expired battle ID cannot create another battle');
  await assert.rejects(()=>finish(b2,uid(102)),/PVE_NOT_SETTLEABLE/);
  assert.equal(await count('pve_session_expirations'),1);
  assert.equal(await count('wallet_ledger'),0);
  assert.equal(await count('item_instances'),0);
  assert.equal(await count('pve_stage_clears'),0);

  // Normal high-level begin_pve_execution is guarded by the same trigger.
  const hero={hp:240,attack:45,defense:12,critBps:0,dodgeBps:0};
  const enemy={hp:95,attack:16,defense:4,critBps:0,dodgeBps:0};
  const rules={maxTurns:30,enemyAttackEvery:2,defenseReductionBps:5000,
    criticalMultiplierBps:15000,bossRageThresholdBps:5000,bossRageMultiplierBps:14000};
  await db.query('insert into territory_v2.pve_class_profiles values($1,$2,$3::jsonb)',
    ['berserker',1,JSON.stringify(hero)]);
  await db.query('insert into territory_v2.pve_stage_profiles values($1,$2,$3::jsonb,$4)',
    [1,1,JSON.stringify(enemy),false]);
  await db.query('update territory_v2.pve_rulebooks set config=$1::jsonb where version=$2',
    [JSON.stringify(rules),'test_lifecycle']);
  await db.exec(`insert into territory_v2.pve_active_rules(singleton,version)
    values(true,'test_lifecycle')`);
  const started=(await db.query(`select territory_v2.begin_pve_execution(
    333::bigint,$1::uuid,123456::bigint) as snapshot`,[b5])).rows[0].snapshot;
  assert.equal(started.battleId,b5);
  assert.equal((await readLifecycle(333,b5)).rows[0].result.status,'running');
  await db.exec('reset role');
  await db.exec('set role anon');
  await assert.rejects(()=>readLifecycle(111,b1),/permission denied/i);
  await assert.rejects(()=>db.query('select * from territory_v2.pve_session_policy'),
    /permission denied/i);
  console.log('OK: V2 PvE fail-closed policy, early/late finish, timeout recovery, audit, ownership, replay, high-level begin, no economy and RLS');
}finally{await db.close();}
