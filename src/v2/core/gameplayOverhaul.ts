/**
 * Single-client V2 offline campaign/economy ruleset. Absolutely NO backend,
 * real-money settlement, Telegram identity or V1 state access.
 * Stages, prizes, rolls and prices are explicit V2 DEMO tuning only.
 */
import {applyV2Xp,makeV2Item,V2_GEAR_SLOTS,V2_RARITIES,V2_ITEM_LIMIT,
 type V2Item,type V2Progression,type V2Rarity} from './progression';
import {encounterForChapter,type CombatConfig,type HeroClass,type CompanionKind} from './autoBattle';

export const V2_STAGE_CHAPTERS=5;
export const V2_STAGES_PER_CHAPTER=20;
export const V2_TOTAL_STAGES=V2_STAGE_CHAPTERS*V2_STAGES_PER_CHAPTER;
export type V2StageKind='normal'|'elite'|'boss';
export type V2Stage=Readonly<{id:number;chapter:number;stage:number;kind:V2StageKind;
 label:string;hpMultiplier:number;attackMultiplier:number;lootMultiplier:number}>;
export type V2StageCampaign=Readonly<{
 version:1;currentStage:number;highestUnlockedStage:number;
 highScores:Readonly<Record<string,number>>;runes:number;skillMultiplier:number;
 companionRolls:number;lastCompanionRoll:CompanionKind|null;
 claimedStages:readonly number[];
}>;
export type V2LootBurst=Readonly<{
 receiptId:string;stageId:number;rarity:V2Rarity;items:readonly V2Item[];
 xp:number;gold:number;runes:number;autoequipped:readonly string[];
}>;
export type V2StageResult=Readonly<{
 campaign:V2StageCampaign;progress:V2Progression;burst:V2LootBurst|null
}>;
export type V2ShopKind='companion'|'skill'|'reset';
export type V2ShopQuote=Readonly<{kind:V2ShopKind;gold:number;runes:number}>;
export const V2_SHOP_BASE_PRICES={
 companion:{gold:550,runes:0},
 skill:{gold:850,runes:1},
 reset:{gold:300,runes:0},
} as const;
export const V2_MAX_SHOP_SKILL_LEVEL=10;
const companionPool:readonly CompanionKind[]=['guardian','warrior','healer','hunter','mage','warcow'];
const isInt=(v:unknown,min:number,max:number):v is number=>
 typeof v==='number'&&Number.isSafeInteger(v)&&v>=min&&v<=max;
const object=(v:unknown):v is Record<string,unknown>=>v!==null&&typeof v==='object'&&!Array.isArray(v);
const clampRoll=(r:number)=>Number.isFinite(r)?Math.min(.999999,Math.max(0,r)):0;
const clamp=(n:number,lo:number,hi:number)=>Math.max(lo,Math.min(hi,n));
export function stageAt(id:number):V2Stage {
 const safe=isInt(id,1,V2_TOTAL_STAGES)?id:1;
 const chapter=Math.ceil(safe/V2_STAGES_PER_CHAPTER);
 const stage=((safe-1)%V2_STAGES_PER_CHAPTER)+1;
 const kind:V2StageKind=stage%10===0?'boss':stage%5===0?'elite':'normal';
 const stageIndex=safe-1;
 return {id:safe,chapter,stage,kind,
  label:kind==='boss'?'Босс':kind==='elite'?'Элитный враг':'Обычный враг',
  hpMultiplier:(1+stageIndex*.048)*(kind==='boss'?3.4:kind==='elite'?1.75:1),
  attackMultiplier:(1+stageIndex*.028)*(kind==='boss'?1.55:kind==='elite'?1.25:1),
  lootMultiplier:kind==='boss'?3:kind==='elite'?1.7:1};
}
export const V2_STAGE_MAP:readonly V2Stage[]=Array.from(
 {length:V2_TOTAL_STAGES},(_,i)=>stageAt(i+1));
