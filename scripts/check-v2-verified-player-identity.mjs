// Isolated V2 identity tests. Real PostgreSQL semantics on an in-memory PGlite.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {PGlite} from '@electric-sql/pglite';

const base=readFileSync('server/staging/territory_v2_schema.sql','utf8');
const identity=readFileSync('server/staging/territory_v2_verified_player_identity.sql','utf8');
const db=new PGlite();
const create=(id,name,avatar=null)=>db.query(
  'select territory_v2.upsert_verified_telegram_player($1::bigint,$2::text,$3::text) as id',
  [id,name,avatar]);
const choose=(playerId,classId)=>db.query(
  'select territory_v2.create_character_once($1::uuid,$2::text) as id',
  [playerId,classId]);
try{
  await db.exec('create role anon; create role authenticated; create role service_role bypassrls;');
  await db.exec(base);
  await db.exec(identity);
  const permission=await db.query(
    "select has_function_privilege('anon','territory_v2.upsert_verified_telegram_player(bigint,text,text)','execute') as anon,has_function_privilege('authenticated','territory_v2.create_character_once(uuid,text)','execute') as authenticated,has_function_privilege('service_role','territory_v2.create_character_once(uuid,text)','execute') as server");
  assert.deepEqual(permission.rows,[{anon:false,authenticated:false,server:true}]);
  await db.exec('set role service_role');
  const first=(await create('789456123','Викинг','https://example.org/portrait.jpg')).rows[0].id;
  const again=(await create('789456123','Викинг 2',null)).rows[0].id;
  assert.equal(first,again,'same immutable Telegram ID must retain player identity');
  const q=await db.query('select telegram_user_id,display_name,avatar_ref from territory_v2.players where id=$1',[first]);
  assert.equal(q.rows[0].display_name,'Викинг 2');
  assert.equal(q.rows[0].avatar_ref,'https://example.org/portrait.jpg','avatar preserved when Telegram omits field');
  assert.equal((await db.query('select count(*)::integer as n from territory_v2.players')).rows[0].n,1);
  for(const [id,name,avatar] of [
    ['0','Test',null],['-12','Test',null],['889','','https://example.org/a.jpg'],
    ['889','A'.repeat(100),null],['889','Test','http://unsafe.example/a.jpg'],
    ['889','Test','javascript:alert(1)'],
  ]) await assert.rejects(()=>create(id,name,avatar),/INVALID_VERIFIED_TELEGRAM_PROFILE/);
  const character=(await choose(first,'berserker')).rows[0].id;
  assert.equal((await choose(first,'berserker')).rows[0].id,character,'retry creates no duplicate character');
  await assert.rejects(()=>choose(first,'runemage'),/CHARACTER_ALREADY_CREATED_DIFFERENT_CLASS/);
  await assert.rejects(()=>choose(first,'unknown'),/INVALID_V2_CLASS_SELECTION/);
  await assert.rejects(()=>choose('22222222-2222-4222-8222-222222222222','ranger'),/foreign key|violates/i);
  const c=await db.query('select level,xp,stage_chapter,highest_unlocked_chapter,class_id from territory_v2.characters where id=$1',[character]);
  assert.equal(c.rows[0].level,1);
  assert.equal(Number(c.rows[0].xp),0);
  assert.equal(c.rows[0].stage_chapter,1);
  assert.equal(c.rows[0].highest_unlocked_chapter,1);
  assert.equal(c.rows[0].class_id,'berserker');
  assert.equal((await db.query('select count(*)::integer as n from territory_v2.characters')).rows[0].n,1);
  assert.equal((await db.query('select count(*)::integer as n from territory_v2.wallet_ledger')).rows[0].n,0,'onboarding cannot mint wallet funds');
  await db.exec('reset role');
  await db.exec('set role anon');
  await assert.rejects(()=>create('1234','Impostor'),/permission denied/i);
  await assert.rejects(()=>choose(first,'berserker'),/permission denied/i);
  await db.exec('reset role');
  console.log('OK: repeat Telegram identity reuses UUID, avatar sync, character once, no wallet grant, anon cannot upsert');
}finally{await db.close();}
