/**
 * Visual-only TERRITORY 2.0 templates. Data comes from the single, validated
 * lootborn-modules.json catalog. No wallet, backend or combat mutations.
 */
import {V2_MODULES,scaleFormula} from '../SkillManager';
import type {V2SkillCategory} from '../core/buildLoadout';

const typeLabels={active:'АКТИВНЫЙ',passive:'ПАССИВНЫЙ',aura:'АУРА'} as const;
const stanceLabels={melee:'Ближний бой',ranged:'Дальний бой',buffer:'Поддержка'} as const;
const typeIcons={active:'⚔',passive:'🛡',aura:'ᚱ'} as const;

export function LootbornSkillsTemplate({
  heroLevel,levels,onFocus,onShowCompanions,
}:{
  heroLevel:number;
  levels:Readonly<Record<V2SkillCategory,number>>;
  onFocus:(category:V2SkillCategory)=>void;
  onShowCompanions:()=>void;
}) {
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
        return <button type="button" key={skill.id} className="v2-module-card"
          data-skill-id={skill.id} onClick={()=>onFocus(category)}
          aria-label={skill.name+', уровень '+rank+', открыть категорию'}>
          <span className={'v2-module-icon v2-module-icon--'+skill.type} aria-hidden="true">{typeIcons[skill.type]}</span>
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
    <button type="button" className="v2-module-crosslink" onClick={onShowCompanions}>
      <span>🐂</span><span>Открыть спутников</span><span aria-hidden="true">›</span>
    </button>
    <p className="v2-module-footnote">Параметры и эффекты взяты из V2 JSON-каталога. Только демонстрация: реальные покупки и награды отключены.</p>
  </section>;
}

export function LootbornCompanionsTemplate({
  selected,level,onChoose,onShowSkills,
}:{
  selected:string;
  level:number;
  onChoose:(selectorAlias:string)=>void;
  onShowSkills:()=>void;
}) {
  return <section className="v2-module-section" aria-label="Каталог спутников">
    <div className="v2-module-heading">
      <div><small>СОЮЗНИКИ СЕВЕРА</small><h3>Боевые спутники</h3></div>
      <span className="v2-module-tag">1 АКТИВНЫЙ</span>
    </div>
    <div className="v2-module-card-grid">
      {V2_MODULES.companions.map(companion=>{
        const active=selected===companion.selectorAlias;
        const attack=companion.baseStats.attack+companion.perLevel.attack*Math.max(0,level-1);
        return <button key={companion.id} type="button" data-companion-id={companion.id}
          className={'v2-module-card v2-module-companion'+(active?' is-active':'')}
          aria-pressed={active} onClick={()=>onChoose(companion.selectorAlias)}>
          <span className="v2-module-icon v2-module-icon--companion" aria-hidden="true">
            {companion.stance==='buffer'?'ᛟ':'⚔'}
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
