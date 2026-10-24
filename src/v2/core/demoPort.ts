/** Isolated TERRITORY 2.0 PORT demo — not server economy, no material rewards.
 * Owner-approved mining rule: ONE extraction at a time, duration FOUR hours.
 * Mining start/claim receipts become authoritative only through the private
 * territory_v2.mining_jobs table and future authenticated V2 server endpoint.
 */
export const V2_DEMO_MINING_DURATION_MS=4*60*60*1000;
export type V2DemoResource='ore'|'wood'|'herbs';
export const V2_DEMO_RESOURCES=[
  {id:'ore',label:'Руда',icon:'⛏',description:'Шахты у ледяных склонов'},
  {id:'wood',label:'Древесина',icon:'🪵',description:'Лесозаготовка на северном побережье'},
  {id:'herbs',label:'Травы',icon:'🌿',description:'Сбор трав и припасов'},
] as const;
export type V2DemoMiningJob=Readonly<{
  id:number; resource:V2DemoResource;startedAt:number;finishAt:number;
}>;
export type V2DemoMiningState=Readonly<{
  version:1;
  nextJobId:number;
  job:V2DemoMiningJob|null;
  claimedJobs:readonly number[];
  cancelledJobs:readonly number[];
}>;
const validTime=(n:unknown):n is number=>typeof n==='number'&&Number.isSafeInteger(n)&&n>=0&&n<=9999999999999;
const validJobNumber=(n:unknown):n is number=>typeof n==='number'&&Number.isSafeInteger(n)&&n>=1&&n<=1e7;
const resource=(s:unknown):s is V2DemoResource=>V2_DEMO_RESOURCES.some(x=>x.id===s);
export function createV2DemoMiningState():V2DemoMiningState{
  return {version:1,nextJobId:1,job:null,claimedJobs:[],cancelledJobs:[]};
}
export function parseV2DemoMiningState(v:unknown):V2DemoMiningState|null{
  if(!v||typeof v!=='object'||Array.isArray(v))return null;
  const x=v as Record<string,unknown>;
  if(x.version!==1||!validJobNumber(x.nextJobId)||
    !Array.isArray(x.claimedJobs)||x.claimedJobs.length>100||
    !Array.isArray(x.cancelledJobs)||x.cancelledJobs.length>100||
    !x.claimedJobs.every(validJobNumber)||!x.cancelledJobs.every(validJobNumber))return null;
  const all=[...x.claimedJobs,...x.cancelledJobs];
  if(new Set(all).size!==all.length||all.some(id=>id>=Number(x.nextJobId)))return null;
  let job:V2DemoMiningJob|null=null;
  if(x.job!==null){
    if(!x.job||typeof x.job!=='object'||Array.isArray(x.job))return null;
    const j=x.job as Record<string,unknown>;
    if(!validJobNumber(j.id)||j.id>=x.nextJobId||
      !resource(j.resource)||!validTime(j.startedAt)||!validTime(j.finishAt)||
      j.startedAt>Number.MAX_SAFE_INTEGER-V2_DEMO_MINING_DURATION_MS||
      j.finishAt!==j.startedAt+V2_DEMO_MINING_DURATION_MS||
      all.includes(j.id))return null;
    job={id:j.id,resource:j.resource,startedAt:j.startedAt,finishAt:j.finishAt};
  }
  return {
    version:1,nextJobId:x.nextJobId as number,job,
    claimedJobs:[...x.claimedJobs],cancelledJobs:[...x.cancelledJobs],
  };
}
export function beginV2DemoMining(
  state:V2DemoMiningState,selected:V2DemoResource,now:number,
):V2DemoMiningState{
  if(state.job||!resource(selected)||!validTime(now)||
     now>9999999999999-V2_DEMO_MINING_DURATION_MS||
     state.nextJobId>=1e7)return state;
  return {...state,nextJobId:state.nextJobId+1,
    job:{id:state.nextJobId,resource:selected,startedAt:now,finishAt:now+V2_DEMO_MINING_DURATION_MS}};
}
export function claimV2DemoMining(
  state:V2DemoMiningState,now:number,
):V2DemoMiningState{
  if(!state.job||!validTime(now)||now<state.job.finishAt)return state;
  return {...state,job:null,claimedJobs:[...state.claimedJobs,state.job.id].slice(-100)};
}
export function cancelV2DemoMining(state:V2DemoMiningState):V2DemoMiningState{
  if(!state.job)return state;
  return {...state,job:null,cancelledJobs:[...state.cancelledJobs,state.job.id].slice(-100)};
}
export function v2DemoMiningSecondsLeft(
  state:V2DemoMiningState,now:number,
):number{
  if(!state.job||!validTime(now))return 0;
  return Math.max(0,Math.ceil((state.job.finishAt-now)/1000));
}
