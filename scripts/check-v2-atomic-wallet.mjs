// V2 staged wallet tests. Pure local in-memory PGlite; never call live Supabase.
// Uses the exact SQL migrated into V2 private schema to avoid test/prod drift.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { PGlite } from '@electric-sql/pglite';

const schema=readFileSync('server/staging/territory_v2_schema.sql','utf8');
const wallet=readFileSync('server/staging/territory_v2_atomic_wallet.sql','utf8');
for(const s of [schema,wallet]){
  assert(!s.includes('wmyrdpbwlkzsktnhookx'),'NO V1 production ID allowed in executable SQL');
  assert(!/drop\s+(table|schema)|truncate\s+table|alter\s+table\s+public\./i.test(s));
}

const db=new PGlite();
const player='11111111-1111-4111-8111-111111111111';
const other='22222222-2222-4222-8222-222222222222';
const op1='33333333-3333-4333-8333-333333333333';
const op2='44444444-4444-4444-8444-444444444444';
const op3='55555555-5555-4555-8555-555555555555';
const op4='66666666-6666-4666-8666-666666666666';
const hash='a'.repeat(64);
const request=(operation_id,delta_minor,opts={})=>db.query(
  'select territory_v2.apply_wallet_delta($1::uuid,$2::uuid,$3::text,$4::text,$5::bigint,$6::text,$7::text) as result',
  [opts.playerId??player,operation_id,opts.hash??hash,opts.currency??'gold',String(delta_minor),opts.reason??'test.earned',opts.ruleset??'local_test']
);
async function inspect(){
 const balances=await db.query('select amount_minor,revision from territory_v2.wallet_balances where player_id=$1 and currency_code=$2',[player,'gold']);
 const ledgers=await db.query('select count(*)::integer as n from territory_v2.wallet_ledger where player_id=$1',[player]);
 const receipts=await db.query('select count(*)::integer as n from territory_v2.operation_receipts where player_id=$1',[player]);
 return {balance:Number(balances.rows[0]?.amount_minor??0),revision:Number(balances.rows[0]?.revision??0),ledger:Number(ledgers.rows[0].n),receipts:Number(receipts.rows[0].n)};
}
try {
 await db.exec('create role anon; create role authenticated; create role service_role bypassrls;');
 await db.exec(schema);
 await db.exec(wallet);
 const permission=await db.query("select has_function_privilege('anon','territory_v2.apply_wallet_delta(uuid,uuid,text,text,bigint,text,text)','execute') as anon,has_function_privilege('authenticated','territory_v2.apply_wallet_delta(uuid,uuid,text,text,bigint,text,text)','execute') as auth,has_function_privilege('service_role','territory_v2.apply_wallet_delta(uuid,uuid,text,text,bigint,text,text)','execute') as service");
 assert.deepEqual(permission.rows,[{anon:false,auth:false,service:true}]);
 await db.query('insert into territory_v2.players(id,telegram_user_id) values($1,1),($2,2)',[player,other]);
 await db.exec("insert into territory_v2.currency_definitions(code,decimals,enabled) values('gold',0,true),('blue_diamonds',0,false)");

 await db.exec('set role service_role');
 const first=(await request(op1,120)).rows[0].result;
 assert.equal(first.balanceMinor,'120');
 assert.equal((await request(op1,120)).rows[0].result.balanceMinor,'120','retry must return same receipt');
 assert.deepEqual(await inspect(),{balance:120,revision:1,ledger:1,receipts:1});
 await assert.rejects(()=>request(op1,500),/IDEMPOTENCY_CONFLICT/);
 await assert.rejects(()=>request(op1,120,{playerId:other}),/IDEMPOTENCY_CONFLICT/);
 await assert.rejects(()=>request(op1,120,{hash:'b'.repeat(64)}),/IDEMPOTENCY_CONFLICT/);
 await assert.rejects(()=>request(op1,120,{ruleset:'different_ruleset'}),/IDEMPOTENCY_CONFLICT/);
 assert.deepEqual(await inspect(),{balance:120,revision:1,ledger:1,receipts:1});
 assert.equal((await request(op2,-35)).rows[0].result.balanceMinor,'85');
 assert.equal((await request(op2,-35)).rows[0].result.balanceMinor,'85');
 assert.deepEqual(await inspect(),{balance:85,revision:2,ledger:2,receipts:2});
 await assert.rejects(()=>request(op3,-10000),/INSUFFICIENT_RESOURCE/);
 await assert.rejects(()=>request(op3,9000000000000000000n),/BALANCE_OVERFLOW/);
 await assert.rejects(()=>request(op3,20,{currency:'blue_diamonds'}),/CURRENCY_DISABLED/);
 await assert.rejects(()=>request(op3,0),/INVALID_WALLET_OPERATION/);
 await assert.rejects(()=>request(op3,10,{hash:'not-a-hex-hash'}),/INVALID_WALLET_OPERATION/);
 assert.deepEqual(await inspect(),{balance:85,revision:2,ledger:2,receipts:2},'failed statements cannot alter wallet/receipts');
 await db.exec('reset role');
 await db.exec('set role anon');
 await assert.rejects(()=>request(op4,100),/permission denied/i,'anonymous caller must never credit money');
 await db.exec('reset role');
 assert.deepEqual(await inspect(),{balance:85,revision:2,ledger:2,receipts:2});
 console.log('OK: V2 private atomic wallet SQL — exact receipts, no double credit/debit, negative/overflow/disabled blocked, anon denied');
} finally {await db.close();}
