// External smoke check. No credentials, no real accounts, no wallet writes.
// Runs from GitHub Actions (internet-enabled runner), NOT against live V1.
// Expects healthy V2 server, fail-closed until separate bot token is configured.
import assert from 'node:assert/strict';
const ORIGIN='https://w0980077002-create.github.io';
const URL='https://ksikzkrvuuhermhnbycn.supabase.co/functions/v1/territory-v2-api';
async function call(path, init={}){
  return await fetch(URL+path,{...init,signal:AbortSignal.timeout(12000)});
}
const h=await call('/health',{headers:{Origin:ORIGIN}});
const body=await h.text();
assert.equal(h.status,200,'staging Edge gateway unhealthy: '+h.status+' '+body.slice(0,200));
const state=JSON.parse(body);
assert.equal(state.mode,'isolated-v2-staging');
assert.equal(typeof state.enabled,'boolean');
assert.equal(h.headers.get('cache-control'),'no-store');
assert.equal(h.headers.get('access-control-allow-origin'),ORIGIN);
const fake=await call('/profile',{method:'POST',headers:{
  Origin:ORIGIN,'content-type':'application/json'
},body:JSON.stringify({initData:'fake-unverified-telegram-data'})});
assert.equal(fake.status,state.enabled?401:503,'forged Telegram ID was accepted');
const fbody=await fake.text();
assert(!fbody.includes('playerId')&&!fbody.includes('amountMinor'),'no sensitive player data may leak');
const badOrigin=await call('/profile',{method:'POST',headers:{
  Origin:'https://attacker.invalid','content-type':'application/json'
},body:JSON.stringify({initData:'fake-unverified-telegram-data'})});
assert.equal(badOrigin.status,403,'cross-origin attacker must not access gateway');
assert.equal(badOrigin.headers.get('access-control-allow-origin'),null);
console.log('OK: deployed staging Edge gateway responds to HTTPS, rejects forged Telegram and disallowed origins; enabled='+state.enabled);
