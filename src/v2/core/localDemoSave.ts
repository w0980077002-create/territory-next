/**
 * Offline TERRITORY 2.0 demo-only save. This is NOT Telegram persistence,
 * Supabase progress, server receipts, player inventory, or real currency.
 * Entirely namespaced from every TERRITORY 1.0 key and service.
 *
 * Validates the untrusted localStorage document before restoring it; item
 * stats are rederived from rules, rather than trusting saved stat payloads.
 */
import {createV2DemoProgress,makeV2Item,V2_GEAR_SLOTS,V2_RARITIES,
  V2_ITEM_LIMIT,V2_MAX_LEVEL,V2_MAX_UPGRADE,nextXp,
  type V2Item,type V2Progression,type V2GearSlot,type V2Rarity
} from './progression';
import {createDemoBuildSlots,validDemoBuild,type DemoBuildSlot} from './previewBuilds';
import type {HeroClass,RuneKind,CompanionKind} from './autoBattle';
import {parseV2DemoQuestState,type V2DemoQuestState} from './demoQuests';

export const V2_LOCAL_DEMO_SAVE_KEY='territory-next-v2:offline-demo:v1';
export const V2_LOCAL_DEMO_SAVE_VERSION=1;
export const V2_LOCAL_SAVE_MAX_LENGTH=300000;

export type V2LocalDemoSave={
  readonly version:1;
  readonly savedAt:number;
  readonly chapter:number;
  readonly wave:number;
  readonly highestUnlockedChapter:number;
  readonly encounterId:number;
  readonly heroClass:HeroClass;
  readonly rune:RuneKind;
  readonly companion:CompanionKind;
  readonly speed:1|2;
  readonly auto:boolean;
  readonly victories:number;
  readonly defeats:number;
  readonly progress:V2Progression;
  readonly builds:readonly DemoBuildSlot[];
  readonly quests?:V2DemoQuestState; // optional: older v1 saves retain their progress
};
const classes=new Set<HeroClass>(['berserker','runemage','ranger']);
const runes=new Set<RuneKind>(['flame','frost','thunder','guardian']);
const companions=new Set<CompanionKind>(['guardian','warrior','healer','hunter','mage','warcow']);

const object=(value:unknown):value is Record<string,unknown>=>
  !!value && typeof value==='object' && !Array.isArray(value);
const validInt=(value:unknown,min:number,max:number):value is number=>
  typeof value==='number' && Number.isSafeInteger(value) && value>=min && value<=max;
const isItem=(value:unknown):value is Record<string,unknown>=>object(value)
  && typeof value.id==='string' && value.id.length>=1 && value.id.length<=110
  && V2_GEAR_SLOTS.some(s=>s===value.slot)
  && V2_RARITIES.some(s=>s===value.rarity)
  && validInt(value.level,1,V2_MAX_LEVEL)
  && validInt(value.upgrade,0,V2_MAX_UPGRADE);
const parseItem=(value:unknown):V2Item|null=>{
  if(!isItem(value))return null;
  return makeV2Item(value.id as string,value.slot as V2GearSlot,
    value.rarity as V2Rarity,value.level as number,value.upgrade as number);
};
const unique=(values:readonly string[])=>new Set(values).size===values.length;

function parseProgress(value:unknown):V2Progression|null{
  if(!object(value))return null;
  if(!validInt(value.level,1,V2_MAX_LEVEL)||
     !validInt(value.xp,0,1_000_000_000)||
     value.xp>=nextXp(value.level) && value.level<V2_MAX_LEVEL ||
     !validInt(value.gold,0,1_000_000_000_000)||
     !validInt(value.gems,0,1_000_000_000_000)||
     !validInt(value.redGems,0,1_000_000_000_000)||
     !validInt(value.materials,0,1_000_000_000_000)||
     !validInt(value.wins,0,10_000_000)||
     !validInt(value.bosses,0,10_000_000)||
     value.bosses>value.wins||
     !Array.isArray(value.inventory)||value.inventory.length>V2_ITEM_LIMIT||
     !Array.isArray(value.receipts)||value.receipts.length>20000||
     !object(value.equipped))return null;
  const allItems:V2Item[]=[];
  for(const raw of value.inventory){
    const item=parseItem(raw);
    if(!item)return null;
    allItems.push(item);
  }
  const equipped:Partial<Record<V2GearSlot,V2Item>>={};
  for(const slot of V2_GEAR_SLOTS){
    const entry=value.equipped[slot];
    if(entry===undefined)continue;
    const item=parseItem(entry);
    if(!item||item.slot!==slot)return null;
    equipped[slot]=item;
    allItems.push(item);
  }
  if(Object.keys(value.equipped).some(k=>!V2_GEAR_SLOTS.some(s=>s===k)))return null;
  if(!unique(allItems.map(x=>x.id)))return null;
  const receipts:string[]=[];
  for(const receipt of value.receipts){
    if(typeof receipt!=='string'||!/^v2-demo-encounter-[1-9]\d{0,11}$/.test(receipt))return null;
    receipts.push(receipt);
  }
  if(!unique(receipts))return null;
  if(value.receipts.length>value.wins)return null;
  const defaultProgress=createV2DemoProgress();
  return {
    ...defaultProgress,
    level:value.level,
    xp:value.xp,
    gold:value.gold,
    gems:value.gems,
    redGems:value.redGems,
    materials:value.materials,
    wins:value.wins,
    bosses:value.bosses,
    inventory:allItems.slice(0,value.inventory.length),
    equipped,
    receipts,
    latestLoot:null,
  };
}

