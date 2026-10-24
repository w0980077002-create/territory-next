// TERRITORY 2.0 staging ONLY — private authenticated player gateway.
// Deployed only to Supabase project ksikzkrvuuhermhnbycn.
// Operates outside the public static game. NEVER reuse V1 Telegram token.
// Deno runtime + postgres.js (transaction-pool-safe prepare:false).
import postgres from 'npm:postgres@3.4.3';
import {handleV2GatewayRequest, type V2VerifiedTelegramUser, type V2GatewaySnapshot} from '../../../server/api/telegramGateway.ts';
import {verifyV2TelegramInitData} from '../../../server/telegram/verifyInitData.ts';

const EXPECTED_URL='https://ksikzkrvuuhermhnbycn.supabase.co';
const ALLOWED_ORIGIN='https://w0980077002-create.github.io';
const botToken=Deno.env.get('TERRITORY_V2_BOT_TOKEN') ?? '';
const projectUrl=Deno.env.get('SUPABASE_URL') ?? '';
const connectionUrl=Deno.env.get('SUPABASE_DB_URL') ?? '';
const enabled=(
  Deno.env.get('V2_ENABLE_TELEGRAM_GATEWAY')==='yes' &&
  projectUrl===EXPECTED_URL &&
  /^\d{5,15}:[a-zA-Z0-9_-]{30,}$/.test(botToken) &&
  connectionUrl.length>20
);
// If any prerequisite is missing the endpoint intentionally returns 503,
// WITHOUT creating a DB connection or registering anyone.
const sql=enabled?postgres(connectionUrl,{prepare:false,max:1,idle_timeout:5,connect_timeout:5}):null;

async function getProfile(user:V2VerifiedTelegramUser):Promise<V2GatewaySnapshot>{
  if(!sql)throw new Error('V2_GATEWAY_NOT_CONFIGURED');
  const rows=await sql`
    select id::text as id,display_name,avatar_ref
    from territory_v2.players where telegram_user_id=${user.telegramUserId.toString()}::bigint limit 1
  `;
  if(!rows.length)return {registered:false};
  const player=rows[0];
  const [characters,wallets]=await Promise.all([
    sql`select id::text as id,class_id,level,xp::text as xp,
        stage_chapter,stage_wave,highest_unlocked_chapter,revision::text as revision
        from territory_v2.characters where player_id=${player.id}::uuid limit 1`,
    sql`select currency_code,amount_minor::text as amount_minor,revision::text as revision
        from territory_v2.wallet_balances where player_id=${player.id}::uuid
        order by currency_code`
  ]);
  const char=characters[0];
  return {
    registered:true,
    player:{id:player.id,displayName:player.display_name,avatarRef:player.avatar_ref},
    hero:char?{
      id:char.id,classId:char.class_id,level:char.level,xp:char.xp,
      stageChapter:char.stage_chapter,stageWave:char.stage_wave,
      highestUnlockedChapter:char.highest_unlocked_chapter,revision:char.revision
    }:null,
    wallets:wallets.map(row=>({
      currency:row.currency_code,amountMinor:row.amount_minor,revision:row.revision
    }))
  };
}

const deps={
  enabled,
  allowOrigin:ALLOWED_ORIGIN,
  verify:(initData:string)=>verifyV2TelegramInitData(initData,botToken),
  // PostgreSQL-backed buckets are shared by all Edge workers. Input user ID
  // is taken from verified signed initData, never request JSON.
  enforceRateLimit:async(user:V2VerifiedTelegramUser,action:'profile'|'join')=>{
    if(!sql)throw new Error('V2_GATEWAY_NOT_CONFIGURED');
    // Separate route limits; not configured by or disclosed to the browser.
    const max=action==='join'?4:60;
    const seconds=action==='join'?3600:600;
    const rows=await sql`select territory_v2.try_gateway_rate_limit(
      ${user.telegramUserId.toString()}::bigint,
      ${action}::text,${max}::integer,${seconds}::integer
    ) as allowed`;
    return rows[0]?.allowed===true;
  },
  getProfile,
  register:async(user:V2VerifiedTelegramUser,classId:'berserker'|'runemage'|'ranger')=>{
    if(!sql)throw new Error('V2_GATEWAY_NOT_CONFIGURED');
    await sql.begin(async tx=>{
      const result=await tx`select territory_v2.upsert_verified_telegram_player(
        ${user.telegramUserId.toString()}::bigint,${user.displayName}::text,
        ${user.photoUrl}::text
      ) as id`;
      await tx`select territory_v2.create_character_once(
        ${result[0].id}::uuid,${classId}::text
      )`;
    });
    return getProfile(user);
  },
};

Deno.serve(async(request:Request)=>{
  return handleV2GatewayRequest(request,deps);
});
