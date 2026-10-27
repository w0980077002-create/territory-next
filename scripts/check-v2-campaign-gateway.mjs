import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import ts from 'typescript';

const src=readFileSync('server/api/telegramGateway.ts','utf8');
const js=ts.transpileModule(src,{compilerOptions:{
  module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022
}}).outputText;
const {handleV2GatewayRequest}=await import('data:text/javascript;base64,'+
  Buffer.from(js).toString('base64'));
const origin='https://w0980077002-create.github.io';
const base='https://ksikzkrvuuhermhnbycn.supabase.co/functions/v1/territory-v2-api';
const user={telegramUserId:444,displayName:'V2',photoUrl:null,authDate:1780000000};
const snapshot={registered:true,chapter:3,wave:7,highestUnlockedChapter:3,
  revision:'8',clearedCount:46,campaignCompleted:false,
  recentClears:[{chapter:3,wave:6,clearedAt:'2026-10-27T11:00:00Z'}]};
let verified=0,reads=0,profiles=0,joins=0,budget=[];
const deps={
  enabled:true,allowOrigin:origin,
  verify:async raw=>{verified++;if(raw!=='signed-telegram-initdata')throw Error('forged');return user;},
  enforceRateLimit:async(u,action)=>{assert.deepEqual(u,user);budget.push(action);return true;},
  getCampaign:async u=>{reads++;assert.deepEqual(u,user);return snapshot;},
  getProfile:async()=>{profiles++;return {registered:false};},
  register:async()=>{joins++;return {registered:false};}
};
const call=(path,init='signed-telegram-initdata',extra={},options={})=>
 handleV2GatewayRequest(new Request(base+'/'+path,{
  method:options.method??'POST',
  headers:{Origin:options.origin??origin,'content-type':'application/json'},
  body:options.method==='GET'?undefined:JSON.stringify({initData:init,...extra}),
 }),{...deps,enabled:options.enabled??true});
const ok=await call('campaign');
assert.equal(ok.status,200);
assert.deepEqual(await ok.json(),{data:snapshot});
assert.equal(ok.headers.get('cache-control'),'no-store');
assert.equal(ok.headers.get('access-control-allow-origin'),origin);
assert.deepEqual(budget,['profile'],'campaign shares the profile rate budget');
assert.equal(reads,1);
assert.equal((await call('campaign','signed-telegram-initdata',{playerId:'other'})).status,400);
assert.equal((await call('campaign','signed-telegram-initdata',{chapter:5})).status,400);
assert.equal((await call('campaign','signed-telegram-initdata',{receiptId:'fake'})).status,400);
assert.equal((await call('campaign','fake')).status,401);
assert.equal((await call('campaign','signed-telegram-initdata',{}, {origin:'https://evil.example'})).status,403);
assert.equal((await call('campaign','signed-telegram-initdata',{}, {enabled:false})).status,503);
assert.equal((await call('campaign','signed-telegram-initdata',{}, {method:'GET'})).status,405);
assert.equal((await call('malicious-campaign')).status,404,'whole-route matching');
assert.equal((await call('campaign-extra')).status,404,'whole-route matching');
assert.equal(reads,1,'rejected requests must not reach database');
assert.equal(profiles,0);
assert.equal(joins,0);
const denied=await handleV2GatewayRequest(new Request(base+'/campaign',{
  method:'POST',headers:{Origin:origin,'content-type':'application/json'},
  body:JSON.stringify({initData:'signed-telegram-initdata'})
}),{...deps,enforceRateLimit:async()=>false});
assert.equal(denied.status,429);
assert.equal(reads,1);
const guest=await handleV2GatewayRequest(new Request(base+'/campaign',{
  method:'POST',headers:{Origin:origin,'content-type':'application/json'},
  body:JSON.stringify({initData:'signed-telegram-initdata'})
}),{...deps,getCampaign:async()=>({registered:false})});
assert.deepEqual(await guest.json(),{data:{registered:false}});
const edge=readFileSync('supabase/functions/territory-v2-api/index.ts','utf8');
assert(edge.includes('V2_CAMPAIGN_SNAPSHOT_QUERY'));
assert(edge.includes('toV2CampaignSnapshot'));
assert(edge.includes('sql.unsafe(V2_CAMPAIGN_SNAPSHOT_QUERY,[user.telegramUserId.toString()])'));
assert(!edge.includes('V1_SUPABASE'));
console.log('OK: authenticated read-only V2 campaign route, exact path, shared rate budget, strict payload, disabled gateway and tenant isolation');
