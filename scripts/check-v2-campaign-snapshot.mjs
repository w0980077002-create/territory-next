import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import ts from 'typescript';
import {PGlite} from '@electric-sql/pglite';

const src=readFileSync('server/api/campaignSnapshot.ts','utf8');
const js=ts.transpileModule(src,{compilerOptions:{
  module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022
}}).outputText;
const {V2_CAMPAIGN_SNAPSHOT_QUERY:query,toV2CampaignSnapshot:project}=
  await import('data:text/javascript;base64,'+Buffer.from(js).toString('base64'));
assert(query.includes('where p.telegram_user_id=$1::bigint'));
assert(query.includes('territory_v2.pve_stage_clears'));
assert(!/\b(insert|update|delete|drop|truncate|alter)\b/i.test(query));
assert.deepEqual(project(null),{registered:false});
assert.throws(()=>project({chapter:1}),/INVALID_V2_CAMPAIGN_SNAPSHOT/);
const db=new PGlite();
const id=n=>n.toString(16).padStart(8,'0')+'-0000-4000-8000-'+n.toString(16).padStart(12,'0');
const [p1,p2,c1,c2]=[1,2,3,4].map(id);
try{
  await db.exec('create role anon; create role authenticated; create role service_role bypassrls;');
  await db.exec(readFileSync('server/staging/territory_v2_schema.sql','utf8'));
  await db.exec(readFileSync('server/staging/territory_v2_pve_protocol.sql','utf8'));
  await db.exec(readFileSync('server/staging/territory_v2_pve_stage_progress.sql','utf8'));
  await db.query('insert into territory_v2.players(id,telegram_user_id) values($1,111),($2,222)',[p1,p2]);
  await db.query(`insert into territory_v2.characters
   (id,player_id,class_id,stage_chapter,stage_wave,highest_unlocked_chapter)
   values($1,$2,'berserker',5,20,5),($3,$4,'ranger',1,2,1)`,[c1,p1,c2,p2]);
  const seed=async(player,char,chapter,wave,n)=>{
    const battle=id(1000+n),receipt=id(2000+n);
    await db.query(`insert into territory_v2.operation_receipts
      (operation_id,player_id,action_code,request_hash,status,ruleset_version,completed_at)
      values($1,$2,'pve.stage_clear',$3,'settled','test',now())`,
      [receipt,player,'a'.repeat(64)]);
    await db.query(`insert into territory_v2.battle_sessions
      (id,player_id,character_id,stage_chapter,stage_wave,combat_rules_version,status)
      values($1,$2,$3,$4,$5,'test','ready')`,
      [battle,player,char,chapter,wave]);
    await db.query(`insert into territory_v2.pve_stage_clears
      (battle_id,player_id,character_id,chapter,wave,clear_operation_id,next_chapter,next_wave,cleared_at)
      values($1,$2,$3,$4,$5,$6,$4,$5,$7::timestamptz)`,
      [battle,player,char,chapter,wave,receipt,
       '2026-10-'+String(1+n).padStart(2,'0')+'T10:00:00Z']);
  };
  for(let wave=1;wave<=11;wave++)await seed(p1,c1,1,wave,wave);
  await seed(p1,c1,5,20,12);
  await seed(p2,c2,1,1,13);
  await db.exec('set role anon');
  await assert.rejects(()=>db.query(query,['111']),/permission denied/);
  await db.exec('reset role; set role service_role');
  const r1=await db.query(query,['111']);
  const r2=await db.query(query,['222']);
  const absent=await db.query(query,['333']);
  assert.equal(absent.rows.length,0);
  const s1=project(r1.rows[0]),s2=project(r2.rows[0]);
  assert.equal(s1.registered,true);
  assert.equal(s1.chapter,5);
  assert.equal(s1.wave,20);
  assert.equal(s1.clearedCount,12);
  assert.equal(s1.campaignCompleted,true);
  assert.equal(s1.recentClears.length,10);
  assert.deepEqual(s1.recentClears[0],{
    chapter:5,wave:20,clearedAt:'2026-10-13T10:00:00Z'});
  assert.equal(s1.recentClears.at(-1).wave,3);
  assert.equal(s2.clearedCount,1);
  assert.equal(s2.campaignCompleted,false);
  assert.deepEqual(s2.recentClears,[{
    chapter:1,wave:1,clearedAt:'2026-10-14T10:00:00Z'}]);
  assert.equal(s2.recentClears.some(x=>x.chapter===5),false,'other player data must never leak');
  await assert.rejects(()=>db.query(query,['111 OR 1=1']),/invalid input syntax/);
  const wallets=await db.query('select count(*)::integer as n from territory_v2.wallet_ledger');
  const items=await db.query('select count(*)::integer as n from territory_v2.item_instances');
  assert.equal(wallets.rows[0].n,0);
  assert.equal(items.rows[0].n,0);
  assert.throws(()=>project({...r1.rows[0],recent_clears:[{chapter:9,wave:1,clearedAt:'2026-10-13T10:00:00Z'}]}));
  console.log('OK: V2 authoritative campaign snapshot: 12 clears, 10 recent, final boss, separate accounts, RLS, parameterized SQL, no rewards');
}finally{await db.close();}
