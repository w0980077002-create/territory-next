/**
 * TERRITORY 2.0 – local quest receipt engine (SCR-18/19, GMP-09).
 *
 * Explicitly a DEMO-only implementation. Quest targets are presentation
 * fixtures, NOT assertions about Lootborn Warriors' or Call of Odin's
 * unpublished reward rates. No currency, XP, inventory or wallet writes.
 * Authoritative live quest counters, periods and claim receipts belong on
 * the V2 server after Telegram authentication.
 */
import type {V2Progression} from './progression';

export type V2DemoQuestGroup='story'|'daily'|'weekly';
export type V2DemoQuestMetric='wins'|'bosses'|'chapter';
export type V2DemoQuestId=
  'first_win'|'first_boss'|'chapter_two'|'day_wins'|'day_boss'|'week_wins'|'week_boss';
export type V2DemoQuestDefinition=Readonly<{
  id:V2DemoQuestId;
  group:V2DemoQuestGroup;
  title:string;
  description:string;
  metric:V2DemoQuestMetric;
  target:number;
}>;
export const V2_DEMO_QUEST_DEFINITIONS:readonly V2DemoQuestDefinition[]=[
  {id:'first_win',group:'story',title:'Первый бой',description:'Одержи первую победу в походе',metric:'wins',target:1},
  {id:'first_boss',group:'story',title:'Испытание силы',description:'Одолей своего первого босса',metric:'bosses',target:1},
  {id:'chapter_two',group:'story',title:'Новые земли',description:'Открой вторую главу похода',metric:'chapter',target:2},
  {id:'day_wins',group:'daily',title:'Дневной поход',description:'Побеждай врагов в течение дня',metric:'wins',target:3},
  {id:'day_boss',group:'daily',title:'Босс дня',description:'Одолей босса сегодня',metric:'bosses',target:1},
  {id:'week_wins',group:'weekly',title:'Недельный поход',description:'Одерживай победы в течение недели',metric:'wins',target:12},
  {id:'week_boss',group:'weekly',title:'Покоритель боссов',description:'Побеждай боссов на этой неделе',metric:'bosses',target:2},
] as const;

export interface V2DemoQuestState{
  readonly version:1;
  readonly dayKey:string;
  readonly weekKey:string;
  readonly dayWins:number;
  readonly dayBosses:number;
  readonly weekWins:number;
  readonly weekBosses:number;
  readonly seenBattles:readonly string[];
  readonly claimed:readonly string[];
}

const RECEIPT=/^v2-demo-encounter-[1-9]\d{0,11}$/;
const CLAIM=/^(?:first_win|first_boss|chapter_two)@story$|^(?:day_wins|day_boss)@\d{4}-\d{2}-\d{2}$|^(?:week_wins|week_boss)@\d{4}-\d{2}-\d{2}$/;
const DATE_KEY=/^\d{4}-\d{2}-\d{2}$/;
const nonnegative=(n:unknown,max=1e7):n is number=>
  typeof n==='number'&&Number.isSafeInteger(n)&&n>=0&&n<=max;

function kyivDay(date:Date):string{
  const tokens=new Intl.DateTimeFormat('en-GB',{
    timeZone:'Europe/Kyiv',year:'numeric',month:'2-digit',day:'2-digit',
  }).formatToParts(date);
  const d=(type:string)=>tokens.find(x=>x.type===type)?.value??'';
  return d('year')+'-'+d('month')+'-'+d('day');
}
export function v2DemoQuestPeriods(epochMs:number):{day:string;week:string}{
  if(!Number.isFinite(epochMs)||epochMs<0||epochMs>8.64e15)
    throw new RangeError('INVALID_QUEST_CLOCK');
  const day=kyivDay(new Date(epochMs));
  const [y,m,d]=day.split('-').map(Number);
  const today=new Date(Date.UTC(y,m-1,d));
  const sunday=new Date(Date.UTC(y,m-1,d-today.getUTCDay()));
  return {day,week:sunday.toISOString().slice(0,10)};
}
export function createV2DemoQuestState(nowMs=Date.now()):V2DemoQuestState{
  const p=v2DemoQuestPeriods(nowMs);
  return {version:1,dayKey:p.day,weekKey:p.week,dayWins:0,dayBosses:0,
    weekWins:0,weekBosses:0,seenBattles:[],claimed:[]};
}
export function rollV2DemoQuestPeriods(
  state:V2DemoQuestState,nowMs:number,
):V2DemoQuestState{
  const p=v2DemoQuestPeriods(nowMs);
  if(p.day===state.dayKey&&p.week===state.weekKey)return state;
  return {
    ...state,dayKey:p.day,weekKey:p.week,
    dayWins:p.day===state.dayKey?state.dayWins:0,
    dayBosses:p.day===state.dayKey?state.dayBosses:0,
    weekWins:p.week===state.weekKey?state.weekWins:0,
    weekBosses:p.week===state.weekKey?state.weekBosses:0,
  };
}
/** Called only once the demo battle receipt is committed locally.
 * Reprocessing an encounter ID cannot increase any quest metric.
 */
