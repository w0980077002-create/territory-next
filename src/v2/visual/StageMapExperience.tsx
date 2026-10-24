import {V2_STAGE_MAP,V2_STAGE_CHAPTERS,V2_STAGES_PER_CHAPTER,
  stageAt,type V2StageCampaign,type V2StageKind} from '../core/gameplayOverhaul';
import './overhaul-ui.css';
const badge:Record<V2StageKind,string>={normal:'◆',elite:'✦',boss:'☠'};
export function StageMapExperience({
  state,onSelect,onFight,
}:{
  state:V2StageCampaign;
  onSelect:(id:number)=>void;onFight:()=>void;
}){
 const active=stageAt(state.currentStage);
 return <section className="v2-overhaul-stage-map" data-screen="stage-map">
   <div className="v2-overhaul-title">
     <div><small>КАРТА ТЕРРИТОРИИ</small><h3>Пять глав · Сто испытаний</h3></div>
     <span>{state.highestUnlockedStage}/{V2_STAGE_MAP.length}</span>
   </div>
   <div className="v2-overhaul-map-progress"><div style={{width:((state.highestUnlockedStage-1)/(V2_STAGE_MAP.length-1)*100)+'%'}}/></div>
   <div className="v2-overhaul-map-info" aria-live="polite">
     <span>Выбрано: <b>{active.chapter}-{active.stage}</b></span>
     <span>{active.kind==='boss'?'☠ Босс':active.kind==='elite'?'✦ Элита':'◆ Обычный бой'}</span>
     <span>Рекорд: <b>{state.highScores[String(active.id)]??0}</b></span>
   </div>
   {Array.from({length:V2_STAGE_CHAPTERS},(_,chapterIndex)=>{
     const chapter=chapterIndex+1;
     const stages=V2_STAGE_MAP.slice(chapterIndex*V2_STAGES_PER_CHAPTER,chapter*V2_STAGES_PER_CHAPTER);
     return <section className="v2-overhaul-chapter" key={chapter}>
       <div className="v2-overhaul-chapter-head">
         <h4>Глава {chapter} <small>Ледяные земли · {chapter}/5</small></h4>
         <span>{stages.filter(s=>state.claimedStages.includes(s.id)).length}/20</span>
       </div>
       <div className="v2-overhaul-stage-grid">
         {stages.map(stage=>{
           const cleared=state.claimedStages.includes(stage.id);
           const available=stage.id<=state.highestUnlockedStage;
           return <button type="button" key={stage.id}
             className={'v2-overhaul-stage v2-overhaul-stage-'+stage.kind+
               (stage.id===state.currentStage?' is-current':'')+
               (cleared?' is-cleared':'')}
             disabled={!available} aria-pressed={stage.id===state.currentStage}
             aria-label={'Глава '+stage.chapter+', этап '+stage.stage+', '+stage.label+
               (available?', доступен':', закрыт')}
             onClick={()=>onSelect(stage.id)}>
             <span>{available?(cleared?'✓':badge[stage.kind]):'🔒'}</span>
             <strong>{stage.stage}</strong>
             {state.highScores[String(stage.id)]!==undefined&&
               <small>{state.highScores[String(stage.id)]}</small>}
           </button>;
         })}
       </div>
     </section>;
   })}
   <div className="v2-overhaul-map-legend"><span>◆ Обычный</span><span>✦ Элита: 5/15</span><span>☠ Босс: 10/20</span></div>
   <button className="v2-overhaul-action" type="button" onClick={onFight}>
     ⚔ Войти: Глава {active.chapter}, этап {active.stage}
   </button>
   <p className="v2-overhaul-note">Прогресс, рекорды и награды доступны только в локальной V2-демоверсии. Не подключено к серверной экономике.</p>
 </section>;
}
