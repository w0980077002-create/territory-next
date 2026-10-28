/**
 * TERRITORY 2.0 staging-only PvE orchestrator.
 * PRIVATE server module: never import into public src/v2 or expose seed/snapshot
 * over HTTP. The Telegram initData HMAC MUST be verified before calling.
 *
 * Stats, stage, rules and secret seed are not accepted from the browser.
 * The SQL begin function loads the locked character and explicit profiles.
 * Settlement + first clear execute atomically in one database transaction.
 * No XP, inventory or currency rewards are issued.
 */
import {resolvePveEncounter,validatePveEncounter,
  type PveEncounter,type PveResolution} from './resolvePve.ts';

export interface V2PrivateSql {
  unsafe(query:string,params:readonly unknown[]):Promise<readonly Record<string,unknown>[]>;
}
export interface VerifiedV2PveIdentity {
  /** Must originate from verified Telegram initData, NEVER request JSON. */
  readonly telegramUserId:number;
}
export interface V2PveStart {
  readonly battleId:string;
  readonly stageId:string;
  readonly rulesetVersion:string;
}
export interface V2PveFinished {
  readonly battle:PveResolution;
  readonly firstClear:unknown|null;
  readonly awardsGranted:false;
}

const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
function assertIdentity(identity:VerifiedV2PveIdentity):void {
  if(!identity||!Number.isSafeInteger(identity.telegramUserId)||
     identity.telegramUserId<=0)throw new Error('V2_PVE_IDENTITY_NOT_VERIFIED');
}
function assertBattleId(id:string):void {
  if(typeof id!=='string'||!UUID.test(id))throw new Error('V2_PVE_INVALID_BATTLE_ID');
}
function cryptoProvider():Crypto {
  if(!globalThis.crypto?.randomUUID||!globalThis.crypto?.getRandomValues||
     !globalThis.crypto?.subtle)throw new Error('V2_PVE_SECURE_CRYPTO_REQUIRED');
  return globalThis.crypto;
}
function secretSeed():number {
  const random=cryptoProvider();
  const value=new Uint32Array(1);
  do{random.getRandomValues(value);}while(value[0]===0);
  return value[0];
}
function parseSnapshot(value:unknown):PveEncounter {
  if(!value||typeof value!=='object'||Array.isArray(value))
    throw new Error('V2_PVE_INVALID_SNAPSHOT');
  const snapshot=value as PveEncounter;
  validatePveEncounter(snapshot);
  return snapshot;
}
async function sha256Hex(value:string):Promise<string> {
  const bytes=await cryptoProvider().subtle.digest('SHA-256',new TextEncoder().encode(value));
  return [...new Uint8Array(bytes)].map(b=>b.toString(16).padStart(2,'0')).join('');
}
/** Deterministic receipt IDs permit safe retry after an interrupted response. */
async function receiptId(battleId:string,purpose:'resolve'|'clear'):Promise<string> {
  const hex=await sha256Hex('territory-v2:pve:'+purpose+':'+battleId);
  const raw=hex.slice(0,32).split('');
  raw[12]='4'; // RFC 4122 UUID version
  raw[16]='89ab'[parseInt(raw[16],16)%4]; // RFC 4122 variant
  const h=raw.join('');
  return h.slice(0,8)+'-'+h.slice(8,12)+'-'+h.slice(12,16)+'-'+h.slice(16,20)+'-'+h.slice(20,32);
}
/**
 * Creates a NEW server battle. It cannot be triggered from the current public
 * demo; only a future HMAC-gated V2 server route may call this module.
 */
export async function beginServerPve(
  sql:V2PrivateSql,identity:VerifiedV2PveIdentity,
):Promise<V2PveStart>{
  assertIdentity(identity);
  const battleId=cryptoProvider().randomUUID();
  const rows=await sql.unsafe(
    'select territory_v2.begin_pve_execution($1::bigint,$2::uuid,$3::bigint) as snapshot',
    [String(identity.telegramUserId),battleId,secretSeed()]);
  const snapshot=parseSnapshot(rows[0]?.snapshot);
  if(snapshot.battleId!==battleId)throw new Error('V2_PVE_BATTLE_ID_MISMATCH');
  return {battleId,stageId:snapshot.stageId,rulesetVersion:snapshot.rules.version};
}
/** Read-only resume: returns no seed, hero stats or private configuration. */
export async function resumeServerPve(
  sql:V2PrivateSql,identity:VerifiedV2PveIdentity,battleId:string,
):Promise<V2PveStart>{
  assertIdentity(identity);assertBattleId(battleId);
  const rows=await sql.unsafe(
    'select territory_v2.read_pve_execution($1::bigint,$2::uuid) as snapshot',
    [String(identity.telegramUserId),battleId]);
  if(!rows[0]?.snapshot)throw new Error('V2_PVE_NOT_FOUND');
  const snapshot=parseSnapshot(rows[0].snapshot);
  if(snapshot.battleId!==battleId)throw new Error('V2_PVE_BATTLE_ID_MISMATCH');
  return {battleId,stageId:snapshot.stageId,rulesetVersion:snapshot.rules.version};
}
/**
 * Computes result exclusively from immutable DB snapshot. Caller supplies
 * ONLY verified identity and battle ID; never a client-computed victory/trace.
 */
export async function finishServerPve(
  sql:V2PrivateSql,identity:VerifiedV2PveIdentity,battleId:string,
):Promise<V2PveFinished>{
  assertIdentity(identity);assertBattleId(battleId);
  const rows=await sql.unsafe(
    'select territory_v2.read_pve_execution($1::bigint,$2::uuid) as snapshot',
    [String(identity.telegramUserId),battleId]);
  if(!rows[0]?.snapshot)throw new Error('V2_PVE_NOT_FOUND');
  const snapshot=parseSnapshot(rows[0].snapshot);
  if(snapshot.battleId!==battleId)throw new Error('V2_PVE_BATTLE_ID_MISMATCH');
  const result=resolvePveEncounter(snapshot);
  const traceHash=await sha256Hex(JSON.stringify(result));
  const [resolveId,clearId]=await Promise.all([
    receiptId(battleId,'resolve'),receiptId(battleId,'clear')]);
  const settled=await sql.unsafe(
    'select territory_v2.finish_pve_execution($1::bigint,$2::uuid,$3::uuid,$4::uuid,$5::text,$6::text,$7::text,$8::integer) as result',
    [String(identity.telegramUserId),battleId,resolveId,clearId,traceHash,
      result.outcome,result.reason,result.turns]);
  if(!settled[0]?.result||typeof settled[0].result!=='object')
    throw new Error('V2_PVE_SETTLEMENT_MISSING');
  const receipt=settled[0].result as Record<string,unknown>;
  const resolution=receipt.resolution as Record<string,unknown>|undefined;
  if(!resolution||resolution.traceSha256!==traceHash||
     resolution.receiptId!==resolveId||resolution.outcome!==result.outcome||
     resolution.awardsGranted!==false)
    throw new Error('V2_PVE_SETTLEMENT_MISMATCH');
  return {battle:result,firstClear:receipt.clear??null,awardsGranted:false};
}
