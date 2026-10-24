/**
 * V2-only presentation of existing demo runes and companion roster.
 * No new battle rules, purchases, persistence, or backend data paths.
 * Owner-approved combat HUD and background remain unchanged.
 */
import type {CompanionKind,RuneKind} from '../core/autoBattle';
import {V2_MODULES,scaleFormula} from '../SkillManager';
import {LootbornCompanionsTemplate} from './LootbornTemplates';
import './rune-companion.css';

export type RuneChoice=Readonly<{id:RuneKind;name:string;icon:string;desc:string}>;
export type CompanionChoice=Readonly<{id:CompanionKind;name:string;desc:string}>;

const stanceName={melee:'Ближний бой',ranged:'Дальний бой',buffer:'Поддержка'} as const;
const format=(v:number)=>v.toLocaleString('ru-RU');
const moduleFor=(alias:string)=>V2_MODULES.companions.find(c=>c.selectorAlias===alias);
const mark=(condition:boolean)=>condition?'v2-gallery-active':'';

export function RuneGallery({
  runes,selected,onChoose,onShowSkills,
}:{
  runes:readonly RuneChoice[];selected:RuneKind;
  onChoose:(rune:RuneKind)=>void;onShowSkills:()=>void;
}){
  const current=runes.find(r=>r.id===selected);
  const activeSkill=V2_MODULES.skills.find(skill=>skill.type==='active');
  return <section className="v2-codex" aria-label="Галерея рун" data-screen-template="runes">
    <div className="v2-codex-header">
      <div><small>РУНИЧЕСКИЙ АЛТАРЬ</small><h3>Руны героя</h3></div>
      <span className="v2-codex-label">ДЕМО · 1/1</span>
    </div>
    <p className="v2-codex-intro">Выбери одну руну для следующего боя. Все четыре доступны в демонстрации; реальные улучшения и траты отключены.</p>
    <div className="v2-rune-gallery" role="group" aria-label="Выбор активной руны">
      {runes.map(r=><button key={r.id} type="button"
        className={'v2-rune-gallery-card v2-rune-gallery--'+r.id+' '+mark(selected===r.id)}
        aria-pressed={selected===r.id}
        onClick={()=>onChoose(r.id)}>
        <span className="v2-rune-gallery-art" aria-hidden="true">{r.icon}</span>
        <span className="v2-rune-gallery-name">{r.name}</span>
        <span className="v2-rune-gallery-brief">{r.desc}</span>
        <span className="v2-rune-gallery-status">{selected===r.id?'✓ Установлена':'Выбрать'}</span>
      </button>)}
    </div>
    <div className="v2-codex-detail" aria-live="polite">
      <div className="v2-codex-detail-top">
        <span className={'v2-codex-emblem v2-rune-gallery--'+selected} aria-hidden="true">{current?.icon??'ᚱ'}</span>
        <div><small>АКТИВНАЯ РУНА</small><strong>{current?.name??'Не выбрана'}</strong>
          <span>{current?.desc??'Описание недоступно'}</span></div>
      </div>
      <div className="v2-codex-statlines">
        <div><span>Слот</span><b>Основной</b></div>
        <div><span>Применение</span><b>Автобой V2 · локально</b></div>
        {activeSkill&&<div><span>Умение из каталога</span><b>{activeSkill.name}</b></div>}
      </div>
      <p className="v2-codex-disclaimer">Этот экран показывает текущую руну демобоя. Совместимость с конкретными умениями и стоимость улучшений не подтверждены сервером.</p>
    </div>
    <button className="v2-codex-link" type="button" onClick={onShowSkills}>
      <span aria-hidden="true">ᚱ</span> Книга навыков <span aria-hidden="true">›</span>
    </button>
  </section>;
}