export function recordV2DemoQuestVictory(
  state:V2DemoQuestState,receiptId:string,isBoss:boolean,nowMs:number,
):V2DemoQuestState{
  if(!RECEIPT.test(receiptId)||typeof isBoss!=='boolean')return state;
  if(state.seenBattles.includes(receiptId))return state;
  const current=rollV2DemoQuestPeriods(state,nowMs);
  return {
    ...current,
    dayWins:Math.min(1e7,current.dayWins+1),
    dayBosses:Math.min(1e7,current.dayBosses+Number(isBoss)),
    weekWins:Math.min(1e7,current.weekWins+1),
    weekBosses:Math.min(1e7,current.weekBosses+Number(isBoss)),
    seenBattles:[...current.seenBattles,receiptId].slice(-20000),
  };
}
export function v2DemoQuestKey(
  def:V2DemoQuestDefinition,state:V2DemoQuestState,
):string{
  return def.id+'@'+(def.group==='story'?'story':
    def.group==='daily'?state.dayKey:state.weekKey);
}
export type V2DemoQuestView=Readonly<{
  definition:V2DemoQuestDefinition;key:string;current:number;
  target:number;ready:boolean;claimed:boolean;
}>;
export function listV2DemoQuests(
  state:V2DemoQuestState,progress:V2Progression,highestChapter:number,nowMs:number,
):readonly V2DemoQuestView[]{
  const currentState=rollV2DemoQuestPeriods(state,nowMs);
  return V2_DEMO_QUEST_DEFINITIONS.map(def=>{
    let current=0;
    if(def.group==='story'){
      current=def.metric==='wins'?progress.wins:
        def.metric==='bosses'?progress.bosses:highestChapter;
    }else if(def.group==='daily'){
      current=def.metric==='wins'?currentState.dayWins:currentState.dayBosses;
    }else{
      current=def.metric==='wins'?currentState.weekWins:currentState.weekBosses;
    }
    const key=v2DemoQuestKey(def,currentState);
    const claimed=currentState.claimed.includes(key);
    return {definition:def,key,current,target:def.target,ready:current>=def.target&&!claimed,claimed};
  });
}
/** Claiming only creates a cosmetic local demo receipt. No wallet reward. */
export function claimV2DemoQuest(
  state:V2DemoQuestState,questId:string,progress:V2Progression,
  highestChapter:number,nowMs:number,
):V2DemoQuestState{
  const normalized=rollV2DemoQuestPeriods(state,nowMs);
  const task=listV2DemoQuests(normalized,progress,highestChapter,nowMs)
    .find(x=>x.definition.id===questId);
  if(!task?.ready||normalized.claimed.includes(task.key))return normalized;
  return {...normalized,claimed:[...normalized.claimed,task.key].slice(-700)};
}

export function parseV2DemoQuestState(raw:unknown):V2DemoQuestState|null{
  if(!raw||typeof raw!=='object'||Array.isArray(raw))return null;
  const x=raw as Record<string,unknown>;
  if(x.version!==1||typeof x.dayKey!=='string'||!DATE_KEY.test(x.dayKey)||
     typeof x.weekKey!=='string'||!DATE_KEY.test(x.weekKey)||
     !nonnegative(x.dayWins)||!nonnegative(x.dayBosses)||
     !nonnegative(x.weekWins)||!nonnegative(x.weekBosses)||
     x.dayBosses>x.dayWins||x.weekBosses>x.weekWins||
     !Array.isArray(x.seenBattles)||x.seenBattles.length>20000||
     !x.seenBattles.every(z=>typeof z==='string'&&RECEIPT.test(z))||
     new Set(x.seenBattles).size!==x.seenBattles.length||
     !Array.isArray(x.claimed)||x.claimed.length>700||
     !x.claimed.every(z=>typeof z==='string'&&CLAIM.test(z))||
     new Set(x.claimed).size!==x.claimed.length)return null;
  return {
    version:1,dayKey:x.dayKey,weekKey:x.weekKey,
    dayWins:x.dayWins,dayBosses:x.dayBosses,
    weekWins:x.weekWins,weekBosses:x.weekBosses,
    seenBattles:[...x.seenBattles],claimed:[...x.claimed],
  };
}
