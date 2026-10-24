/**
 * TERRITORY 2.0 — local/offline RPG progression for the playable demo.
 *
 * Pure functions only: NO network, persistent account, Supabase, Telegram
 * authentication, payment, or actual reward actions. Do not run this on the
 * production account. Verified server receipts must replace local receipts
 * before any new-version launch.
 */
export type V2GearSlot = 'weapon' | 'helmet' | 'armor' | 'boots' | 'shield' | 'ring' | 'amulet';
export type V2Rarity = 'common' | 'rare' | 'epic' | 'legendary';
export interface V2ItemStats {
  attack: number;
  defense: number;
  hp: number;
  critChance: number;
}
export interface V2Item {
  readonly id: string;
  readonly slot: V2GearSlot;
  readonly name: string;
  readonly rarity: V2Rarity;
  readonly level: number;
  readonly upgrade: number;
  readonly stats: Readonly<V2ItemStats>;
}
export interface V2LootReceipt {
  readonly id: string;
  readonly chapter: number;
  readonly wave: number;
  readonly xp: number;
  readonly gold: number;
  readonly materials: number;
  readonly item: V2Item | null;
  readonly duplicate: boolean;
}
export interface V2Progression {
  readonly level: number;
  readonly xp: number;
  readonly gold: number;
  readonly gems: number;
  readonly redGems: number;
  readonly materials: number;
  readonly inventory: readonly V2Item[];
  readonly equipped: Readonly<Partial<Record<V2GearSlot, V2Item>>>;
  readonly wins: number;
  readonly bosses: number;
  readonly receipts: readonly string[];
  readonly latestLoot: V2LootReceipt | null;
}
export interface V2HeroStats {
  hp: number;
  attack: number;
  defense: number;
  critChance: number;
  dodgeChance: number;
}
export const V2_ITEM_LIMIT = 90;
export const V2_MAX_LEVEL = 300;
export const V2_MAX_UPGRADE = 25;
export const V2_GEAR_SLOTS = ['weapon','helmet','armor','boots','shield','ring','amulet'] as const satisfies readonly V2GearSlot[];
export const V2_RARITIES = ['common','rare','epic','legendary'] as const satisfies readonly V2Rarity[];
export const V2_RARITY_LABEL: Readonly<Record<V2Rarity,string>> = {
  common: 'Обычный', rare: 'Редкий', epic: 'Эпический', legendary: 'Легендарный',
};
export const V2_SLOT_LABEL: Readonly<Record<V2GearSlot,string>> = {
  weapon:'Оружие',helmet:'Шлем',armor:'Броня',boots:'Обувь',
  shield:'Щит',ring:'Кольцо',amulet:'Амулет',
};
const slotRoots: Record<V2GearSlot,string> = {
  weapon:'Клинок',helmet:'Шлем',armor:'Доспех',boots:'Сапоги',
  shield:'Щит',ring:'Кольцо',amulet:'Амулет',
};
const raritySuffix: Record<V2Rarity,string> = {
  common:'странника',rare:'севера',epic:'бури',legendary:'Одина',
};
function clamp(n:number,min:number,max:number):number {
  return Number.isFinite(n)?Math.max(min,Math.min(max,n)):min;
}
function int(n:number,min:number,max:number):number {return Math.floor(clamp(n,min,max));}
function strength(rarity:V2Rarity):number {
  return [1,1.35,1.85,2.6][V2_RARITIES.indexOf(rarity)] ?? 1;
}
export function nextXp(level:number):number {
  const lv=int(level,1,V2_MAX_LEVEL);
  return 55+lv*24+lv*lv*5;
}
export function makeV2Item(
  id: string, slot: V2GearSlot, rarity: V2Rarity, level:number, upgrade=0,
):V2Item {
  const lv=int(level,1,V2_MAX_LEVEL);
  const plus=int(upgrade,0,V2_MAX_UPGRADE);
  const power=(5+lv*2.5)*strength(rarity)*(1+plus*.12);
  const attackWeight:Record<V2GearSlot,number>={
    weapon:2.4,helmet:0,armor:0,boots:.25,shield:0,ring:.8,amulet:.65,
  };
  const defenseWeight:Record<V2GearSlot,number>={
    weapon:0,helmet:.9,armor:1.25,boots:.6,shield:1.65,ring:0,amulet:.15,
  };
  const hpWeight:Record<V2GearSlot,number>={
    weapon:0,helmet:5,armor:7,boots:2.7,shield:3,ring:1,amulet:3.1,
  };
  const critWeight:Record<V2GearSlot,number>={
    weapon:.00045,helmet:0,armor:0,boots:0,shield:0,ring:.0007,amulet:.00065,
  };
  return {
    id,slot,rarity,level:lv,upgrade:plus,
    name:slotRoots[slot]+' '+raritySuffix[rarity],
    stats:{
      attack:Math.round(power*attackWeight[slot]),
      defense:Math.round(power*defenseWeight[slot]),
      hp:Math.round(power*hpWeight[slot]),
      critChance:Math.round(power*critWeight[slot]*100000)/100000,
    },
  };
}
export function createV2DemoProgress():V2Progression {
  const equipped:Partial<Record<V2GearSlot,V2Item>>={};
  V2_GEAR_SLOTS.forEach((slot,index)=>{
    equipped[slot]=makeV2Item('starter-'+slot,slot,index===0?'rare':'common',9);
  });
  return {
    level:12,xp:0,gold:15000,gems:320,redGems:50,materials:25,
    inventory:[],equipped,wins:0,bosses:0,receipts:[],latestLoot:null,
  };
}
export function statsFromV2Progress(progress:V2Progression):V2HeroStats {
  const items=Object.values(progress.equipped).filter((x):x is V2Item=>!!x);
  const totals=items.reduce((acc,item)=>({
    attack:acc.attack+item.stats.attack,
    defense:acc.defense+item.stats.defense,
    hp:acc.hp+item.stats.hp,
    critChance:acc.critChance+item.stats.critChance,
  }),{attack:0,defense:0,hp:0,critChance:0});
  const lvl=int(progress.level,1,V2_MAX_LEVEL);
  return {
    hp:500+lvl*55+totals.hp,
    attack:36+lvl*9+totals.attack,
    defense:10+lvl*4+totals.defense,
    critChance:clamp(.12+totals.critChance,0,.65),
    dodgeChance:.06,
  };
}
export function applyV2Xp(progress:V2Progression,amount:number):Pick<V2Progression,'level'|'xp'> {
  let level=int(progress.level,1,V2_MAX_LEVEL);
  let xp=int(progress.xp,0,1e9)+int(amount,0,10000000);
  while(level<V2_MAX_LEVEL&&xp>=nextXp(level)){
    xp-=nextXp(level);
    level++;
  }
  if(level===V2_MAX_LEVEL)xp=0;
  return {level,xp};
}
/**
 * A demo win is represented by a unique, local receipt id. Granting it
 * twice is strictly idempotent, including under React StrictMode.
 *
 * No item drop for defeat; no spend of battle stones in regular campaign.
 */
