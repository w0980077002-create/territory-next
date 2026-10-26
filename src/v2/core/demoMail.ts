/**
 * TERRITORY 2.0 — offline-only inbox with persistent battle reports.
 * No rewards, payment operations, Supabase, Telegram accounts or V1 storage.
 * An inbox receipt is a visual event, NEVER a currency/item grant.
 */
export type V2DemoMailKind='elite'|'boss';
export type V2DemoMailReport=Readonly<{
  receiptId:string;stageId:number;kind:V2DemoMailKind;wonAt:number;
}>;
export type V2DemoMailState=Readonly<{
  version:1;
  read:readonly string[];
  reviewed:readonly string[];
  archived:readonly string[];
  reports:readonly V2DemoMailReport[];
}>;
export type V2DemoMailItem=Readonly<{
  id:string;title:string;from:string;image:string;body:string;
  attachmentLabel:string;sentAt:string;
}>;
export const V2_DEMO_MAIL_LIMIT=40;
const BATTLE_RECEIPT=/^v2-demo-encounter-[1-9]\d{0,11}$/;
const STATIC_IDS=['welcome','expedition','supplies'] as const;
export const V2_DEMO_MAIL_STATIC:readonly V2DemoMailItem[]=[
  {id:'welcome',title:'Добро пожаловать на Север',from:'Летописец TERRITORY',
   image:'art/icons/mail.svg',body:'Добро пожаловать в отдельную тестовую TERRITORY 2.0. Эта почта и прогресс существуют только на устройстве.',
   attachmentLabel:'Без вложений',sentAt:'Постоянное письмо'},
  {id:'expedition',title:'Отчёт о походах',from:'Совет северных земель',
   image:'art/icons/quests.svg',body:'Победы над элитными врагами и боссами теперь попадают в историю писем. Награды за них выдаются только в отдельной демонстрационной боевой системе.',
   attachmentLabel:'История боёв',sentAt:'Постоянное письмо'},
  {id:'supplies',title:'Подарки и посылки',from:'Кладовщик',
   image:'art/icons/rewards.svg',body:'Будущие серверные письма смогут содержать награды, но сейчас получение валюты, VIP и предметов из почты полностью отключено.',
   attachmentLabel:'Нет доступных наград',sentAt:'Постоянное письмо'},
];
const validId=(id:unknown):id is string=>
 typeof id==='string'&&(STATIC_IDS.some(s=>s===id)||
  (id.startsWith('battle:')&&BATTLE_RECEIPT.test(id.slice(7))));
const validTimestamp=(n:unknown):n is number=>
 typeof n==='number'&&Number.isSafeInteger(n)&&n>=0&&n<=8.64e15;
