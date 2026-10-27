/**
 * TERRITORY 2.0: testable HTTP contract for the isolated Telegram gateway.
 *
 * Public functions must fail CLOSED until a distinct V2 bot token and
 * V2_ENABLE_TELEGRAM_GATEWAY=yes are configured on staging.
 * The caller's Telegram identity is taken solely from raw signed initData.
 *
 * NOT a rewards API. Authenticated profile and campaign reads, plus first-time
 * class registration, are the only permitted operations.
 */
export interface V2VerifiedTelegramUser {
  telegramUserId:number;
  displayName:string;
  photoUrl:string|null;
  authDate:number;
}
export interface V2GatewaySnapshot {
  registered:boolean;
  player?:{id:string;displayName:string;avatarRef:string|null};
  hero?:{
    id:string;classId:string;level:number;xp:string;
    stageChapter:number;stageWave:number;highestUnlockedChapter:number;revision:string;
  }|null;
  wallets?:ReadonlyArray<{currency:string;amountMinor:string;revision:string}>;
}
export interface V2CampaignSnapshot {
  readonly registered:boolean;
  readonly chapter?:number;
  readonly wave?:number;
  readonly highestUnlockedChapter?:number;
  readonly revision?:string;
  readonly clearedCount?:number;
  readonly campaignCompleted?:boolean;
  readonly recentClears?:ReadonlyArray<{chapter:number;wave:number;clearedAt:string}>;
}
export type GatewayDeps={
  readonly enabled:boolean;
  readonly allowOrigin:string;
  readonly verify:(initData:string)=>Promise<V2VerifiedTelegramUser>;
  /** Atomic account-based budget, invoked only after authentic HMAC verification. */
  readonly enforceRateLimit:(user:V2VerifiedTelegramUser,action:'profile'|'join')=>Promise<boolean>;
  readonly getProfile:(user:V2VerifiedTelegramUser)=>Promise<V2GatewaySnapshot>;
  readonly getCampaign:(user:V2VerifiedTelegramUser)=>Promise<V2CampaignSnapshot>;
  readonly register:(user:V2VerifiedTelegramUser,classId:'berserker'|'runemage'|'ranger')=>Promise<V2GatewaySnapshot>;
};
export const MAX_V2_AUTH_BODY_CHARS=9000;

function response(
  value:Record<string,unknown>,status:number,origin:string|undefined,
):Response{
  const headers=new Headers({
    'Content-Type':'application/json; charset=utf-8',
    'Cache-Control':'no-store',
    'X-Content-Type-Options':'nosniff',
    'Referrer-Policy':'no-referrer',
  });
  if(origin){
    headers.set('Access-Control-Allow-Origin',origin);
    headers.set('Access-Control-Allow-Methods','GET, POST, OPTIONS');
    headers.set('Access-Control-Allow-Headers','content-type');
    headers.set('Vary','Origin');
  }
  return new Response(JSON.stringify(value),{status,headers});
}
export async function handleV2GatewayRequest(request:Request,deps:GatewayDeps):Promise<Response>{
  const origin=request.headers.get('Origin');
  const corsOrigin=origin===deps.allowOrigin?origin:undefined;
  const path=new URL(request.url).pathname.replace(/\/$/,'');
  // Match a whole endpoint name, not a suffix like /fake-profile.
  const action=path.match(/\/territory-v2-api\/(health|profile|join|campaign)$/)?.[1]??'not_found';
  if(action==='not_found')return response({error:'NOT_FOUND'},404,corsOrigin);
  if(origin && !corsOrigin)return response({error:'ORIGIN_NOT_ALLOWED'},403);
  if(request.method==='OPTIONS'){
    if(!corsOrigin)return response({error:'ORIGIN_REQUIRED'},403);
    return new Response(null,{status:204,headers:{
      'Access-Control-Allow-Origin':corsOrigin,
      'Access-Control-Allow-Methods':'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers':'content-type',
      'Access-Control-Max-Age':'300',
      'Cache-Control':'no-store',
      'Vary':'Origin',
    }});
  }
  if(action==='health'){
    if(request.method!=='GET')return response({error:'METHOD_NOT_ALLOWED'},405,corsOrigin);
    return response({mode:'isolated-v2-staging',enabled:deps.enabled},200,corsOrigin);
  }
  if(request.method!=='POST')return response({error:'METHOD_NOT_ALLOWED'},405,corsOrigin);
  if(!corsOrigin)return response({error:'ORIGIN_REQUIRED'},403);
  if(!deps.enabled)return response({error:'V2_GATEWAY_NOT_CONFIGURED'},503,corsOrigin);
  if(!request.headers.get('content-type')?.toLowerCase().startsWith('application/json'))
    return response({error:'JSON_REQUIRED'},415,corsOrigin);
  try{
    const body=await request.text();
    if(!body||body.length>MAX_V2_AUTH_BODY_CHARS)
      return response({error:'REQUEST_SIZE_INVALID'},413,corsOrigin);
    let parsed:unknown;
    try{parsed=JSON.parse(body);}catch{return response({error:'INVALID_JSON'},400,corsOrigin);}
    if(!parsed||typeof parsed!=='object'||Array.isArray(parsed))
      return response({error:'INVALID_PAYLOAD'},400,corsOrigin);
    const input=parsed as Record<string,unknown>;
    const allowedKeys=action==='join'?['initData','classId']:['initData'];
    if(Object.keys(input).some(key=>!allowedKeys.includes(key)))
      return response({error:'UNEXPECTED_FIELDS'},400,corsOrigin);
    if(typeof input.initData!=='string'||input.initData.length<10||input.initData.length>8192)
      return response({error:'INVALID_INITDATA'},401,corsOrigin);
    let user:V2VerifiedTelegramUser;
    try{user=await deps.verify(input.initData);}
    catch{return response({error:'INVALID_TELEGRAM_SIGNATURE'},401,corsOrigin);}
    // Campaign reads share the profile budget: no second quota to abuse.
    if(!(await deps.enforceRateLimit(user,action==='join'?'join':'profile')))
      return response({error:'RATE_LIMITED'},429,corsOrigin);
    if(action==='join'){
      const klass=input.classId;
      if(klass!=='berserker'&&klass!=='runemage'&&klass!=='ranger')
        return response({error:'UNSUPPORTED_V2_CLASS'},422,corsOrigin);
      const profile=await deps.register(user,klass);
      return response({data:profile},200,corsOrigin);
    }
    if(action==='campaign'){
      const campaign=await deps.getCampaign(user);
      return response({data:campaign},200,corsOrigin);
    }
    const profile=await deps.getProfile(user);
    return response({data:profile},200,corsOrigin);
  }catch{
    return response({error:'INTERNAL_GATEWAY_ERROR'},500,corsOrigin);
  }
}