export function applyV2DemoVictory(
  progress:V2Progression,
  receiptId:string,
  chapter:number,
  wave:number,
  roll:number,
):V2Progression {
  if(!receiptId||receiptId.length>100||progress.receipts.includes(receiptId))return progress;
  const ch=int(chapter,1,1000),w=int(wave,1,5);
  const boss=w===5;
  const xp=Math.round((42+ch*14)*(boss?3:1));
  const gold=Math.round((50+ch*27)*(boss?4:1));
  const material=boss?6:roll<.3?1:0;
  const safeRoll=clamp(roll,0,.999999);
  const drop=boss||safeRoll<.38;
  let item:V2Item|null=null;
  const level=Math.min(V2_MAX_LEVEL,Math.max(1,progress.level));
  if(drop){
    const rarity:V2Rarity=
      boss&&safeRoll>.985?'legendary':
      (boss&&safeRoll>.63)||safeRoll>.94?'epic':
      (boss||safeRoll>.68)?'rare':'common';
    const index=Math.min(6,Math.floor(safeRoll*7));
    item=makeV2Item('loot-'+receiptId,V2_GEAR_SLOTS[index],rarity,Math.max(1,level-2));
  }
  const capHit=progress.inventory.length>=V2_ITEM_LIMIT;
  const finalItem=capHit?null:item;
  const autoconvert=capHit&&item?Math.max(2,(V2_RARITIES.indexOf(item.rarity)+1)*4):0;
  const exp=applyV2Xp(progress,xp);
  const receipt:V2LootReceipt={
    id:receiptId,chapter:ch,wave:w,xp,gold,materials:material+autoconvert,
    item:finalItem,duplicate:false,
  };
  return {
    ...progress,
    ...exp,
    wins:progress.wins+1,
    bosses:progress.bosses+(boss?1:0),
    gold:progress.gold+gold,
    materials:progress.materials+material+autoconvert,
    inventory:finalItem?[...progress.inventory,finalItem]:progress.inventory,
    receipts:[...progress.receipts,receiptId], // no trimming: idempotence for this session
    latestLoot:receipt,
  };
}
export function equipV2Item(progress:V2Progression,id:string):V2Progression {
  const selected=progress.inventory.find(x=>x.id===id);
  if(!selected||selected.level>progress.level)return progress;
  const old=progress.equipped[selected.slot];
  const rest=progress.inventory.filter(x=>x.id!==id);
  return {
    ...progress,
    inventory:old?[...rest,old]:rest,
    equipped:{...progress.equipped,[selected.slot]:selected},
  };
}
export function unequipV2Item(progress:V2Progression,slot:V2GearSlot):V2Progression {
  const item=progress.equipped[slot];
  if(!item||progress.inventory.length>=V2_ITEM_LIMIT)return progress;
  const equipped={...progress.equipped};
  delete equipped[slot];
  return {...progress,equipped,inventory:[...progress.inventory,item]};
}
export function salvageV2Item(progress:V2Progression,id:string):V2Progression {
  const item=progress.inventory.find(x=>x.id===id);
  if(!item)return progress;
  const materials=(V2_RARITIES.indexOf(item.rarity)+1)*3+item.upgrade*2;
  return {
    ...progress,
    inventory:progress.inventory.filter(x=>x.id!==id),
    materials:progress.materials+materials,
  };
}
export function v2UpgradeQuote(item:V2Item):{gold:number;materials:number}|null {
  if(item.upgrade>=V2_MAX_UPGRADE)return null;
  return {
    gold:120+item.level*22+item.upgrade*item.upgrade*65,
    materials:3+item.upgrade*2+V2_RARITIES.indexOf(item.rarity),
  };
}
export function upgradeV2Equipped(progress:V2Progression,slot:V2GearSlot):V2Progression {
  const item=progress.equipped[slot];
  if(!item)return progress;
  const quote=v2UpgradeQuote(item);
  if(!quote||progress.gold<quote.gold||progress.materials<quote.materials)return progress;
  const equipped={...progress.equipped,[slot]:makeV2Item(item.id,item.slot,item.rarity,item.level,item.upgrade+1)};
  return {...progress,equipped,gold:progress.gold-quote.gold,materials:progress.materials-quote.materials};
}
export function itemScore(item:V2Item):number {
  return Math.round(item.stats.attack*2+item.stats.defense*1.4+item.stats.hp*.16+item.stats.critChance*1000);
}
export function sortV2Inventory(items:readonly V2Item[]):V2Item[] {
  return [...items].sort((a,b)=>itemScore(b)-itemScore(a)||a.id.localeCompare(b.id));
}