export function CompanionGallery({
  companions,portraits,selected,heroLevel,onChoose,onShowSkills,
}:{
  companions:readonly CompanionChoice[];
  portraits:Readonly<Record<CompanionKind,string>>;
  selected:CompanionKind;heroLevel:number;
  onChoose:(id:CompanionKind)=>void;
  onShowSkills:()=>void;
}){
  const active=companions.find(x=>x.id===selected);
  const module=moduleFor(selected);
  const level=Math.min(V2_MODULES.limits.maxCompanionLevel,Math.max(1,heroLevel));
  const stats=module?{
    hp:module.baseStats.hp+module.perLevel.hp*(level-1),
    attack:module.baseStats.attack+module.perLevel.attack*(level-1),
    defense:module.baseStats.defense+module.perLevel.defense*(level-1),
  }:null;
  const skill=module?V2_MODULES.skills.find(x=>x.id===module.activeSkillId):null;
  return <section className="v2-codex" aria-label="Коллекция спутников" data-screen-template="companions">
    <div className="v2-codex-header">
      <div><small>ДРУЗЬЯ В ПОХОДЕ</small><h3>Коллекция спутников</h3></div>
      <span className="v2-codex-label">1 АКТИВНЫЙ</span>
    </div>
    <p className="v2-codex-intro">Выбери основного спутника. Все шесть иллюстраций уже используются в демонстрации, включая боевую корову.</p>
    <div className="v2-companion-gallery" role="group" aria-label="Выбрать боевого спутника">
      {companions.map(c=><button type="button" key={c.id}
        className={'v2-companion-gallery-card '+mark(selected===c.id)}
        aria-pressed={selected===c.id}
        onClick={()=>onChoose(c.id)}>
        <span className="v2-companion-gallery-portrait"><img src={portraits[c.id]} alt="" loading="lazy"/></span>
        <span className="v2-companion-gallery-info">
          <strong>{c.name}</strong>
          <small>{c.desc}</small>
          <span className="v2-companion-gallery-role">{module?null:null}{moduleFor(c.id)?stanceName[moduleFor(c.id)!.stance]:c.id==='warcow'?'Особый спутник':'Спутник'}</span>
        </span>
        <span className="v2-companion-gallery-status">{selected===c.id?'✓':'+'}</span>
      </button>)}
    </div>
    <div className="v2-codex-detail v2-companion-inspector" aria-live="polite">
      <div className="v2-codex-detail-top">
        <span className="v2-companion-selected-portrait"><img src={portraits[selected]} alt="" loading="lazy"/></span>
        <div><small>В ОТРЯДЕ · ОСНОВНОЙ</small><strong>{active?.name??'Спутник'}</strong>
          <span>{active?.desc??'Поддержка героя'}</span></div>
      </div>
      {module&&stats?<div className="v2-codex-statlines" data-module-companion-id={module.id}>
        <div><span>Боевая роль</span><b>{stanceName[module.stance]}</b></div>
        <div><span>Здоровье / атака / защита</span><b>{format(stats.hp)} / {format(stats.attack)} / {format(stats.defense)}</b></div>
        <div><span>Активное умение</span><b>{skill?.name??'—'}</b></div>
        <div><span>Поведение AI</span><b>{module.ai.patterns.map(x=>stanceName[x.stance]).join(' → ')}</b></div>
        {module.auraModifiers.map((a,i)=><div key={i}><span>{a.stat==='damageDealt'?'Аура атаки':'Аура защиты'}</span>
          <b>×{scaleFormula(a.formula,level,1).toFixed(3)}</b></div>)}
      </div>:<div className="v2-codex-statlines">
        <div><span>Роль</span><b>{selected==='warcow'?'Особый боевой спутник':'Поддержка героя'}</b></div>
        <div><span>Данные</span><b>Из действующего демобоя</b></div>
      </div>}
      <p className="v2-codex-disclaimer">Дополнительные характеристики показываются только для спутников, определённых в V2 JSON-каталоге. Неутверждённые значения не подставляются.</p>
    </div>
    <LootbornCompanionsTemplate selected={selected} level={level}
      getPortrait={id=>portraits[id as CompanionKind]}
      onChoose={alias=>{
        const option=companions.find(c=>c.id===alias);
        if(option)onChoose(option.id);
      }} onShowSkills={onShowSkills}/>
  </section>;
}
