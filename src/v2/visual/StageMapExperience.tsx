import {useEffect,useState} from 'react';
import {V2_STAGE_MAP,V2_STAGE_CHAPTERS,V2_STAGES_PER_CHAPTER,
  stageAt,type V2StageCampaign,type V2StageKind} from '../core/gameplayOverhaul';
import './overhaul-ui.css';
import './inner-panels.css';
const asset=(name:string)=>import.meta.env.BASE_URL+name;
const badge:Record<V2StageKind,string>={normal:'◆',elite:'✦',boss:'☠'};
const chapterNames=['Северная застава','Ледяные перевалы','Рунический лес','Крепость бурь','Трон ярла'] as const;
const chapterArt=['map-forest.webp','map-mountain.webp','map-herbs.webp','map-chamber.webp','map-rare.webp'] as const;
export function StageMapExperience({
  state,onSelect,onFight,
}:{
  state:V2StageCampaign;
  onSelect:(id:number)=>void;onFight:()=>void;
}){
 const active=stageAt(state.currentStage);
 const [viewingChapter,setViewingChapter]=useState(active.chapter);
 useEffect(()=>setViewingChapter(active.chapter),[active.chapter]);
 const stages=V2_STAGE_MAP.slice((viewingChapter-1)*V2_STAGES_PER_CHAPTER,viewingChapter*V2_STAGES_PER_CHAPTER);
 const chapterCleared=stages.filter(s=>state.claimedStages.includes(s.id)).length;
 return <section className="v2-overhaul-stage-map v2-route-map" data-screen="stage-map">
   <div className="v2-overhaul-title">
     <div><small>ЛЕТОПИСЬ ПОХОДА</small><h3>Приключение · 100 этапов</h3></div>
     <span>{state.claimedStages.length}/{V2_STAGE_MAP.length}</span>
   </div>
   <div className="v2-overhaul-map-progress" role="progressbar" aria-label="Пройдено этапов"
     aria-valuenow={state.claimedStages.length} aria-valuemin={0} aria-valuemax={100}>
     <div style={{width:(state.claimedStages.length/100*100)+'%'}}/>
   </div>
   <div className="v2-route-chapter-tabs" role="tablist" aria-label="Выбор главы">
     {Array.from({length:V2_STAGE_CHAPTERS},(_,chapterIndex)=>{
       const chapter=chapterIndex+1;
       const unlocked=(chapter-1)*V2_STAGES_PER_CHAPTER+1<=state.highestUnlockedStage;
       return <button type="button" key={chapter} role="tab"
         aria-selected={viewingChapter===chapter} aria-controls="v2-stage-chapter-content"
         className={viewingChapter===chapter?'is-selected':''}
         onClick={()=>setViewingChapter(chapter)}>
         <span>{unlocked?'ᚱ':'◇'}</span><strong>{chapter}</strong><small>{unlocked?'Глава':'Закрыта'}</small>
       </button>;
     })}
   </div>
   <div id="v2-stage-chapter-content" role="tabpanel" aria-label={'Глава '+viewingChapter}>
     <div className="v2-route-banner">
       <img src={asset(chapterArt[viewingChapter-1])} alt="" loading="lazy"/>
       <div className="v2-route-banner-shade"/>
       <div className="v2-route-banner-copy">
         <small>ГЛАВА {viewingChapter} / {V2_STAGE_CHAPTERS}</small>
         <h4>{chapterNames[viewingChapter-1]}</h4>
         <p>{chapterCleared}/20 пройдено · {stages.some(s=>s.id<=state.highestUnlockedStage)?'Путь открыт':'Требуется предыдущая глава'}</p>
       </div>
     </div>
     <div className="v2-route-trail" aria-label="Маршрут из двадцати этапов">
       {stages.map(stage=>{
         const cleared=state.claimedStages.includes(stage.id);
         const available=stage.id<=state.highestUnlockedStage;
         const current=stage.id===state.currentStage;
         return <button type="button" key={stage.id}
           className={'v2-overhaul-stage v2-overhaul-stage-'+stage.kind+
             (current?' is-current':'')+(cleared?' is-cleared':'')}
           disabled={!available} aria-pressed={current}
           aria-label={'Глава '+stage.chapter+', этап '+stage.stage+', '+stage.label+
             (available?', доступен':', закрыт')}
           onClick={()=>onSelect(stage.id)}>
           <span>{available?(cleared?'✓':badge[stage.kind]):'◇'}</span>
           <strong>{stage.stage}</strong>
           {state.highScores[String(stage.id)]!==undefined&&
             <small>{state.highScores[String(stage.id)]}</small>}
         </button>;
       })}
     </div>
   </div>
   <div className="v2-route-current" aria-live="polite">
     <div className={'v2-route-current-emblem v2-route-current-'+active.kind}>{badge[active.kind]}</div>
     <div className="v2-route-current-data">
       <small>ВЫБРАННЫЙ ЭТАП</small>
       <strong>{active.chapter}-{active.stage} · {active.label}</strong>
       <span>Рекорд: {state.highScores[String(active.id)]??'—'} · Добыча ×{active.lootMultiplier.toLocaleString('ru-RU')}</span>
     </div>
   </div>
   <div className="v2-overhaul-map-legend"><span>◆ Обычный</span><span>✦ Элита: 5/15</span><span>☠ Босс: 10/20</span></div>
   <button className="v2-overhaul-action" type="button" onClick={onFight}>
     ⚔ В бой · Глава {active.chapter}, этап {active.stage}
   </button>
   <p className="v2-overhaul-note">Открытие этапов, рекорды и добыча действуют только в изолированной демоверсии. Закрытые этапы недоступны.</p>
 </section>;
}
