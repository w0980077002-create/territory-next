/** Standalone TERRITORY 2.0 offline boss roster. No original TERRITORY assets. */
const roster=[
 ['Король великанов','giant_king','Сокрушающий натиск','Разлом земли'],
 ['Северный ярл','northern_jarl','Ледяная ярость','Последний поход'],
 ['Владыка бурь','storm_lord','Грозовой натиск','Гнев небес'],
 ['Король мёртвых','undead_king','Пробуждение костей','Тёмная корона'],
 ['Владыка пламени','fire_lord','Горящий клинок','Огненный вихрь'],
 ['Страж курганов','barrow_guardian','Каменный щит','Древняя печать'],
 ['Тёмный жрец','dark_priest','Чёрный обряд','Поглощение света'],
 ['Вождь изгнанников','bandit_chief','Боевая ярость','Последний приказ'],
 ['Тень хаоса','chaos_shadow','Раскол теней','Предел ночи'],
 ['Демон бездны','abyss_demon','Взгляд бездны','Разрушение мира'],
] as const;
export const V2_BOSSES=roster.map((row,index)=>({
 stageId:(index+1)*10,name:row[0],art:'art/bosses/'+row[1]+'.svg',
 phaseTwo:row[2],phaseThree:row[3],
}));
export function bossForStage(id:number){
 return Number.isSafeInteger(id)&&id>=10&&id<=100&&id%10===0?V2_BOSSES[id/10-1]:null;
}
const mobs=['wolf','goblin','bandit','troll'] as const;
export function artForStage(id:number,kind:'normal'|'elite'|'boss'){
 if(kind==='boss')return bossForStage(id)?.art??'art/enemies/giant.svg';
 if(kind==='elite')return 'art/enemies/giant.svg';
 return 'art/enemies/'+mobs[((Number.isSafeInteger(id)&&id>0?id:1)-1)%mobs.length]+'.svg';
}
export function bossPhaseAt(id:number,health:number,max:number){
 const boss=bossForStage(id);
 if(!boss||!Number.isFinite(health)||!Number.isFinite(max)||max<=0)
  return {phase:0,attackMultiplier:1,label:''};
 const ratio=Math.max(0,Math.min(1,health/max));
 if(ratio<=.25)return {phase:3,attackMultiplier:1.24,label:boss.phaseThree};
 if(ratio<=.58)return {phase:2,attackMultiplier:1.12,label:boss.phaseTwo};
 return {phase:1,attackMultiplier:1,label:'Начало битвы'};
}