export function decodeV2LocalDemoSave(json:string):V2LocalDemoSave|null {
  if(typeof json!=='string'||json.length>V2_LOCAL_SAVE_MAX_LENGTH||json.length<20)return null;
  let raw:unknown;
  try{raw=JSON.parse(json);}catch{return null;}
  if(!object(raw)||raw.version!==V2_LOCAL_DEMO_SAVE_VERSION||
     !validInt(raw.savedAt,0,9999999999999)||
     !validInt(raw.chapter,1,1000)||
     !validInt(raw.highestUnlockedChapter,1,1000)||
     raw.chapter>raw.highestUnlockedChapter||
     !validInt(raw.wave,1,5)||
     !validInt(raw.encounterId,1,20_000_001)||
     !classes.has(raw.heroClass as HeroClass)||
     !runes.has(raw.rune as RuneKind)||
     !companions.has(raw.companion as CompanionKind)||
     (raw.speed!==1&&raw.speed!==2)||
     typeof raw.auto!=='boolean'||
     !validInt(raw.victories,0,10_000_000)||
     !validInt(raw.defeats,0,10_000_000)||
     !Array.isArray(raw.builds)||raw.builds.length!==3)return null;
  const progress=parseProgress(raw.progress);
  if(!progress||progress.wins!==raw.victories)return null;
  const builds:DemoBuildSlot[]=createDemoBuildSlots(3).map((v,i)=>{
    const entry=(raw.builds as unknown[])[i] as unknown;
    if(!object(entry)||entry.slot!==v.slot)return {slot:0,build:null};
    if(entry.build===null)return {slot:v.slot,build:null};
    if(!object(entry.build)||!validDemoBuild(entry.build as unknown as NonNullable<DemoBuildSlot['build']>))
      return {slot:0,build:null};
    const b=entry.build as unknown as NonNullable<DemoBuildSlot['build']>;
    return {slot:v.slot,build:{heroClass:b.heroClass,rune:b.rune,companion:b.companion}};
  });
  if(builds.some(b=>b.slot===0))return null;
  const quests=raw.quests===undefined?undefined:parseV2DemoQuestState(raw.quests);
  if(raw.quests!==undefined&&!quests)return null;
  return {
    version:1,
    savedAt:raw.savedAt as number,
    chapter:raw.chapter as number,
    wave:raw.wave as number,
    highestUnlockedChapter:raw.highestUnlockedChapter as number,
    encounterId:raw.encounterId as number,
    heroClass:raw.heroClass as HeroClass,
    rune:raw.rune as RuneKind,
    companion:raw.companion as CompanionKind,
    speed:raw.speed as 1|2,
    auto:raw.auto as boolean,
    victories:raw.victories as number,
    defeats:raw.defeats as number,
    progress,
    builds,
    ...(quests?{quests}:{}),
  };
}
export function encodeV2LocalDemoSave(save:V2LocalDemoSave):string|null{
  const encoded=JSON.stringify({...save,savedAt:Date.now()});
  return encoded.length<=V2_LOCAL_SAVE_MAX_LENGTH?encoded:null;
}
export function v2DemoStorage():Storage|null{
  try{return typeof window==='undefined'?null:window.localStorage;}
  catch{return null;}
}
export function readV2LocalDemoSave(storage:Pick<Storage,'getItem'>|null):V2LocalDemoSave|null{
  try{return storage?decodeV2LocalDemoSave(storage.getItem(V2_LOCAL_DEMO_SAVE_KEY)??''):null;}
  catch{return null;}
}
export function writeV2LocalDemoSave(
  storage:Pick<Storage,'setItem'>|null,save:V2LocalDemoSave,
):boolean{
  try{
    const encoded=encodeV2LocalDemoSave(save);
    if(!storage||!encoded)return false;
    storage.setItem(V2_LOCAL_DEMO_SAVE_KEY,encoded);
    return true;
  }catch{return false;}
}
export function clearV2LocalDemoSave(storage:Pick<Storage,'removeItem'>|null):boolean{
  try{if(!storage)return false;storage.removeItem(V2_LOCAL_DEMO_SAVE_KEY);return true;}
  catch{return false;}
}
