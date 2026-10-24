import { useMemo, useState } from 'react';
import './inventory.css';
import {
  V2_GEAR_SLOTS,V2_RARITY_LABEL,V2_SLOT_LABEL,sortV2Inventory,
  itemScore,v2UpgradeQuote,statsFromV2Progress,
  type V2GearSlot,type V2Item,type V2Progression,type V2Rarity,
} from './core/progression';

const asset=(path:string)=>import.meta.env.BASE_URL+path.replace(/^\//,'');
const slots=V2_GEAR_SLOTS;
const heroSlots:readonly V2GearSlot[]=['helmet','amulet','armor','weapon','shield','ring','boots'];

export function EquipmentSlot({
  slot,item,onClick,
}:{
  slot:V2GearSlot; item?:V2Item; onClick:()=>void;
}) {
  const rarity=item?.rarity??'empty';
  return <button
    type="button"
    title={item?item.name+' +'+item.upgrade:V2_SLOT_LABEL[slot]+' — пусто'}
    aria-label={V2_SLOT_LABEL[slot]}
    className={'v2-gear v2-gear-'+slot+' v2-rarity-'+rarity}
    onClick={onClick}
  >
    <img src={asset('item-'+slot+'.webp')} alt="" loading="lazy"/>
    <small>{item?'+'+item.upgrade:'+'}</small>
  </button>;
}
const allFilters=['all',...slots] as const;
type Filter=typeof allFilters[number];

export function InventoryExperience({
  view,progress,heroArt,focusSlot,onView,onEquip,onUnequip,onSalvage,onUpgrade,
}:{
  view:'hero'|'warehouse';
  progress:V2Progression;
  heroArt:string;
  focusSlot:V2GearSlot;
  onView:(to:'hero'|'warehouse'|'runes'|'companions'|'skills')=>void;
  onEquip:(id:string)=>void;
  onUnequip:(slot:V2GearSlot)=>void;
  onSalvage:(id:string)=>void;
  onUpgrade:(slot:V2GearSlot)=>void;
}) {
  const [filter,setFilter]=useState<Filter>('all');
  const [selectedId,setSelectedId]=useState<string|null>(null);
  const [activeSlot,setActiveSlot]=useState<V2GearSlot>(focusSlot);
  const stats=useMemo(()=>statsFromV2Progress(progress),[progress]);
  const selected=progress.inventory.find(x=>x.id===selectedId)??null;
  const shown=sortV2Inventory(progress.inventory).filter(x=>filter==='all'||x.slot===filter);
  const equipped=progress.equipped[activeSlot];
  const quote=equipped?v2UpgradeQuote(equipped):null;
  const canUpgrade=quote&&progress.gold>=quote.gold&&progress.materials>=quote.materials;
  const canEquip=selected&&selected.level<=progress.level;
  const showGearDetails=(slot:V2GearSlot)=>{
    setActiveSlot(slot);
    setSelectedId(null);
  };
  const chooseItem=(item:V2Item)=>{
    setSelectedId(item.id);
    setActiveSlot(item.slot);
  };
  return <div className="v2-gear-page">
    <div className="v2-hero-tabs">
      {([
        ['hero','Снаряжение'],
        ['warehouse','Склад'],
        ['skills','Навыки'],
        ['runes','Руны'],
        ['companions','Спутники'],
      ] as const).map(([id,label])=>
        <button type="button" key={id} className={view===id?'selected':''} onClick={()=>onView(id)}>{label}</button>
      )}
    </div>
    <div className="v2-progress-wallet">
      <span>🪙 {progress.gold.toLocaleString('ru-RU')}</span>
      <span>⚒ {progress.materials} материалов</span>
      <span>🎒 {progress.inventory.length}/90</span>
    </div>
    {view==='hero'&&<>
      <div className="v2-hero-review">
        <img src={heroArt} alt="Герой" className="v2-hero-preview"/>
        <div>
          <strong>Викинг · Ур. {progress.level}</strong>
          <p>❤️ HP: {stats.hp.toLocaleString('ru-RU')}</p>
          <p>⚔ Атака: {stats.attack.toLocaleString('ru-RU')}</p>
          <p>🛡 Защита: {stats.defense.toLocaleString('ru-RU')}</p>
          <p>✨ Крит: {Math.round(stats.critChance*100)}%</p>
        </div>
      </div>
      <div className="v2-gear-grid">
        {heroSlots.map(slot=><EquipmentSlot key={slot} slot={slot} item={progress.equipped[slot]} onClick={()=>showGearDetails(slot)}/>)}
      </div>
      <div className="v2-gear-panel">
        <strong>Выбрано: {V2_SLOT_LABEL[activeSlot]}</strong>
        {equipped?<>
          <div className={'v2-item-title v2-rarity-text-'+equipped.rarity}>{equipped.name} +{equipped.upgrade}</div>
          <div className="v2-item-facts">
            <span>Уровень {equipped.level}</span>
            <span>Сила {itemScore(equipped)}</span>
            <span>Редкость: {V2_RARITY_LABEL[equipped.rarity]}</span>
          </div>
          <div className="v2-item-stat-list">
            <span>⚔ +{equipped.stats.attack}</span>
            <span>🛡 +{equipped.stats.defense}</span>
            <span>❤️ +{equipped.stats.hp}</span>
          </div>
          <div className="v2-gear-actionbar">
            <button type="button" disabled={!canUpgrade} onClick={()=>onUpgrade(activeSlot)}>
              Улучшить {quote?'🪙 '+quote.gold+' / ⚒ '+quote.materials:'(МАКС)'}
            </button>
            <button type="button" onClick={()=>onUnequip(activeSlot)}>Снять</button>
          </div>
        </>:<p>Этот слот пуст. Выбери подходящий предмет на складе.</p>}
        <button className="v2-cta" type="button" onClick={()=>onView('warehouse')}>Открыть склад и сравнить</button>
      </div>
    </>}
    {view==='warehouse'&&<>
      <p className="v2-explain">Найденные предметы попадают на склад. Нажми на предмет, чтобы сравнить его с надетым, экипировать или разобрать.</p>
      <div className="v2-filters">
        {allFilters.map(f=><button type="button" key={f} className={filter===f?'selected':''} onClick={()=>setFilter(f)}>
          {f==='all'?'Все':V2_SLOT_LABEL[f]}
        </button>)}
      </div>
      <div className="v2-item-browser">
        {shown.length?shown.map(item=><button key={item.id} type="button" className={'v2-bag-item v2-rarity-'+item.rarity+(selectedId===item.id?' chosen':'')} onClick={()=>chooseItem(item)}>
          <img src={asset('item-'+item.slot+'.webp')} alt=""/>
          <small>+{item.upgrade}</small>
          <span>{V2_RARITY_LABEL[item.rarity]}</span>
        </button>):<div className="v2-warehouse-empty">Пока нет предметов. Побеждай врагов и боссов в походе — добыча появится здесь.</div>}
      </div>
      {selected&&<div className="v2-compare-panel">
        <h3>{selected.name}</h3>
        <div className="v2-compare-cols">
          {([
            ['Надето',progress.equipped[selected.slot]],
            ['Найдено',selected],
          ] as [string,V2Item|undefined][]).map(([title,item])=><div key={title}>
            <strong>{title}</strong>
            {item?<><img src={asset('item-'+item.slot+'.webp')} alt=""/><b className={'v2-rarity-text-'+item.rarity}>{item.name}</b>
              <span>Сила {itemScore(item)}</span><span>⚔ {item.stats.attack}</span><span>🛡 {item.stats.defense}</span><span>❤️ {item.stats.hp}</span>
            </>:<span>Пусто</span>}
          </div>)}
        </div>
        <div className="v2-comparison-score">Разница силы: <strong>{itemScore(selected)-itemScore(progress.equipped[selected.slot]??{...selected,stats:{attack:0,defense:0,hp:0,critChance:0}})>=0?'+':''}{itemScore(selected)-itemScore(progress.equipped[selected.slot]??{...selected,stats:{attack:0,defense:0,hp:0,critChance:0}})}</strong></div>
        <div className="v2-gear-actionbar">
          <button type="button" disabled={!canEquip} onClick={()=>{onEquip(selected.id);setSelectedId(null);}}>
            {canEquip?'Надеть':'Нужен уровень '+selected.level}
          </button>
          <button type="button" onClick={()=>{onSalvage(selected.id);setSelectedId(null);}}>Разобрать · ⚒ +{(V2_RARITIES_INDEX[selected.rarity]+1)*3+selected.upgrade*2}</button>
        </div>
      </div>}
    </>}
    <p className="v2-gear-disclaimer">Демонстрационная добыча. Не связана с настоящим инвентарём, алмазами и кошельками игроков TERRITORY.</p>
  </div>;
}
const V2_RARITIES_INDEX:Record<V2Rarity,number>={common:0,rare:1,epic:2,legendary:3};
