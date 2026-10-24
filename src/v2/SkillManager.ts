/**
 * TERRITORY 2.0 isolated offline, data-driven skill runtime.
 * All content, formulas, triggers and effects originate in JSON, never code.
 * These client-side outcomes are not authoritative for rewards or PvP.
 */
import rawConfig from './modules/lootborn/lootborn-modules.json';

export type Formula=Readonly<{base:number;perLevel:number;perRank:number;min:number;max:number}>;
export type Stat='damageDealt'|'damageTaken';
export type Stance='melee'|'ranged'|'buffer';
export type Modifier=Readonly<{stat:Stat;operation:'multiply';formula:Formula}>;
export type Skill=Readonly<{
 id:string;name:string;type:'active'|'passive'|'aura';bindingCategory:string;
 trigger:Readonly<{phase:'tick'|'spawn';everyTicks:number;energyCost:number}>;
 modifiers:readonly Modifier[];
 effect:Readonly<{kind:'damage'|'heal'|'shield'|'stun';scaleBy:'attack'|'hp';formula:Formula}>|null;
 visual:Readonly<{trigger:string}>;
}>;
export type Companion=Readonly<{
 id:string;name:string;stance:Stance;selectorAlias:string;
 baseStats:Readonly<{hp:number;attack:number;defense:number}>;
 perLevel:Readonly<{hp:number;attack:number;defense:number}>;
 activeSkillId:string;auraModifiers:readonly Modifier[];
 visual:Readonly<{spawn:string;stanceSwitch:string}>;
 ai:Readonly<{switchEveryTicks:number;patterns:readonly Readonly<{
   stance:Stance;attackEveryTicks:number;damageMultiplier:Formula;
 }>[];}>;
}>;
export type ModuleConfig=Readonly<{
 version:1;schema:'territory_v2';limits:Readonly<{
  maxSkillRank:number;maxCompanionLevel:number;
  maxEquippedSkills:number;maxActiveCompanions:1}>;
 skills:readonly Skill[];companions:readonly Companion[];
}>;
export type EquippedSkill=Readonly<{id:string;rank:number}>;
export type Multipliers=Readonly<{damageDealt:number;damageTaken:number}>;
export type SkillAction=Readonly<{
 kind:'damage'|'heal'|'shield'|'stun';amount:number;name:string;visual:string;
}>;
const obj=(x:unknown):x is Record<string,unknown>=>!!x&&typeof x==='object'&&!Array.isArray(x);
function requireRule(cond:unknown,path:string):asserts cond{
 if(!cond)throw new Error('V2_MODULE_INVALID: '+path);
}
const num=(x:unknown,min:number,max:number):x is number=>
 typeof x==='number'&&Number.isFinite(x)&&x>=min&&x<=max;
const int=(x:unknown,min:number,max:number):x is number=>
 Number.isSafeInteger(x)&&num(x,min,max);
const id=(x:unknown):x is string=>
 typeof x==='string'&&/^[a-z][a-z0-9.-]{1,63}$/.test(x);
const shortText=(x:unknown):x is string=>
 typeof x==='string'&&x.length>0&&x.length<=90;
const arr=(x:unknown,max:number):x is unknown[]=>Array.isArray(x)&&x.length<=max;
const skillKinds=new Set(['active','passive','aura']);
const actionKinds=new Set(['damage','heal','shield','stun']);
const stances=new Set(['melee','ranged','buffer']);
const stats=new Set(['damageDealt','damageTaken']);

