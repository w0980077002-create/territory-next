/**
 * Visual-only TERRITORY 2.0 templates. Data comes from the single, validated
 * lootborn-modules.json catalog. No wallet, backend or combat mutations.
 */
import { useState } from 'react';
import {V2_MODULES,scaleFormula} from '../SkillManager';
import type {V2SkillCategory} from '../core/buildLoadout';

const typeLabels={active:'АКТИВНЫЙ',passive:'ПАССИВНЫЙ',aura:'АУРА'} as const;
const stanceLabels={melee:'Ближний бой',ranged:'Дальний бой',buffer:'Поддержка'} as const;
const typeIcons={active:'fight',passive:'shield',aura:'runes'} as const;
const asset=(path:string)=>import.meta.env.BASE_URL+path;

export function LootbornSkillsTemplate({
  heroLevel,levels,onFocus,onShowCompanions,
}:{
  heroLevel:number;
  levels:Readonly<Record<V2SkillCategory,number>>;
  onFocus:(category:V2SkillCategory)=>void;
  onShowCompanions:()=>void;
}) {
  const [inspectedId,setInspectedId]=useState<string|null>(null);
  const inspected=V2_MODULES.skills.find(s=>s.id===inspectedId);
  const selectedRank=inspected?levels[inspected.bindingCategory as V2SkillCategory]??0:0;
  return <section className="v2-module-section" aria-label="Модульные навыки из каталога">
    <div className="v2-module-heading">
      <div><small>КНИГА МАСТЕРСТВА</small><h3>Навыки и руны</h3></div>
      <span className="v2-module-tag">TERRITORY 2.0</span>
    </div>
    <div className="v2-module-card-grid">
      {V2_MODULES.skills.map(skill=>{
        const category=skill.bindingCategory as V2SkillCategory;
        const rank=levels[category]??0;
        const magnitude=skill.effect
          ?scaleFormula(skill.effect.formula,heroLevel,rank)
          :skill.modifiers.length?scaleFormula(skill.modifiers[0].formula,heroLevel,rank):0;
        const detail=skill.effect
          ?'Сила эффекта ×'+magnitude.toFixed(2)
          :skill.modifiers.length?(magnitude*100).toFixed(1)+'% к '+(
            skill.modifiers[0].stat==='damageTaken'?'входящему урону':'исходящему урону')
          :'Модульный эффект';
        return <button type="button" key={skill.id} className={'v2-module-card'+(inspectedId===skill.id?' is-active':'')}
          data-skill-id={skill.id} onClick={()=>{onFocus(category);setInspectedId(current=>current===skill.id?null:skill.id);}}
          aria-expanded={inspectedId===skill.id}
          aria-controls="v2-skill-inspector"
          aria-label={skill.name+', уровень '+rank+', показать параметры'}>
          <span className={'v2-module-icon v2-module-icon--'+skill.type} aria-hidden="true"><img src={asset('art/icons/'+typeIcons[skill.type]+'.svg')} alt=""/></span>
          <span className="v2-module-card-text">
            <span className="v2-module-title">{skill.name}</span>
            <span className="v2-module-subtitle">{typeLabels[skill.type]} · уровень {rank}/{V2_MODULES.limits.maxSkillRank}</span>
            <span className="v2-module-effect">{detail}</span>
            <span className="v2-module-placeholder">Эффект: {skill.visual.trigger}</span>
          </span>
          <span className="v2-module-chevron" aria-hidden="true">›</span>
        </button>;
      })}
    </div>
    {inspected&&<aside id="v2-skill-inspector" className="v2-module-inspector" aria-label={'Параметры навыка '+inspected.name}>
      <div className="v2-module-inspector-header"><strong>{inspected.name}</strong><span>Ур. {selectedRank}/{V2_MODULES.limits.maxSkillRank}</span></div>
      <dl className="v2-module-inspector-grid">
        <div><dt>Тип</dt><dd>{typeLabels[inspected.type]}</dd></div>
        <div><dt>Срабатывание</dt><dd>{inspected.trigger.phase==='spawn'?'Постоянный эффект':'Раз в '+inspected.trigger.everyTicks+' тиков'}</dd></div>
        <div><dt>Энергия</dt><dd>{inspected.trigger.energyCost||'Не требуется'}</dd></div>
        <div><dt>Визуальный триггер</dt><dd>{inspected.visual.trigger}</dd></div>
        {inspected.effect&&<div><dt>Расчёт эффекта</dt><dd>{inspected.effect.kind==='damage'?'Урон':inspected.effect.kind==='heal'?'Лечение':inspected.effect.kind==='shield'?'Защита':'Контроль'} ×{scaleFormula(inspected.effect.formula,heroLevel,selectedRank).toFixed(2)}</dd></div>}
        {inspected.modifiers.map((modifier,i)=><div key={i}><dt>{modifier.stat==='damageTaken'?'Получаемый урон':'Исходящий урон'}</dt><dd>×{scaleFormula(modifier.formula,heroLevel,selectedRank).toFixed(3)}</dd></div>)}
      </dl>
      <button type="button" className="v2-module-inspector-close" onClick={()=>setInspectedId(null)}>Свернуть параметры</button>
    </aside>}
    <button type="button" className="v2-module-crosslink" onClick={onShowCompanions}>
      <span>🐂</span><span>Открыть спутников</span><span aria-hidden="true">›</span>
    </button>
    <p className="v2-module-footnote">Параметры и эффекты взяты из V2 JSON-каталога. Только демонстрация: реальные покупки и награды отключены.</p>
  </section>;
}