export function stageEncounter(stageId:number,heroClass:HeroClass):CombatConfig{
 const info=stageAt(stageId);
 const base=encounterForChapter(info.chapter,Math.min(4,((info.stage-1)%4)+1),heroClass);
 const elite=info.kind!=='normal';
 return {...base,boss:elite,enemyName:
   info.kind==='boss'?'Властитель Северных земель':info.kind==='elite'?'Элитный защитник':'Страж гор',
  enemy:{...base.enemy,
   level:Math.min(300,Math.max(1,info.id)),
   hp:Math.round(base.enemy.hp*info.hpMultiplier),
   attack:Math.round(base.enemy.attack*info.attackMultiplier),
   defense:Math.round(base.enemy.defense*(1+(stageId-1)*.035)),
   critChance:elite?.1:base.enemy.critChance,
  }};
}
export function createV2StageCampaign():V2StageCampaign{
 return {version:1,currentStage:1,highestUnlockedStage:1,highScores:{},
  runes:0,skillMultiplier:0,companionRolls:0,lastCompanionRoll:null,claimedStages:[]};
}
export function parseV2StageCampaign(value:unknown):V2StageCampaign|null {
 if(!object(value)||value.version!==1||
 !isInt(value.currentStage,1,V2_TOTAL_STAGES)||
 !isInt(value.highestUnlockedStage,1,V2_TOTAL_STAGES)||
 value.currentStage>value.highestUnlockedStage||
 !isInt(value.runes,0,1_000_000)||!isInt(value.skillMultiplier,0,V2_MAX_SHOP_SKILL_LEVEL)||
 !isInt(value.companionRolls,0,1_000_000)||
 !(value.lastCompanionRoll===null||companionPool.includes(value.lastCompanionRoll as CompanionKind))||
 !object(value.highScores)||Object.keys(value.highScores).length>V2_TOTAL_STAGES||
 !Array.isArray(value.claimedStages)||value.claimedStages.length>V2_TOTAL_STAGES)return null;
 const scores:Record<string,number>={};
 for(const [key,score] of Object.entries(value.highScores)){
  const id=Number(key);
  if(String(id)!==key||!isInt(id,1,V2_TOTAL_STAGES)||!isInt(score,0,1_000_000)||
    id>=value.highestUnlockedStage+1)return null;
  scores[key]=score;
 }
 const claimed:number[]=[];
 for(const stage of value.claimedStages){
  if(!isInt(stage,1,V2_TOTAL_STAGES)||stage>value.highestUnlockedStage||
    claimed.includes(stage))return null;
  claimed.push(stage);
 }
 return {version:1,currentStage:value.currentStage as number,
 highestUnlockedStage:value.highestUnlockedStage as number,
 highScores:scores,runes:value.runes as number,skillMultiplier:value.skillMultiplier as number,
 companionRolls:value.companionRolls as number,lastCompanionRoll:value.lastCompanionRoll as CompanionKind|null,
 claimedStages:claimed};
}
export function chooseV2Stage(state:V2StageCampaign,id:number):V2StageCampaign{
 if(!isInt(id,1,V2_TOTAL_STAGES)||id>state.highestUnlockedStage)return state;
 return id===state.currentStage?state:{...state,currentStage:id};
}
export function v2StageScore(ticks:number,remainingHp:number,maxHp:number):number{
 const t=isInt(ticks,0,100000)?ticks:100000;
 const health=maxHp>0?clamp(remainingHp/maxHp,0,1):0;
 return clamp(Math.round(1000/(1+t*.025)+health*250),0,1000);
}
/** Deterministic preview loot RNG; never use predictable rolls for real payouts. */
const mix=(receiptId:string,roll:number,index:number):number=>{
 let hash=2166136261;
 for(let j=0;j<receiptId.length;j++)hash=Math.imul(hash^receiptId.charCodeAt(j),16777619)>>>0;
 hash=(hash^Math.imul(index+1,2246822519)^Math.floor(clampRoll(roll)*0xffffffff))>>>0;
 hash=Math.imul(hash^(hash>>>16),2246822519)>>>0;
 return ((hash^(hash>>>13))>>>0)/4294967296;
};
export function settleV2Stage(
 campaign:V2StageCampaign,progress:V2Progression,receiptId:string,
 score:number,roll:number
):V2StageResult{
 const unchanged={campaign,progress,burst:null};
 if(!/^v2-demo-encounter-[1-9]\d{0,11}$/.test(receiptId)||
 progress.receipts.includes(receiptId)||
 !isInt(campaign.currentStage,1,V2_TOTAL_STAGES)||
 campaign.currentStage>campaign.highestUnlockedStage)return unchanged;
 const stage=stageAt(campaign.currentStage),firstClear=!campaign.claimedStages.includes(stage.id);
 const safeScore=isInt(score,0,1000)?score:0;
 const gold=Math.round((60+stage.id*19)*stage.lootMultiplier);
 const xp=Math.round((40+stage.id*14)*stage.lootMultiplier);
 const runeReward=stage.kind==='boss'?2:stage.kind==='elite'?1:0;
 const count=stage.kind==='boss'?3:stage.kind==='elite'?2:1;
 const inventory=[...progress.inventory],equipped={...progress.equipped};
 const drops:V2Item[]=[];
 const autoequipped:string[]=[];
 let overflowMaterials=0;
 for(let i=0;i<count;i++){
  const r=mix(receiptId,roll,i);
  const rarity:V2Rarity=r>.985?'legendary':r>.86?'epic':r>.57?'rare':'common';
  const slot=V2_GEAR_SLOTS[Math.floor(mix(receiptId,roll,i+19)*V2_GEAR_SLOTS.length)];
  const level=Math.min(progress.level,Math.max(1,stage.id));
  const item=makeV2Item('loot-'+receiptId+'-'+i,slot,rarity,level);
  if(!equipped[slot]&&item.level<=progress.level){
   equipped[slot]=item;drops.push(item);autoequipped.push(item.id);
  }else if(inventory.length<V2_ITEM_LIMIT){inventory.push(item);drops.push(item);}
  else overflowMaterials+=(V2_RARITIES.indexOf(rarity)+1)*4;
 }
 const nextStage=firstClear?Math.min(V2_TOTAL_STAGES,stage.id+1):campaign.highestUnlockedStage;
 const nextCampaign:V2StageCampaign={
  ...campaign,
  currentStage:firstClear?nextStage:campaign.currentStage,
  highestUnlockedStage:Math.max(campaign.highestUnlockedStage,nextStage),
  highScores:{...campaign.highScores,[stage.id]:Math.max(campaign.highScores[stage.id]??0,safeScore)},
  claimedStages:firstClear?[...campaign.claimedStages,stage.id]:campaign.claimedStages,
  runes:campaign.runes+runeReward,
 };
 const nextProgress:V2Progression={
  ...progress,...applyV2Xp(progress,xp),gold:progress.gold+gold,
  materials:progress.materials+overflowMaterials,
  wins:progress.wins+1,bosses:progress.bosses+(stage.kind==='boss'?1:0),
  inventory,equipped,receipts:[...progress.receipts,receiptId],
  latestLoot:{id:receiptId,chapter:stage.chapter,wave:Math.ceil(stage.stage/4),
   xp,gold,materials:overflowMaterials,item:drops[0]??null,duplicate:false},
 };
 return {campaign:nextCampaign,progress:nextProgress,
  burst:{receiptId,stageId:stage.id,rarity:drops[0]?.rarity??'common',
   items:drops,xp,gold,runes:runeReward,autoequipped}};
}
export function quoteV2Shop(kind:V2ShopKind,campaign:V2StageCampaign):V2ShopQuote{
 const base=V2_SHOP_BASE_PRICES[kind];
 const level=kind==='skill'?campaign.skillMultiplier:kind==='companion'?campaign.companionRolls:0;
 return {kind,gold:base.gold+level*(kind==='skill'?310:kind==='companion'?45:0),
  runes:base.runes};
}
export function buyV2Shop(
 campaign:V2StageCampaign,progress:V2Progression,
 kind:V2ShopKind,roll=0
):Readonly<{campaign:V2StageCampaign;progress:V2Progression;success:boolean}>{
 if(!['companion','skill','reset'].includes(kind))return {campaign,progress,success:false};
 const quote=quoteV2Shop(kind,campaign);
 if(progress.gold<quote.gold||campaign.runes<quote.runes||
  (kind==='skill'&&campaign.skillMultiplier>=V2_MAX_SHOP_SKILL_LEVEL)||
  (kind==='reset'&&campaign.skillMultiplier===0))return {campaign,progress,success:false};
 const updated:V2StageCampaign={...campaign,
  runes:campaign.runes-quote.runes,
  skillMultiplier:kind==='skill'?campaign.skillMultiplier+1:kind==='reset'?0:campaign.skillMultiplier,
  companionRolls:campaign.companionRolls+(kind==='companion'?1:0),
  lastCompanionRoll:kind==='companion'
   ?companionPool[Math.floor(clampRoll(roll)*companionPool.length)]
   :campaign.lastCompanionRoll,
 };
 return {campaign:updated,progress:{...progress,gold:progress.gold-quote.gold},success:true};
}
export function v2BoughtSkillAttackMultiplier(campaign:V2StageCampaign):number{
 return 1+campaign.skillMultiplier*.035;
}
