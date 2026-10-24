/** Offline-only V2 skill training: test rules, never authoritative rewards. */
import type {V2SkillCategory} from './buildLoadout';
export const V2_DEMO_SKILL_IDS=['basic','core','control','ultimate','passive'] as const satisfies readonly V2SkillCategory[];
export type V2DemoSkillState=Readonly<{version:1;levels:Readonly<Record<V2SkillCategory,number>>}>;
export const V2_SKILL_TRAINING={
 basic:{name:'Стальной удар',icon:'⚔️',description:'+4% к обычной атаке за уровень'},
 core:{name:'Мастерство рун',icon:'ᚱ',description:'+10% к классовому навыку за уровень'},
 control:{name:'Ледяной захват',icon:'❄️',description:'Прерывает удар врага каждые 8 тактов'},
 ultimate:{name:'Ярость Севера',icon:'🔥',description:'Раз в 10 тактов: +20% к атаке за уровень за 35 энергии'},
 passive:{name:'Крепость щита',icon:'🛡️',description:'-3% к входящему урону за уровень'}
} as const;
const ids=new Set<string>(V2_DEMO_SKILL_IDS);
export function createV2DemoSkillState():V2DemoSkillState{
 return {version:1,levels:{basic:0,core:0,control:0,ultimate:0,passive:0}};
}
export function v2DemoSkillBudget(level:number):number{
 return Number.isSafeInteger(level)&&level>=1&&level<=300?Math.min(25,1+Math.floor((level-1)/2)):0;
}
export function spentV2DemoSkills(state:V2DemoSkillState):number{
 return V2_DEMO_SKILL_IDS.reduce((n,id)=>n+state.levels[id],0);
}
export function availableV2DemoSkills(state:V2DemoSkillState,level:number):number{
 return Math.max(0,v2DemoSkillBudget(level)-spentV2DemoSkills(state));
}
export function learnV2DemoSkill(state:V2DemoSkillState,id:V2SkillCategory,level:number):V2DemoSkillState{
 if(!ids.has(id)||!Number.isSafeInteger(state.levels[id])||state.levels[id]<0||state.levels[id]>=5||
    availableV2DemoSkills(state,level)===0)return state;
 return {...state,levels:{...state.levels,[id]:state.levels[id]+1}};
}
export function parseV2DemoSkillState(raw:unknown,level:number):V2DemoSkillState|null{
 if(!raw||typeof raw!=='object'||Array.isArray(raw))return null;
 const r=raw as Record<string,unknown>,x=r.levels;
 if(r.version!==1||!x||typeof x!=='object'||Array.isArray(x))return null;
 const levels=x as Record<string,unknown>;
 if(Object.keys(levels).length!==5||Object.keys(levels).some(k=>!ids.has(k))||
   !V2_DEMO_SKILL_IDS.every(k=>typeof levels[k]==='number'&&Number.isSafeInteger(levels[k])&&
     (levels[k] as number)>=0&&(levels[k] as number)<=5))return null;
 const parsed={version:1 as const,levels:{
  basic:levels.basic as number,core:levels.core as number,
  control:levels.control as number,ultimate:levels.ultimate as number,passive:levels.passive as number
 }};
 return spentV2DemoSkills(parsed)<=v2DemoSkillBudget(level)?parsed:null;
}