const unique=(values:readonly string[])=>new Set(values).size===values.length;
export const createV2DemoMailState=():V2DemoMailState=>({
 version:1,read:[],reviewed:[],archived:[],reports:[],
});
const mailId=(receiptId:string)=>'battle:'+receiptId;
const stageKind=(stageId:number):V2DemoMailKind|null=>{
 if(!Number.isSafeInteger(stageId)||stageId<1||stageId>100)return null;
 return stageId%10===0?'boss':stageId%5===0?'elite':null;
};
export function listV2DemoMail(state:V2DemoMailState):readonly V2DemoMailItem[]{
 const reports=[...state.reports].reverse().map(report=>{
  const kind=report.kind==='boss'?'босс':'элитный враг';
  const time=new Date(report.wonAt).toISOString().slice(0,16).replace('T',' ')+' UTC';
  return {
   id:mailId(report.receiptId),
   title:report.kind==='boss'?'Побеждён босс':'Элитная победа',
   from:'Боевой летописец',image:'art/icons/quests.svg',
   body:'Победа: '+kind+' на этапе '+Math.ceil(report.stageId/20)+'-'+((report.stageId-1)%20+1)+
    '. Отчёт о демонстрационном бое '+report.receiptId+'.',
   attachmentLabel:'Отчёт без дополнительных наград',sentAt:time,
  };
 });
 return [...reports,...V2_DEMO_MAIL_STATIC];
}
export function recordV2DemoMailBattle(
 state:V2DemoMailState,receiptId:string,stageId:number,wonAt:number,
):V2DemoMailState{
 const kind=stageKind(stageId);
 if(!kind||!BATTLE_RECEIPT.test(receiptId)||!validTimestamp(wonAt)||
    state.reports.some(r=>r.receiptId===receiptId))return state;
 const reports=[...state.reports,{receiptId,stageId,kind,wonAt}].slice(-V2_DEMO_MAIL_LIMIT);
 const allowed=new Set([...STATIC_IDS,...reports.map(r=>mailId(r.receiptId))]);
 const keep=(values:readonly string[])=>values.filter(id=>allowed.has(id));
 return {...state,reports,read:keep(state.read),reviewed:keep(state.reviewed),
  archived:keep(state.archived)};
}
export function updateV2DemoMail(
 state:V2DemoMailState,action:'read'|'review'|'archive'|'restore'|'read-all',
 id?:string,
):V2DemoMailState{
 const all=listV2DemoMail(state).map(item=>item.id);
 if(action==='read-all'){
  return all.every(key=>state.read.includes(key))?state:{...state,read:all};
 }
 if(!id||!all.includes(id))return state;
 const add=(arr:readonly string[])=>arr.includes(id)?arr:[...arr,id];
 if(action==='read')return state.read.includes(id)?state:{...state,read:add(state.read)};
 if(action==='review')return state.reviewed.includes(id)?state:{
  ...state,read:add(state.read),reviewed:add(state.reviewed),
 };
 if(action==='archive')return state.archived.includes(id)?state:{
  ...state,read:add(state.read),archived:add(state.archived),
 };
 if(action==='restore')return state.archived.includes(id)?{
  ...state,archived:state.archived.filter(key=>key!==id),
 }:state;
 return state;
}
export function parseV2DemoMailState(raw:unknown):V2DemoMailState|null{
 if(!raw||typeof raw!=='object'||Array.isArray(raw))return null;
 const x=raw as Record<string,unknown>;
 if(x.version!==1||!Array.isArray(x.reports)||x.reports.length>V2_DEMO_MAIL_LIMIT||
    !Array.isArray(x.read)||!Array.isArray(x.reviewed)||!Array.isArray(x.archived))return null;
 const reports:V2DemoMailReport[]=[];
 for(const report of x.reports){
  if(!report||typeof report!=='object'||Array.isArray(report))return null;
  const r=report as Record<string,unknown>;
  if(typeof r.receiptId!=='string'||!BATTLE_RECEIPT.test(r.receiptId)||
    typeof r.stageId!=='number'||stageKind(r.stageId)!==r.kind||
    !validTimestamp(r.wonAt))return null;
  reports.push({receiptId:r.receiptId,stageId:r.stageId,kind:r.kind as V2DemoMailKind,
   wonAt:r.wonAt});
 }
 if(!unique(reports.map(r=>r.receiptId)))return null;
 const allowed=new Set([...STATIC_IDS,...reports.map(r=>mailId(r.receiptId))]);
 const check=(arr:unknown[]):arr is string[]=>
  arr.length<=V2_DEMO_MAIL_LIMIT+STATIC_IDS.length&&
  arr.every(id=>validId(id)&&allowed.has(id))&&unique(arr as string[]);
 const read=x.read as unknown[];
 const reviewed=x.reviewed as unknown[];
 const archived=x.archived as unknown[];
 if(!check(read)||!check(reviewed)||!check(archived)||
   !reviewed.every(id=>read.includes(id))||
   !archived.every(id=>read.includes(id)))return null;
 return {version:1,read:[...read],reviewed:[...reviewed],
  archived:[...archived],reports};
}
