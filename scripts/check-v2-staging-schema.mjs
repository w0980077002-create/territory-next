// Execute TERRITORY 2.0 *offline* staging-only SQL against in-memory PGlite.
// NEVER connects to a real Supabase project. No credentials or production data.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {PGlite} from '@electric-sql/pglite';

const schema=readFileSync('server/staging/territory_v2_schema.sql','utf8');
for(const dangerous of ['ksikzkrvuuhermhnbycn','wmyrdpbwlkzsktnhookx']){
  assert(!schema.includes(dangerous),'staging SQL may not reference legacy production project');
}
assert(!/create\s+(or\s+replace\s+)?table\s+(?!if\s+not\s+exists\s+)?public\./i.test(schema));
const db=new PGlite();
try{
  await db.exec('create role anon; create role authenticated; create role service_role bypassrls;');
  await db.exec(schema);
  const tables=await db.query("select tablename,rowsecurity from pg_tables where schemaname='territory_v2'");
  assert(tables.rows.length>=10,'not all staging tables are present');
  for(const row of tables.rows)assert.equal(row.rowsecurity,true,'table not RLS protected: '+row.tablename);
  const grants=await db.query("select has_schema_privilege('anon','territory_v2','USAGE') as anon, has_schema_privilege('authenticated','territory_v2','USAGE') as authenticated, has_schema_privilege('service_role','territory_v2','USAGE') as service");
  assert.equal(grants.rows[0].anon,false);
  assert.equal(grants.rows[0].authenticated,false);
  assert.equal(grants.rows[0].service,true);
  const id1='11111111-1111-4111-8111-111111111111';
  const id2='22222222-2222-4222-8222-222222222222';
  const char1='33333333-3333-4333-8333-333333333333';
  const char2='44444444-4444-4444-8444-444444444444';
  const item1='55555555-5555-4555-8555-555555555555';
  await db.query('insert into territory_v2.players(id,telegram_user_id) values($1,1),($2,2)',[id1,id2]);
  await db.query("insert into territory_v2.characters(id,player_id,class_id) values($1,$2,'berserker'),($3,$4,'berserker')",[char1,id1,char2,id2]);
  await db.query("insert into territory_v2.item_instances(id,player_id,item_type,slot_type,rarity,item_level) values($1,$2,'axe','weapon','common',1)",[item1,id1]);
  await assert.rejects(()=>db.query("insert into territory_v2.equipment(character_id,player_id,slot_code,item_id) values($1,$2,'weapon',$3)",[char2,id2,item1]),/foreign key|violates/i,'cross-account equip must fail');
  await db.query("insert into territory_v2.equipment(character_id,player_id,slot_code,item_id) values($1,$2,'weapon',$3)",[char1,id1,item1]);
  await assert.rejects(()=>db.query("insert into territory_v2.equipment(character_id,player_id,slot_code,item_id) values($1,$2,'shield',$3)",[char1,id1,item1]),/unique/i,'one item cannot equip twice');
  const id3='66666666-6666-4666-8666-666666666666';
  const id4='77777777-7777-4777-8777-777777777777';
  await db.query("insert into territory_v2.currency_definitions(code,decimals) values('gold',0)");
  await assert.rejects(()=>db.query("insert into territory_v2.wallet_balances(player_id,currency_code,amount_minor) values($1,'gold',-1)",[id1]),/check/i,'negative wallet forbidden');
  await db.query("insert into territory_v2.mining_jobs(id,player_id,resource_code,status,finished_at) values($1,$2,'iron','running',now()+interval '4 hours')",[id3,id1]);
  await assert.rejects(()=>db.query("insert into territory_v2.mining_jobs(id,player_id,resource_code,status,finished_at) values($1,$2,'ore','running',now()+interval '4 hours')",[id4,id1]),/unique/i,'second simultaneous mining must fail');
  await db.exec('set role anon;');
  await assert.rejects(()=>db.query('select * from territory_v2.wallet_balances'),/permission denied/i,'anon cannot inspect private wallet');
  await db.exec('reset role;');
  console.log('OK: isolated staging DDL, '+tables.rows.length+' RLS tables, no anonymous schema access, item ownership, negative balance, unique mining');
} finally {await db.close();}
