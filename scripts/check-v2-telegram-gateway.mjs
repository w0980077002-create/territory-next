import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import ts from 'typescript';

const moduleSource=readFileSync('server/api/telegramGateway.ts','utf8');
const js=ts.transpileModule(moduleSource,{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}}).outputText;
const {handleV2GatewayRequest,MAX_V2_AUTH_BODY_CHARS}=await import('data:text/javascript;base64,'+Buffer.from(js).toString('base64'));
const ORIGIN='https://w0980077002-create.github.io';
const FUNCTION_URL='https://ksikzkrvuuhermhnbycn.supabase.co/functions/v1/territory-v2-api';
const profile={telegramUserId:1234567,displayName:'Тестовый викинг',photoUrl:null,authDate:1780000000};
const snapshot={registered:true,player:{id:'some-private-staging-id',displayName:profile.displayName,avatarRef:null},hero:null,wallets:[]};
let verified=0,got=0,joined=0,klass='';
const deps={
  enabled:true,allowOrigin:ORIGIN,
  verify:async raw=>{verified++;if(raw!=='signed-raw-init-data')throw Error('bad signature');return profile;},
  getProfile:async user=>{got++;assert.deepEqual(user,profile);return snapshot;},
  register:async(user,c)=>{joined++;klass=c;assert.deepEqual(user,profile);return snapshot;}
};
const invoke=async(path='profile',init='signed-raw-init-data',extras={},origin=ORIGIN,method='POST',enabled=true)=>{
  const req=new Request(FUNCTION_URL+'/'+path,{
    method,headers:{Origin:origin,'Content-Type':'application/json'},
    body:method==='POST'?JSON.stringify({initData:init,...extras}):undefined
  });
  return handleV2GatewayRequest(req,{...deps,enabled});
};
const noToken=await invoke('join','signed-raw-init-data',{classId:'berserker'},ORIGIN,'POST',false);
assert.equal(noToken.status,503);
assert.equal(joined,0,'gateway disabled must never touch player database');
const health=await invoke('health','',{},ORIGIN,'GET',false);
assert.equal(health.status,200);
assert.deepEqual(await health.json(),{mode:'isolated-v2-staging',enabled:false});
assert.equal(health.headers.get('cache-control'),'no-store');
const ok=await invoke();
assert.equal(ok.status,200);
assert.deepEqual(await ok.json(),{data:snapshot});
assert.equal(ok.headers.get('access-control-allow-origin'),ORIGIN);
const joinedResult=await invoke('join','signed-raw-init-data',{classId:'ranger'});
assert.equal(joinedResult.status,200);
assert.equal(klass,'ranger');
assert.equal(joined,1);
const wrongOrigin=await invoke('join','signed-raw-init-data',{classId:'berserker'},'https://evil.example');
assert.equal(wrongOrigin.status,403);
assert.equal(wrongOrigin.headers.get('access-control-allow-origin'),null);
assert.equal(joined,1);
assert.equal((await invoke('profile','forged-init-data')).status,401);
assert.equal((await invoke('join','signed-raw-init-data',{classId:'owner'})).status,422);
assert.equal((await invoke('join','signed-raw-init-data',{classId:'berserker',playerId:'victim-id'})).status,400);
assert.equal((await invoke('profile','signed-raw-init-data',{walletDelta:1000000})).status,400);
assert.equal((await invoke('profile','')).status,401);
assert.equal((await invoke('profile','x'.repeat(MAX_V2_AUTH_BODY_CHARS))).status,413);
assert.equal((await invoke('wallet','signed-raw-init-data',{classId:'berserker'})).status,404);
assert.equal((await invoke('join','signed-raw-init-data',{classId:'berserker'},ORIGIN,'GET')).status,405);
const preflight=new Request(FUNCTION_URL+'/join',{method:'OPTIONS',headers:{Origin:ORIGIN,'Access-Control-Request-Method':'POST'}});
const pr=await handleV2GatewayRequest(preflight,deps);
assert.equal(pr.status,204);
assert.equal(pr.headers.get('access-control-allow-origin'),ORIGIN);
assert.equal(pr.headers.get('access-control-allow-headers'),'content-type');
const failedPreflight=await handleV2GatewayRequest(new Request(FUNCTION_URL+'/profile',{method:'OPTIONS',headers:{Origin:'https://attacker.example'}}),deps);
assert.equal(failedPreflight.status,403);
assert.equal(verified,4,'unexpected requests must not invoke Telegram verification');
assert.equal(got,1);
assert.equal(joined,1);
const edge=readFileSync('supabase/functions/territory-v2-api/index.ts','utf8');
assert(edge.includes('V2_ENABLE_TELEGRAM_GATEWAY') && edge.includes("==='yes'"));
assert(edge.includes('TERRITORY_V2_BOT_TOKEN'));
assert(edge.includes("projectUrl===EXPECTED_URL"));
assert(edge.includes('ksikzkrvuuhermhnbycn'));
assert(!edge.includes('wmyrdpbwlkzsktnhookx'),'V1 project ID in deployable code');
assert(edge.includes('prepare:false'));
assert(edge.includes('territory_v2.upsert_verified_telegram_player'));
assert(edge.includes('territory_v2.create_character_once'));
assert(!edge.includes("Deno.env.get('BOT_TOKEN')"));
assert(!edge.includes('SUPABASE_SERVICE_ROLE_KEY'),'No service role secret in runtime code');
console.log('OK: V2 gateway disabled-by-default, strict Origin, no user ID injection, HMAC gate, class validation, CORS, sensitive data not cached');