export function LootbornCompanionsTemplate({
  selected,level,onChoose,onShowSkills,getPortrait,
}:{
  selected:string;
  level:number;
  onChoose:(selectorAlias:string)=>void;
  onShowSkills:()=>void;
  getPortrait:(selectorAlias:string)=>string|undefined;
}) {
  return <section className="v2-module-section" aria-label="Каталог спутников">
    <div className="v2-module-heading">
      <div><small>СОЮЗНИКИ СЕВЕРА</small><h3>Боевые спутники</h3></div>
      <span className="v2-module-tag">1 АКТИВНЫЙ</span>
    </div>
    <div className="v2-module-card-grid">
      {V2_MODULES.companions.map(companion=>{
        const active=selected===companion.selectorAlias;
        const lvl=Math.max(1,Math.min(V2_MODULES.limits.maxCompanionLevel,level));
        const attack=companion.baseStats.attack+companion.perLevel.attack*(lvl-1);
        const image=getPortrait(companion.selectorAlias);
        return <button key={companion.id} type="button" data-companion-id={companion.id}
          className={'v2-module-card v2-module-companion'+(active?' is-active':'')}
          aria-pressed={active} onClick={()=>onChoose(companion.selectorAlias)}>
          <span className="v2-module-icon v2-module-icon--companion" aria-hidden="true">
            {image?<img src={image} alt="" loading="lazy"/>:companion.stance==='buffer'?'ᛟ':'⚔'}
          </span>
          <span className="v2-module-card-text">
            <span className="v2-module-title">{companion.name}</span>
            <span className="v2-module-subtitle">{stanceLabels[companion.stance]} · Атака {attack}</span>
            <span className="v2-module-effect">{companion.ai.patterns.map(x=>stanceLabels[x.stance]).join(' / ')}</span>
            <span className="v2-module-placeholder">Умение: {V2_MODULES.skills.find(s=>s.id===companion.activeSkillId)?.name}</span>
          </span>
          <span className="v2-module-selected">{active?'✓':'Выбрать'}</span>
        </button>;
      })}
    </div>
    <button className="v2-module-crosslink" type="button" onClick={onShowSkills}>
      <span>ᚱ</span><span>Навыки героя</span><span aria-hidden="true">›</span>
    </button>
    <p className="v2-module-footnote">Положение, стойки и эффекты — из единого конфигурационного файла. Выбор влияет только на демонстрационный бой.</p>
  </section>;
}