function validateFormula(raw:unknown,positive=false):void{
 requireRule(obj(raw),'formula');
 requireRule(num(raw.base,-5,5)&&num(raw.perLevel,-1,1)&&
   num(raw.perRank,-1,1)&&num(raw.min,-5,5)&&
   num(raw.max,-5,5)&&raw.min<=raw.max,'formula bounds');
 if(positive)requireRule(raw.min>=0&&raw.max<=3,'nonnegative bounded formula');
}
function validateModifiers(value:unknown):void{
 requireRule(arr(value,8),'modifiers');
 for(const m of value){
  requireRule(obj(m)&&stats.has(m.stat as string)&&m.operation==='multiply','modifier operation/stat');
  validateFormula(m.formula,true);
 }
}
/** Throws for malformed or injected definitions (no remote scripts or eval). */
export function parseV2Modules(value:unknown):ModuleConfig{
 requireRule(obj(value),'root');
 requireRule(value.version===1&&value.schema==='territory_v2','version/schema');
 const limits=value.limits;
 requireRule(obj(limits)&&int(limits.maxSkillRank,1,10)&&
  int(limits.maxCompanionLevel,1,300)&&int(limits.maxEquippedSkills,1,10)&&
  limits.maxActiveCompanions===1,'limits');
 requireRule(arr(value.skills,30)&&arr(value.companions,30),'lists');
 const skillIds=new Set<string>(),aliases=new Set<string>(),companionIds=new Set<string>();
 for(const s of value.skills){
  requireRule(obj(s)&&id(s.id)&&shortText(s.name)&&skillKinds.has(s.type as string)&&
    id(s.bindingCategory),'skill id/type');
  requireRule(!skillIds.has(s.id),'duplicate skill');skillIds.add(s.id);
  requireRule(obj(s.trigger)&&int(s.trigger.energyCost,0,100)&&
    ((s.type==='active'&&s.trigger.phase==='tick'&&int(s.trigger.everyTicks,1,300))||
     (s.type!=='active'&&s.trigger.phase==='spawn'&&s.trigger.everyTicks===0&&s.trigger.energyCost===0)),
    'skill trigger');
  validateModifiers(s.modifiers);
  if(s.effect!==null){
   requireRule(s.type==='active'&&obj(s.effect)&&actionKinds.has(s.effect.kind as string)&&
    (s.effect.scaleBy==='attack'||s.effect.scaleBy==='hp'),'active skill effect');
   validateFormula((s.effect as Record<string,unknown>).formula,true);
  }else requireRule(s.type!=='active','missing active effect');
  requireRule(obj(s.visual)&&id(s.visual.trigger),'visual trigger');
 }
 for(const c of value.companions){
  requireRule(obj(c)&&id(c.id)&&shortText(c.name)&&
   stances.has(c.stance as string)&&id(c.selectorAlias),'companion id/stance');
  requireRule(!companionIds.has(c.id)&&!aliases.has(c.selectorAlias),'duplicate companion selector');
  companionIds.add(c.id);aliases.add(c.selectorAlias);
  for(const field of [c.baseStats,c.perLevel]){
   requireRule(obj(field)&&int(field.hp,0,1000000)&&int(field.attack,0,1000000)&&
    int(field.defense,0,1000000),'companion stat bounds');
  }
  requireRule(id(c.activeSkillId)&&skillIds.has(c.activeSkillId),'linked active skill');
  validateModifiers(c.auraModifiers);
  requireRule(obj(c.visual)&&id(c.visual.spawn)&&id(c.visual.stanceSwitch),'helper visual trigger');
  requireRule(obj(c.ai)&&int(c.ai.switchEveryTicks,0,300)&&
    arr(c.ai.patterns,3)&&c.ai.patterns.length>0,'helper AI patterns');
  const local=new Set<string>();
  for(const p of c.ai.patterns){
   requireRule(obj(p)&&stances.has(p.stance as string)&&int(p.attackEveryTicks,0,300),'stance attack');
   requireRule(!local.has(p.stance as string),'duplicate stance');local.add(p.stance as string);
   validateFormula(p.damageMultiplier,true);
  }
  requireRule(local.has(c.stance as string),'initial stance missing');
  requireRule(c.ai.patterns.length===1||c.ai.switchEveryTicks>0,'switch time required');
 }
 return value as unknown as ModuleConfig;
}
export const V2_MODULES:ModuleConfig=parseV2Modules(rawConfig);
export function scaleFormula(f:Formula,level:number,rank:number):number{
 const l=Number.isSafeInteger(level)?Math.max(1,Math.min(300,level)):1;
 const r=Number.isSafeInteger(rank)?Math.max(0,Math.min(10,rank)):0;
 return Math.max(f.min,Math.min(f.max,f.base+f.perLevel*(l-1)+f.perRank*r));
}
export function getSkill(id:string,config:ModuleConfig=V2_MODULES):Skill|undefined{
 return config.skills.find(s=>s.id===id);
}
export function equipBoundSkills(
 ranks:Readonly<Record<string,number>>,config:ModuleConfig=V2_MODULES
):readonly EquippedSkill[]{
 return config.skills.filter(s=>Number.isSafeInteger(ranks[s.bindingCategory])&&
   ranks[s.bindingCategory]>0).slice(0,config.limits.maxEquippedSkills)
  .map(s=>({id:s.id,rank:Math.min(config.limits.maxSkillRank,ranks[s.bindingCategory])}));
}
export function modifierValues(list:readonly Modifier[],level:number,rank:number):Multipliers{
 const result:{damageDealt:number;damageTaken:number}={damageDealt:1,damageTaken:1};
 for(const m of list)result[m.stat]*=scaleFormula(m.formula,level,rank);
 return {damageDealt:Math.min(3,Math.max(0,result.damageDealt)),
         damageTaken:Math.min(3,Math.max(0,result.damageTaken))};
}
export function skillAuras(
 selected:readonly EquippedSkill[],level:number,config:ModuleConfig=V2_MODULES,
):Multipliers{
 let dealt=1,taken=1;
 for(const slot of selected){
  const s=getSkill(slot.id,config);
  if(!s||s.type==='active')continue;
  const x=modifierValues(s.modifiers,level,slot.rank);
  dealt*=x.damageDealt;taken*=x.damageTaken;
 }
 return {damageDealt:Math.min(3,dealt),damageTaken:Math.min(3,taken)};
}
export function advanceSkills(
 selected:readonly EquippedSkill[],input:Readonly<{
  tick:number;level:number;attack:number;hp:number;mana:number
 }>,config:ModuleConfig=V2_MODULES,
):Readonly<{mana:number;actions:readonly SkillAction[]}>{
 let mana=Math.max(0,Math.min(100,input.mana));
 const actions:SkillAction[]=[];
 for(const slot of selected.slice(0,config.limits.maxEquippedSkills)){
  const s=getSkill(slot.id,config);
  if(!s||s.type!=='active'||!s.effect||
     !Number.isSafeInteger(input.tick)||input.tick<1||
     input.tick%s.trigger.everyTicks!==0||mana<s.trigger.energyCost)continue;
  mana-=s.trigger.energyCost;
  const power=scaleFormula(s.effect.formula,input.level,slot.rank);
  const base=s.effect.scaleBy==='attack'?input.attack:input.hp;
  const amount=Math.max(0,Math.min(100000000,Math.round(Math.max(0,base)*power)));
  actions.push({kind:s.effect.kind,amount,name:s.name,visual:s.visual.trigger});
 }
 return {mana,actions};
}
