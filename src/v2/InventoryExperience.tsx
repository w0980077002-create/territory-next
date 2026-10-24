import { useMemo, useState } from 'react';
import './inventory.css';
import {
  V2_GEAR_SLOTS,V2_RARITIES,V2_RARITY_LABEL,V2_SLOT_LABEL,V2_ITEM_LIMIT,
  sortV2Inventory,itemScore,v2UpgradeQuote,statsFromV2Progress,
  type V2GearSlot,type V2Item,type V2Progression,type V2Rarity,
} from './core/progression';

const asset=(path:string)=>import.meta.env.BASE_URL+path.replace(/^\//,'');
const slots=V2_GEAR_SLOTS;
const heroSlots:readonly V2GearSlot[]=['helmet','amulet','armor','weapon','shield','ring','boots'];
const rarityIndex:Record<V2Rarity,number>={common:0,rare:1,epic:2,legendary:3};
type Filter='all'|V2GearSlot;
type SortOrder='power'|'level'|'rarity';
const format=(n:number)=>n.toLocaleString('ru-RU');
const signed=(n:number)=>n>0?'+'+format(n):format(n);
const score=(item:V2Item|undefined)=>item?itemScore(item):0;

function StatDifference({name,value,percentage=false}:{
  name:string;value:number;percentage?:boolean;
}){
  const text=percentage?signed(Math.round(value*10000)/100)+'%':signed(value);
  return <div className={'v2-gear-stat-delta'+(value>0?' positive':value<0?' negative':' neutral')}>
    <span>{name}</span><strong>{text}</strong>
  </div>;
}

function ComparisonItem({title,item}:{
  title:string;item:V2Item|undefined;
}){
  return <article className={'v2-compare-item'+(item?' v2-rarity-'+item.rarity:' is-empty')}>
    <div className="v2-compare-item-heading">{title}</div>
    {item?<><div className="v2-compare-art">
      <img src={asset('item-'+item.slot+'.webp')} alt=""/>
      <span className="v2-compare-upgrade">+{item.upgrade}</span>
    </div>
      <strong className={'v2-rarity-text-'+item.rarity}>{item.name}</strong>
      <span className="v2-compare-detail">{V2_RARITY_LABEL[item.rarity]} · ур. {item.level}</span>
      <span className="v2-compare-power">⚔ Сила {format(score(item))}</span>
    </>:<><div className="v2-compare-art v2-compare-art-empty">＋</div>
      <strong>Пустой слот</strong>
      <span className="v2-compare-detail">Нет надетого предмета</span>
      <span className="v2-compare-power">Сила 0</span>
    </>}
  </article>;
}

export function EquipmentSlot({
  slot,item,onClick,selected=false,
}:{
  slot:V2GearSlot;item?:V2Item;onClick:()=>void;selected?:boolean;
}){
  const rarity=item?.rarity??'empty';
  return <button type="button"
    title={item?item.name+' +'+item.upgrade:V2_SLOT_LABEL[slot]+' — пусто'}
    aria-label={V2_SLOT_LABEL[slot]+(item?' · '+item.name:' · пусто')}
    aria-pressed={selected}
    className={'v2-gear v2-gear-'+slot+' v2-rarity-'+rarity+(selected?' v2-gear-selected':'')}
    onClick={onClick}
  >
    <img src={asset('item-'+slot+'.webp')} alt="" loading="lazy"/>
    <small>{item?'+'+item.upgrade:'+'}</small>
  </button>;
}

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
}){
  const [filter,setFilter]=useState<Filter>('all');
  const [sortOrder,setSortOrder]=useState<SortOrder>('power');
  const [selectedId,setSelectedId]=useState<string|null>(null);
  const [pendingSalvage,setPendingSalvage]=useState<string|null>(null);
  const [activeSlot,setActiveSlot]=useState<V2GearSlot>(focusSlot);
  const stats=useMemo(()=>statsFromV2Progress(progress),[progress]);
  const selected=progress.inventory.find(x=>x.id===selectedId);
  const shown=useMemo(()=>{
    const filtered=progress.inventory.filter(x=>filter==='all'||x.slot===filter);
    if(sortOrder==='power')return sortV2Inventory(filtered);
    return [...filtered].sort((a,b)=>sortOrder==='level'
      ?b.level-a.level||score(b)-score(a)||a.id.localeCompare(b.id)
      :rarityIndex[b.rarity]-rarityIndex[a.rarity]||score(b)-score(a)||a.id.localeCompare(b.id));
  },[filter,sortOrder,progress.inventory]);
  const equipped=progress.equipped[activeSlot];
  const quote=equipped?v2UpgradeQuote(equipped):null;
  const canUpgrade=!!quote&&progress.gold>=quote.gold&&progress.materials>=quote.materials;
  const canUnequip=progress.inventory.length<V2_ITEM_LIMIT;
  const canEquip=!!selected&&selected.level<=progress.level;
  const compareEquipped=selected?progress.equipped[selected.slot]:undefined;
  const difference=selected?score(selected)-score(compareEquipped):0;
  const salvageReward=selected?(rarityIndex[selected.rarity]+1)*3+selected.upgrade*2:0;
  const selectedIsPending=selected!==undefined&&pendingSalvage===selected.id;
  const showGearDetails=(slot:V2GearSlot)=>{
    setActiveSlot(slot);setSelectedId(null);setPendingSalvage(null);
  };
  const chooseItem=(item:V2Item)=>{
    setSelectedId(item.id);setActiveSlot(item.slot);setPendingSalvage(null);
  };
  return <div className="v2-gear-page" data-screen={view}>
    <div className="v2-hero-tabs" role="group" aria-label="Вкладки персонажа">
      {([
        ['hero','Снаряжение'],['warehouse','Склад'],['skills','Навыки'],
        ['runes','Руны'],['companions','Спутники'],
      ] as const).map(([id,label])=>
        <button type="button" key={id} className={view===id?'selected':''}
          aria-current={view===id?'page':undefined}
          onClick={()=>{setPendingSalvage(null);onView(id);}}>{label}</button>
      )}
    </div>
    <div className="v2-progress-wallet" aria-label="Локальные демо-ресурсы">
      <span>🪙 {format(progress.gold)}</span>
      <span>⚒ {format(progress.materials)} материалов</span>
      <span>🎒 {progress.inventory.length}/{V2_ITEM_LIMIT}</span>
    </div>

    {view==='hero'&&<>
      <div className="v2-inventory-heading">
        <div><small>ЗАЛ СНАРЯЖЕНИЯ</small><h3>Мой герой</h3></div>
        <span className="v2-inventory-level">УРОВЕНЬ {progress.level}</span>
      </div>
      <div className="v2-hero-showcase">
        <div className="v2-hero-portrait-frame">
          <img src={heroArt} alt="Герой в боевом снаряжении" className="v2-hero-preview"/>
          <span>⚔ TERRITORY</span>
        </div>
        <div className="v2-hero-showcase-stats">
          <strong>БОЕВЫЕ ХАРАКТЕРИСТИКИ</strong>
          <div><span>❤️ Здоровье</span><b>{format(stats.hp)}</b></div>
          <div><span>⚔ Атака</span><b>{format(stats.attack)}</b></div>
          <div><span>🛡 Защита</span><b>{format(stats.defense)}</b></div>
          <div><span>✦ Крит</span><b>{Math.round(stats.critChance*10000)/100}%</b></div>
        </div>
      </div>
      <div className="v2-inventory-heading v2-inventory-heading-small">
        <div><small>7 ОСНОВНЫХ ЯЧЕЕК</small><h3>Надетое снаряжение</h3></div>
        <button type="button" className="v2-inventory-shortcut" onClick={()=>onView('warehouse')}>Склад ›</button>
      </div>
      <div className="v2-gear-grid" aria-label="Семь ячеек экипировки">
        {heroSlots.map(slot=><div key={slot} className="v2-gear-showcase-slot">
          <EquipmentSlot slot={slot} item={progress.equipped[slot]}
            selected={activeSlot===slot} onClick={()=>showGearDetails(slot)}/>
          <span>{V2_SLOT_LABEL[slot]}</span>
        </div>)}
      </div>
      <div className="v2-gear-panel" aria-live="polite">
        <strong>Выбрано: {V2_SLOT_LABEL[activeSlot]}</strong>
        {equipped?<><div className={'v2-item-title v2-rarity-text-'+equipped.rarity}>
          {equipped.name} +{equipped.upgrade}
        </div>
          <div className="v2-item-facts">
            <span>Уровень {equipped.level}</span>
            <span>Сила {format(score(equipped))}</span>
            <span>{V2_RARITY_LABEL[equipped.rarity]}</span>
          </div>
          <div className="v2-item-stat-list">
            <span>⚔ +{format(equipped.stats.attack)}</span>
            <span>🛡 +{format(equipped.stats.defense)}</span>
            <span>❤️ +{format(equipped.stats.hp)}</span>
            <span>✦ {Math.round(equipped.stats.critChance*10000)/100}%</span>
          </div>
          <div className="v2-gear-actionbar">
            <button type="button" disabled={!canUpgrade} onClick={()=>onUpgrade(activeSlot)}>
              {quote?'Улучшить · 🪙 '+format(quote.gold)+' / ⚒ '+quote.materials:'Максимальный уровень'}
            </button>
            <button type="button" disabled={!canUnequip} onClick={()=>onUnequip(activeSlot)}>Снять</button>
          </div>
          {quote&&!canUpgrade&&<p className="v2-gear-action-hint">Не хватает ресурсов для улучшения.</p>}
          {!canUnequip&&<p className="v2-gear-action-hint">Склад заполнен, снимать предмет нельзя.</p>}
        </>:<p>Слот свободен. Предмет для этой ячейки можно выбрать на складе.</p>}
        <button className="v2-cta" type="button" onClick={()=>onView('warehouse')}>Открыть склад и сравнить</button>
      </div>
    </>}

    {view==='warehouse'&&<>
      <div className="v2-inventory-heading">
        <div><small>ХРАНИЛИЩЕ ДОБЫЧИ</small><h3>Мой склад</h3></div>
        <span className="v2-inventory-level">{progress.inventory.length}/{V2_ITEM_LIMIT}</span>
      </div>
      <p className="v2-explain">Нажми на находку, чтобы увидеть слева надетый предмет, справа — новый. Здесь нет настоящих покупок.</p>
      <div className="v2-filters" role="group" aria-label="Категория предметов">
        {(['all',...slots] as const).map(f=><button type="button" key={f}
          className={filter===f?'selected':''} aria-pressed={filter===f}
          onClick={()=>{setFilter(f);setSelectedId(null);setPendingSalvage(null);}}>
          {f==='all'?'Все':V2_SLOT_LABEL[f]}
        </button>)}
      </div>
      <div className="v2-warehouse-toolbar">
        <span aria-live="polite">Предметов: <b>{shown.length}</b></span>
        <label>Сортировка
          <select value={sortOrder} onChange={event=>setSortOrder(event.target.value as SortOrder)}>
            <option value="power">По силе</option>
            <option value="level">По уровню</option>
            <option value="rarity">По редкости</option>
          </select>
        </label>
      </div>
      <div className="v2-item-browser" aria-label="Найденные предметы">
        {shown.length?shown.map(item=><button key={item.id} type="button"
          className={'v2-bag-item v2-rarity-'+item.rarity+(selectedId===item.id?' chosen':'')}
          aria-pressed={selectedId===item.id}
          aria-label={item.name+', уровень '+item.level+', '+V2_RARITY_LABEL[item.rarity]}
          onClick={()=>chooseItem(item)}>
          <img src={asset('item-'+item.slot+'.webp')} alt=""/>
          <small>+{item.upgrade}</small>
          <span>{V2_SLOT_LABEL[item.slot]}</span>
        </button>):<div className="v2-warehouse-empty">
          {progress.inventory.length===0
            ?'Склад пуст. Добывай предметы в походах и побеждай боссов.'
            :'В выбранной категории пока нет предметов. Переключи фильтр на «Все».'}
        </div>}
      </div>

      {selected?<section className="v2-compare-panel" aria-live="polite">
        <h3>{V2_SLOT_LABEL[selected.slot]} · сравнение</h3>
        <div className="v2-compare-cols">
          <ComparisonItem title="НАДЕТО" item={compareEquipped}/>
          <ComparisonItem title="НАЙДЕНО" item={selected}/>
        </div>
        <div className={'v2-comparison-score'+(difference>0?' positive':difference<0?' negative':' neutral')}>
          Разница силы <strong>{signed(difference)}</strong>
        </div>
        <div className="v2-comparison-stats" aria-label="Изменения при замене">
          <StatDifference name="⚔ Атака" value={selected.stats.attack-(compareEquipped?.stats.attack??0)}/>
          <StatDifference name="🛡 Защита" value={selected.stats.defense-(compareEquipped?.stats.defense??0)}/>
          <StatDifference name="❤️ Здоровье" value={selected.stats.hp-(compareEquipped?.stats.hp??0)}/>
          <StatDifference name="✦ Крит" value={selected.stats.critChance-(compareEquipped?.stats.critChance??0)} percentage/>
        </div>
        {!canEquip&&<p className="v2-gear-action-hint">Для этого предмета нужен уровень {selected.level}.</p>}
        <div className="v2-gear-actionbar">
          <button type="button" disabled={!canEquip} onClick={()=>{onEquip(selected.id);setSelectedId(null);setPendingSalvage(null);}}>
            {canEquip?'Надеть':'Нужен уровень '+selected.level}
          </button>
          <button type="button" aria-pressed={selectedIsPending}
            className={selectedIsPending?'v2-salvage-confirm':''}
            onClick={()=>{
              if(!selectedIsPending){setPendingSalvage(selected.id);return;}
              onSalvage(selected.id);setSelectedId(null);setPendingSalvage(null);
            }}>{selectedIsPending?'Подтвердить разбор':'Разобрать · ⚒ +'+salvageReward}</button>
        </div>
        {selectedIsPending&&<p className="v2-gear-action-hint" role="status">
          Внимание: предмет исчезнет из демо-склада. Нажми ещё раз для подтверждения.
          <button className="v2-salvage-cancel" type="button" onClick={()=>setPendingSalvage(null)}>Отмена</button>
        </p>}
      </section>:<div className="v2-compare-empty" role="status">
        <strong>Сравнение с экипировкой</strong>
        <p>Выбери предмет на складе — появятся два слота, характеристики и разница силы.</p>
      </div>}
    </>}
    <p className="v2-gear-disclaimer">Демонстрационные предметы и улучшения. Первая TERRITORY, реальные алмазы и инвентарь игроков не затрагиваются.</p>
  </div>;
}
