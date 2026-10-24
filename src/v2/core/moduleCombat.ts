/**
 * Isolated, deterministic V2 client combat adapter. The old offline combat
 * loop still governs campaign flow; these data-driven additions cannot issue
 * real rewards, spend stones, connect to Telegram or access Supabase.
 */
import {
 startPreviewEncounter as baseStart,nextPreviewTick as baseStep,
 type CombatConfig,type PreviewCombatState,type BattleEffect,
} from './autoBattle';
import {
 V2_MODULES,equipBoundSkills,skillAuras,advanceSkills,
 type EquippedSkill,type SkillAction,
} from '../SkillManager';
import {
 spawnSidekick,sidekickAuras,advanceSidekick,type Sidekick,
} from '../CompanionManager';
export type ModuleRuntime=Readonly<{
 skills:readonly EquippedSkill[];sidekick:Sidekick|null;
 visualTriggers:readonly string[];
}>;
export type ModuleBattleState=PreviewCombatState&Readonly<{modules:ModuleRuntime}>;
const finite=(n:number,max:number)=>Number.isFinite(n)?Math.max(0,Math.min(max,Math.round(n))):0;
export function startPreviewEncounter(config:CombatConfig):ModuleBattleState{
 const sidekick=spawnSidekick(config.companion,config.hero.level);
 const visual=sidekick?V2_MODULES.companions.find(c=>c.id===sidekick.id)?.visual.spawn:[];
 return {...baseStart(config),modules:{
  skills:equipBoundSkills(config.skills??{}),sidekick,
  visualTriggers:typeof visual==='string'?[visual]:[],
 }};
}
function performActions(
 actions:readonly SkillAction[],source:Readonly<{
  heroHp:number;enemyHp:number;shield:number;stun:number;maxHp:number
 }>
):Readonly<{heroHp:number;enemyHp:number;shield:number;stun:number;
 events:readonly BattleEffect[];visuals:readonly string[]}>{
 let {heroHp,enemyHp,shield,stun}=source;
 const events:BattleEffect[]=[],visuals:string[]=[];
 for(const action of actions){
  if(action.kind==='damage'&&enemyHp<=0)continue;
  visuals.push(action.visual);
  if(action.kind==='damage'){
   const amount=Math.min(enemyHp,action.amount);
   enemyHp-=amount;events.push({kind:'attack',target:'enemy',amount,caption:action.name});
  }else if(action.kind==='heal'){
   const amount=Math.max(0,Math.min(source.maxHp-heroHp,action.amount));
   heroHp+=amount;events.push({kind:'heal',target:'hero',amount,caption:action.name});
  }else if(action.kind==='shield'){
   const amount=Math.min(source.maxHp,action.amount);
   shield=Math.min(source.maxHp,shield+amount);
   events.push({kind:'shield',target:'hero',amount,caption:action.name});
  }else if(action.kind==='stun'){
   stun=Math.max(stun,Math.max(1,Math.min(3,action.amount)));
   events.push({kind:'stun',target:'enemy',amount:0,caption:action.name});
  }
 }
 return {heroHp,enemyHp,shield,stun,events,visuals};
}
export function nextPreviewTick(state:ModuleBattleState,random:number):ModuleBattleState{
 if(state.finished)return state;
 const base=baseStep(state,random);
 const hero=state.config.hero;
 const trained=skillAuras(state.modules.skills,hero.level);
 const support=sidekickAuras(state.modules.sidekick);
 const dealt=Math.min(3,trained.damageDealt*support.damageDealt);
 const taken=Math.min(3,trained.damageTaken*support.damageTaken);
 let enemyHp=base.enemyHp,heroHp=base.heroHp;
 const events:BattleEffect[]=base.events.map(event=>{
  if(event.target==='enemy'&&
     (event.kind==='attack'||event.kind==='crit')&&event.amount>0){
   const amount=finite(event.amount*dealt,state.enemyHp);
   enemyHp=Math.max(0,enemyHp-(amount-event.amount));
   return {...event,amount};
  }
  if(event.target==='hero'&&event.kind==='attack'&&event.amount>0){
   const amount=finite(event.amount*taken,100000000);
   heroHp=Math.max(0,Math.min(hero.hp,heroHp+(event.amount-amount)));
   return {...event,amount};
  }
  return event;
 });
 const skills=advanceSkills(state.modules.skills,{
  tick:base.tick,level:hero.level,attack:hero.attack,hp:hero.hp,mana:base.mana,
 });
 let shield=base.heroShield,stun=base.enemyStunnedTicks;
 const first=performActions(skills.actions,{heroHp,enemyHp,shield,stun,maxHp:hero.hp});
 heroHp=first.heroHp;enemyHp=first.enemyHp;shield=first.shield;stun=first.stun;
 events.push(...first.events);
 const visuals=[...first.visuals];
 let sidekick=state.modules.sidekick;
 if(sidekick){
  const helper=advanceSidekick(sidekick,base.tick,skills.mana);
  sidekick=helper.sidekick;visuals.push(...helper.visuals);
  if(enemyHp>0&&helper.damage>0){
   const damage=Math.min(enemyHp,helper.damage);
   enemyHp-=damage;
   events.push({kind:'follower',target:'enemy',amount:damage,
    caption:V2_MODULES.companions.find(c=>c.id===sidekick?.id)?.name??'Спутник'});
  }
  if(helper.actions.length){
   const more=performActions(helper.actions,{heroHp,enemyHp,shield,stun,maxHp:hero.hp});
   heroHp=more.heroHp;enemyHp=more.enemyHp;shield=more.shield;stun=more.stun;
   events.push(...more.events);visuals.push(...more.visuals);
  }
 }
 // Module defense may undo a fatal tick, while a sidekick may finish a fight.
 const finished=enemyHp<=0?'victory':heroHp<=0?'defeat':null;
 const clean=events.filter(e=>e.kind!=='victory'&&e.kind!=='defeat');
 if(finished)clean.push({kind:finished,target:finished==='victory'?'enemy':'hero',
  amount:0,caption:finished==='victory'?'Победа!':'Поражение'});
 return {...base,heroHp:finite(heroHp,hero.hp),enemyHp:finite(enemyHp,state.config.enemy.hp),
  heroShield:finite(shield,hero.hp),enemyStunnedTicks:stun,mana:skills.mana,
  finished,events:clean,
  modules:{skills:state.modules.skills,sidekick,visualTriggers:visuals}};
}
