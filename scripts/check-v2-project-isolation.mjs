// Protect TWO separate Territory games from configuration regressions.
// Deliberately runs offline: does not call a database or use any secret keys.
import assert from 'node:assert/strict';
import {existsSync,readFileSync,readdirSync} from 'node:fs';
import {join} from 'node:path';
const read=(path)=>readFileSync(path,'utf8');
const cfg=JSON.parse(read('server/staging/approved-project.json'));
assert.equal(cfg.stagingProjectRef,'ksikzkrvuuhermhnbycn');
assert.equal(cfg.production1ProjectRef,'wmyrdpbwlkzsktnhookx');
assert.notEqual(cfg.stagingProjectRef,cfg.production1ProjectRef,'Production and V2 staging must NEVER coincide');
assert.equal(cfg.privateSchema,'territory_v2');
assert.equal(cfg.frontendEntry,'src/v2/main.tsx');
assert.equal(cfg.liveLaunchAuthorized,false,'Live launch requires explicit owner approval');
assert.equal(cfg.clientDirectSchemaAccess,false,'Client cannot read private RLS tables');

const html=read('index.html');
assert(html.includes('src="/src/v2/main.tsx"'),'V2 index must mount the isolated V2 React client');
assert(!html.includes('src="/src/main.tsx"'),'Legacy App cannot be entrypoint for V2');
const main=read('src/v2/main.tsx');
assert(main.includes("from './NextApp'"),'V2 must mount NextApp');
for(const f of ['src/v2/main.tsx','src/v2/NextApp.tsx','src/v2/InventoryExperience.tsx']){
  const code=read(f);
  assert(!/from\s*['"](?:@\/game|\.\.\/game|\.\.\/\.\.\/game|@\/admin|\.?\.?\/App|@\/game\/supabase)/.test(code),'Legacy game runtime imported by V2: '+f);
  assert(!/createClient\s*\(/.test(code),'V2 page may not instantiate a Supabase client: '+f);
  assert(!/VITE_SUPABASE_(?:URL|ANON_KEY)/.test(code),'V2 page must not read legacy DB config: '+f);
}
for(const old of ['src/game','src/components','src/admin','public','supabase/migrations']){
 assert(!existsSync(old),'Deleted TERRITORY 1.0 source folder unexpectedly reappeared: '+old);
}

const schema=read('server/staging/territory_v2_schema.sql');
assert(schema.includes('create schema if not exists territory_v2;'));
assert(!/\b(?:drop|truncate)\s+(?:table|schema)/i.test(schema));
assert(!/\b(?:alter|create)\s+table\s+public\./i.test(schema));
assert(!schema.includes(cfg.production1ProjectRef),'Production ref in V2 schema file');
// All new V2 backend primitives are private SECURITY INVOKER functions.
// No browser API or signed-in client may invoke the raw economy or identity
// procedures; only verified server code gets these privileges.
for(const file of [
  'server/staging/territory_v2_atomic_wallet.sql',
  'server/staging/territory_v2_verified_player_identity.sql',
  'server/staging/territory_v2_pve_protocol.sql',
]){
  const sql=read(file);
  const executable=sql.replace(/--[^\n]*/g,'');
  assert(!executable.includes(cfg.production1ProjectRef),'V1 database reference in V2 migration SQL: '+file);
  assert(executable.includes('security invoker'),'Privileged schema function must be SECURITY INVOKER: '+file);
  assert(/from\s+public\s*,\s*anon\s*,\s*authenticated/i.test(executable),'V2 private function must revoke all client roles: '+file);
  assert(executable.includes('to service_role'),'V2 internal functions must explicitly grant service role only: '+file);
  assert(!/security\s+definer/i.test(executable),'Never add SECURITY DEFINER: '+file);
  assert(!/\b(?:drop|truncate)\s+(?:table|schema)/i.test(executable),'Destructive DDL forbidden: '+file);
}
const verifier=read('server/telegram/verifyInitData.ts');
assert(verifier.includes("encoder.encode('WebAppData')"),'Official Telegram HMAC secret derivation missing');
assert(verifier.includes('TELEGRAM_INITDATA_SIGNATURE_INVALID'),'Telegram HMAC must fail closed');
assert(!read('src/v2/main.tsx').includes('verifyInitData'),'Server-only Telegram code imported in browser');

const gatewaySource=read('supabase/functions/territory-v2-api/index.ts');
assert(gatewaySource.includes(cfg.stagingProjectRef),'V2 Edge must enforce exact staging project');
assert(!gatewaySource.includes(cfg.production1ProjectRef),'V2 Edge must not reference live V1');
assert(gatewaySource.includes('V2_ENABLE_TELEGRAM_GATEWAY'),'Edge auth must require explicit enablement');
assert(gatewaySource.includes('TERRITORY_V2_BOT_TOKEN'),'Edge auth must use separate V2 bot token');
assert(!gatewaySource.includes("Deno.env.get('BOT_TOKEN')"),'Legacy bot token must never be imported');
assert(!read('src/v2/NextApp.tsx').includes('server/api/telegramGateway'),'Server gateway cannot be shipped in game bundle');
const gatewayLogic=read('server/api/telegramGateway.ts');
assert(gatewayLogic.includes('deps.verify(input.initData)'),'Gateway must verify signed raw Telegram identity');
assert(gatewayLogic.includes('UNEXPECTED_FIELDS'),'Gateway must reject playerId and wallet injection');

const workflows=readdirSync('.github/workflows').filter(n=>n.endsWith('.yml')||n.endsWith('.yaml'));
assert(!workflows.some(n=>n==='pages.yml'),'V2 must never have auto-deploy to production Pages');
for(const name of workflows){
  const data=read(join('.github/workflows',name));
  assert(!data.includes('https://'+cfg.production1ProjectRef+'.supabase.co'),'CI must not contact live Supabase');
}
const envUrl=process.env.VITE_SUPABASE_URL ?? '';
if(envUrl){
  assert(!envUrl.includes(cfg.production1ProjectRef),'Production Supabase URL was supplied to a V2 test');
}
console.log('OK: V2 isolated: old game source directories physically absent; private staging allowlisted; no live deployment');
