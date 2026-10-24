/** Pure, deterministic helper/sidekick AI. Exactly one V2 preview companion. */
import {
 V2_MODULES,getSkill,scaleFormula,modifierValues,skillAuras,advanceSkills,
 type ModuleConfig,type Multipliers,type Stance,type SkillAction,
} from './SkillManager';
export type Sidekick=Readonly<{
 id:string;level:number;hp:number;attack:number;defense:number;
 stance:Stance;actions:number;
}>;
export type SidekickStep=Readonly<{
 sidekick:Sidekick;damage:number;actions:readonly SkillAction[];
 visuals:readonly string[];
}>;
export function spawnSidekick(
 aliasOrId:string,level:number,config:ModuleConfig=V2_MODULES,
):Sidekick|null{
 const definition=config.companions.find(c=>c.selectorAlias===aliasOrId||c.id===aliasOrId);
 if(!definition)return null;
 const lvl=Number.isSafeInteger(level)?Math.max(1,Math.min(config.limits.maxCompanionLevel,level)):1;
 const value=(stat:'hp'|'attack'|'defense')=>Math.min(100000000,
  definition.baseStats[stat]+(lvl-1)*definition.perLevel[stat]);
 return {id:definition.id,level:lvl,hp:value('hp'),attack:value('attack'),
  defense:value('defense'),stance:definition.stance,actions:0};
}
export function sidekickAuras(
 sidekick:Sidekick|null,config:ModuleConfig=V2_MODULES,
):Multipliers{
 if(!sidekick)return {damageDealt:1,damageTaken:1};
 const c=config.companions.find(x=>x.id===sidekick.id);
 if(!c)return {damageDealt:1,damageTaken:1};
 const own=modifierValues(c.auraModifiers,sidekick.level,1);
 const linked=getSkill(c.activeSkillId,config);
 const spell=linked&&linked.type!=='active'
  ?skillAuras([{id:linked.id,rank:1}],sidekick.level,config)
  :{damageDealt:1,damageTaken:1};
 return {damageDealt:Math.min(3,own.damageDealt*spell.damageDealt),
  damageTaken:Math.min(3,own.damageTaken*spell.damageTaken)};
}
export function advanceSidekick(
 sidekick:Sidekick,tick:number,mana:number,config:ModuleConfig=V2_MODULES,
):SidekickStep{
 const c=config.companions.find(x=>x.id===sidekick.id);
 if(!c||!Number.isSafeInteger(tick)||tick<1)
   return {sidekick,damage:0,actions:[],visuals:[]};
 const current=Math.max(0,c.ai.patterns.findIndex(p=>p.stance===sidekick.stance));
 const switchNow=c.ai.switchEveryTicks>0&&c.ai.patterns.length>1&&
   tick%c.ai.switchEveryTicks===0;
 const stance=switchNow?
   c.ai.patterns[(current+1)%c.ai.patterns.length].stance:sidekick.stance;
 const mode=c.ai.patterns.find(p=>p.stance===stance);
 let damage=0,actions:readonly SkillAction[]=[];
 const visuals:string[]=switchNow?[c.visual.stanceSwitch]:[];
 if(mode&&mode.attackEveryTicks>0&&tick%mode.attackEveryTicks===0){
  damage=Math.max(0,Math.min(100000000,Math.round(
   sidekick.attack*scaleFormula(mode.damageMultiplier,sidekick.level,1)
  )));
  visuals.push(c.visual.spawn);
 }
 const linked=getSkill(c.activeSkillId,config);
 if(linked&&linked.type==='active'&&mode?.attackEveryTicks){
  const spell=advanceSkills([{id:linked.id,rank:1}],{
   tick,level:sidekick.level,attack:sidekick.attack,hp:sidekick.hp,mana
  },config);
  // Companion skills have a separate preview-only energy pool; the hero
  // always pays only for equipped hero skills.
  actions=spell.actions;visuals.push(...actions.map(a=>a.visual));
 }
 return {sidekick:{...sidekick,stance,actions:sidekick.actions+
    Number(damage>0||actions.length>0)},damage,actions,visuals};
}
