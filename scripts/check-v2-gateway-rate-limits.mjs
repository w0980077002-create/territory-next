// Isolated local PGlite test: no requests to staging or V1 projects.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {PGlite} from '@electric-sql/pglite';

const schema=readFileSync('server/staging/territory_v2_schema.sql','utf8');
const rateLimit=readFileSync('server/staging/territory_v2_gateway_rate_limit.sql','utf8');
const executable=rateLimit.replace(/--[^\n]*/g,'');
assert(!/drop\s+(?:table|schema)|truncate\s+table|alter\s+table\s+public\./i.test(executable));
assert(!executable.includes('wmyrdpbwlkzsktnhookx'));
assert(executable.includes('security invoker'));
assert(executable.includes('to service_role'));
assert(executable.includes('on conflict'));
const db=new PGlite();
const check=(uid,route,max,window)=>db.query(
 'select territory_v2.try_gateway_rate_limit($1::bigint,$2::text,$3::integer,$4::integer) as allowed',
 [String(uid),route,max,window]
);
try{
 await db.exec('create role anon; create role authenticated; create role service_role bypassrls;');
 await db.exec(schema);
 await db.exec(rateLimit);
 const rights=await db.query(`select
 has_function_privilege('anon','territory_v2.try_gateway_rate_limit(bigint,text,integer,integer)','execute') as anon,
 has_function_privilege('authenticated','territory_v2.try_gateway_rate_limit(bigint,text,integer,integer)','execute') as auth,
 has_function_privilege('service_role','territory_v2.try_gateway_rate_limit(bigint,text,integer,integer)','execute') as server`);
 assert.deepEqual(rights.rows,[{anon:false,auth:false,server:true}]);
 const rls=await db.query("select rowsecurity from pg_tables where schemaname='territory_v2' and tablename='gateway_rate_limits'");
 assert.deepEqual(rls.rows,[{rowsecurity:true}]);
 await db.exec('set role anon');
 await assert.rejects(()=>check(1234,'join',4,3600),/permission denied/);
 await db.exec('reset role; set role service_role');
 for(let i=0;i<4;i++)assert.equal((await check(1234,'join',4,3600)).rows[0].allowed,true);
 for(let i=0;i<3;i++)assert.equal((await check(1234,'join',4,3600)).rows[0].allowed,false);
 assert.equal((await check(1234,'profile',2,600)).rows[0].allowed,true);
 assert.equal((await check(1234,'profile',2,600)).rows[0].allowed,true);
 assert.equal((await check(1234,'profile',2,600)).rows[0].allowed,false);
 assert.equal((await check(5678,'join',4,3600)).rows[0].allowed,true);
 const rows=await db.query('select telegram_user_id,route,request_count from territory_v2.gateway_rate_limits order by telegram_user_id,route');
 assert.deepEqual(rows.rows.map(r=>[String(r.telegram_user_id),r.route,r.request_count]),[
  ['1234','join',4],['1234','profile',2],['5678','join',1]
 ]);
 await assert.rejects(()=>check(0,'join',4,3600),/INVALID_V2_RATE_LIMIT_REQUEST/);
 await assert.rejects(()=>check(1234,'wallet',4,3600),/INVALID_V2_RATE_LIMIT_REQUEST/);
 await assert.rejects(()=>check(1234,'join',0,3600),/INVALID_V2_RATE_LIMIT_REQUEST/);
 await assert.rejects(()=>check(1234,'join',4,10),/INVALID_V2_RATE_LIMIT_REQUEST/);
 const noWallet=await db.query('select count(*)::integer as n from territory_v2.wallet_ledger');
 assert.equal(noWallet.rows[0].n,0,'Gateway throttling must not affect economy');
 console.log('OK: V2 private, RLS-protected atomic gateway budgets; 429, per-action/account scope, privileged only');
}finally{await db.close();}
