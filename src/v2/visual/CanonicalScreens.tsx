import {useMemo,useState} from 'react';
import type {V2SkillCategory} from '../core/buildLoadout';
import {availableV2DemoSkills,type V2DemoSkillState} from '../core/demoSkills';
import type {V2Progression} from '../core/progression';
import './canonical-screens.css';

const asset=(path:string)=>import.meta.env.BASE_URL+path;
const skillRows:readonly {id:V2SkillCategory;label:string;sign:string;icons:readonly string[];palette:readonly string[]}[]=[
 {id:'basic',label:'База',sign:'ᚹ',icons:['✊','⚔','➶'],palette:['gold','blue','green']},
 {id:'core',label:'Ядро',sign:'ᛟ',icons:['⟳','ϟ','❖'],palette:['gold','green','bronze']},
 {id:'control',label:'Контроль',sign:'ᛉ',icons:['☄','✧','⚡'],palette:['fire','violet','gold']},
 {id:'ultimate',label:'Пробуждение',sign:'ᛞ',icons:['✺','♨','❄'],palette:['bronze','fire','ice']},
 {id:'passive',label:'Финал',sign:'ᛝ',icons:['≈','♜','✹'],palette:['green','violet','gold']},
];
const initialChoices=[0,2,0,2,2] as const;

/** Screenshot-aligned selector. Variants are VISUAL ONLY until individually specified. */
export function V2ReferenceSkills({
 state,heroLevel,onTrain,onShowRunes,
}:{
 state:V2DemoSkillState;heroLevel:number;
 onTrain:(id:V2SkillCategory)=>void;onShowRunes:()=>void;
}){
 const [choices,setChoices]=useState<readonly number[]>(initialChoices);
 const [details,setDetails]=useState<V2SkillCategory|null>(null);
 const [tab,setTab]=useState<'skill'|'peak'>('skill');
 const points=availableV2DemoSkills(state,heroLevel);
 return <section className="v2-ref-skill" data-reference="1000086686.jpg" aria-label="Навыки героя">
  <div className="v2-ref-skill-altar">
   <span className="v2-ref-skill-banner">◈</span><span className="v2-ref-skill-altar-name">Навык</span>
  </div>
  <div className="v2-ref-skill-parchment">
   <div className="v2-ref-skill-rows">
    {skillRows.map((row,i)=><div className="v2-ref-skill-row" key={row.id}>
     <button type="button" className="v2-ref-skill-kind"
       onClick={()=>setDetails(details===row.id?null:row.id)}
       aria-expanded={details===row.id} aria-label={'Параметры категории '+row.label}>
       <span>{row.sign}</span><strong>{row.label}</strong>
     </button>
     {row.icons.map((glyph,j)=><button type="button" key={j}
       className={'v2-ref-skill-hex v2-ref-skill-'+row.palette[j]+(choices[i]===j?' equipped':'')}
       aria-pressed={choices[i]===j} aria-label={row.label+', вариант '+(j+1)}
       onClick={()=>{setChoices(old=>old.map((value,index)=>index===i?j:value));setDetails(row.id)}}>
       <span className="v2-ref-skill-hex-face">{glyph}</span>
       {choices[i]===j&&<small>Экипировано</small>}
      </button>)}
    </div>)}
   </div>
   <div className="v2-ref-passive-title">Пассивный</div>
   <div className="v2-ref-passives" aria-label="Пассивные знаки"><span>♥</span><span>✦</span><span>❖</span></div>
   <div className="v2-ref-rune-bonus">
    <strong>Бонус к Рунам навыков:</strong>
    <small>Атака — · Жизнь — · Защита —</small>
   </div>
   {details&&<div className="v2-ref-skill-inspector" aria-live="polite">
     <b>{skillRows.find(row=>row.id===details)?.label} · уровень тренировки {state.levels[details]}/5</b>
     <span>Очков доступно: {points}. Выбор рисунка не меняет урон до утверждения эффекта.</span>
     <button type="button" disabled={points===0||state.levels[details]>=5}
       onClick={()=>onTrain(details)}>Улучшить тренировку · 1 очко</button>
    </div>}
   <div className="v2-ref-skill-foot">
    <button type="button" className={tab==='skill'?'active':''} onClick={()=>setTab('skill')}>Навык</button>
    <button type="button" className={tab==='peak'?'active':''} onClick={()=>setTab('peak')}>Пиковый уровень</button>
   </div>
   {tab==='peak'&&<p className="v2-ref-quiet">Пиковый уровень: параметры не подтверждены.</p>}
   <button className="v2-ref-rune-link" type="button" onClick={onShowRunes} aria-label="Открыть руны">ᚱ</button>
  </div>
 </section>;
}

const routes=[
 {id:'ranch',label:'Хаотическое Пастбище',counter:'Сегодняшние рейды 0/2',icon:'⚒',kind:'farm'},
 {id:'dark',label:'Тайное Царство Тёмной Энергии',counter:'',icon:'✦',kind:'portal'},
 {id:'boss',label:'Битва с Боссом',counter:'Сегодняшние рейды 0/5',icon:'☠',kind:'fortress'},
] as const;
type V2Route=typeof routes[number]['id'];
/** The three illustrated locations in the approved adventure screenshot. */
export function V2ReferenceAdventure({onBoss,onCampaign}:{
 onBoss:()=>void;onCampaign:()=>void;
}){
 const [selected,setSelected]=useState<V2Route|null>(null);
 return <section className="v2-ref-adventure" data-reference="1000086685.jpg">
  <div className="v2-ref-adventure-title"><span>Приключение</span></div>
  <div className="v2-ref-adventure-land" aria-label="Карта приключений">
   <svg className="v2-ref-adventure-rivers" viewBox="0 0 440 710" preserveAspectRatio="none" aria-hidden="true">
    <path d="M-50 100 Q150 40 100 250 T265 440 T50 750" fill="none" stroke="#84769d" strokeWidth="165" opacity=".8"/>
    <path d="M-50 100 Q150 40 100 250 T265 440 T50 750" fill="none" stroke="#afa3c8" strokeWidth="143" opacity=".77"/>
    <path d="M340 -30 Q240 150 365 270 T360 750" fill="none" stroke="#6c6480" strokeWidth="32" opacity=".56"/>
    <path d="M340 -30 Q240 150 365 270 T360 750" fill="none" stroke="#c5c0b7" strokeWidth="22"/>
   </svg>
   {Array.from({length:22},(_,i)=><span key={i} className="v2-ref-map-rock" style={{left:(i*71%92)+'%',top:(i*43%93)+'%'}} aria-hidden="true">♠</span>)}
   {routes.map(route=><button type="button" key={route.id}
     className={'v2-ref-adventure-place v2-ref-adventure-'+route.kind}
     onClick={()=>route.id==='boss'?onBoss():setSelected(route.id)}
     aria-label={route.label}>
      <span className="v2-ref-adventure-badge">☠</span>
      <strong>{route.label}</strong>
      {route.counter&&<small>{route.counter}</small>}
      <span className="v2-ref-adventure-object"><span aria-hidden="true">{route.icon}</span></span>
    </button>)}
   {selected&&<div className="v2-ref-adventure-pop" role="dialog" aria-label="Приключение">
      <button type="button" className="v2-ref-adventure-close" aria-label="Закрыть" onClick={()=>setSelected(null)}>×</button>
      <h3>{routes.find(x=>x.id===selected)?.label}</h3>
      <p>Отдельный серверный режим пока не включён. Показанные рейды — ориентир снимка, не доступные попытки.</p>
      <button type="button" onClick={onCampaign}>Перейти к доступным этапам</button>
    </div>}
  </div>
  <p className="v2-ref-adventure-note">Карта — оригинальная игровая иллюстрация. Испытания с неизвестной экономикой недоступны.</p>
 </section>;
}

type GemRow={name:string;icon:string;color:string;levels:readonly number[]};
const gemRows:readonly GemRow[]=[
 {name:'Перчатки',icon:'✊',color:'red',levels:[8,8,8]},
 {name:'Броня',icon:'♜',color:'blue',levels:[8,8,7]},
 {name:'Шлем',icon:'♟',color:'green',levels:[8,8,7]},
 {name:'Оружие',icon:'⚔',color:'orange',levels:[8,8,8]},
];
export function V2ReferenceGems({onClose}: {onClose:()=>void}){
 const [row,setRow]=useState(0),[slot,setSlot]=useState(0);
 const [message,setMessage]=useState('');
 const current=gemRows[row];
 return <section className="v2-ref-gems" data-reference="1000086683.jpg" aria-label="Драгоценный камень">
  <div className="v2-ref-gems-heading">
   <button type="button" aria-label="Информация" onClick={()=>setMessage('Характеристики и рецепты ещё не утверждены. Камни здесь только для визуальной проверки.')}>ⓘ</button>
   <h2>Драгоценный камень</h2>
   <button type="button" className="v2-ref-synthesize" onClick={()=>setMessage('Синтез не доступен без серверных рецептов и проверки ресурсов.')}>✧<small>Синтезировать</small></button>
  </div>
  <div className="v2-ref-gems-altar"><span className="v2-ref-gems-altar-emblem">{current.icon}</span></div>
  <div className="v2-ref-gems-selected">
   {current.levels.map((level,index)=><button key={index} type="button" aria-pressed={slot===index}
    onClick={()=>setSlot(index)} className={'v2-ref-gem v2-ref-gem-'+current.color+(slot===index?' selected':'')}>
     <span>◆</span><small>Lv.{level}</small>
     <em>{current.name==='Перчатки'?'Атака +19,200':'Образец камня'}</em>
    </button>)}
  </div>
  <div className="v2-ref-gem-list" role="group" aria-label="Слоты драгоценных камней">
   {gemRows.map((gear,index)=><div key={gear.name} className={'v2-ref-gem-row'+(row===index?' current':'')}>
     <button type="button" className="v2-ref-gem-row-label" onClick={()=>{setRow(index);setSlot(0);setMessage('')}}>
      <span>{gear.icon}</span><strong>{gear.name}</strong>
     </button>
     {gear.levels.map((level,i)=><button type="button" key={i}
       className={'v2-ref-gem v2-ref-gem-'+gear.color+(row===index&&slot===i?' selected':'')}
       aria-label={gear.name+', камень '+(i+1)+', уровень '+level}
       aria-pressed={row===index&&slot===i}
       onClick={()=>{setRow(index);setSlot(i);setMessage('')}}><span>◆</span><small>Lv.{level}</small></button>)}
    </div>)}
  </div>
  {message&&<p className="v2-ref-gem-message" role="status">{message}
    <button type="button" onClick={()=>setMessage('')}>×</button></p>}
  <button className="v2-ref-gem-back" type="button" onClick={onClose} aria-label="Назад">➜</button>
  <small className="v2-ref-gem-disclaimer">Уровни и изображения — снимок-эталон, не реальные камни аккаунта.</small>
 </section>;
}

type StorageEntry={id:string;count:string;label:string;icon:string;shade:string;itemId?:string};
export function V2ReferenceWarehouse({progress,onShowGear}:{
 progress:V2Progression;onShowGear:()=>void;
}){
 const [inspect,setInspect]=useState<string|null>(null);
 const things:StorageEntry[]=useMemo(()=>[
  {id:'gems',count:progress.gems.toLocaleString('ru-RU'),label:'Синие алмазы',icon:'◆',shade:'purple'},
  {id:'gold',count:progress.gold.toLocaleString('ru-RU'),label:'Золото',icon:'◉',shade:'amber'},
  {id:'materials',count:progress.materials.toLocaleString('ru-RU'),label:'Материалы',icon:'▣',shade:'orange'},
  ...progress.inventory.map(item=>({
   id:'gear-'+item.id,count:'+'+item.upgrade,label:item.name,
   icon:item.slot==='weapon'?'⚔':item.slot==='armor'?'♜':item.slot==='helmet'?'♟':'✦',
   shade:item.rarity==='legendary'?'amber':item.rarity==='epic'?'purple':item.rarity==='rare'?'blue':'orange',
   itemId:item.id,
  })),
 ],[progress.gems,progress.gold,progress.materials,progress.inventory]);
 const picked=things.find(item=>item.id===inspect);
 return <section className="v2-ref-warehouse" data-reference="1000086682.jpg">
  <div className="v2-ref-storage-grid" aria-label="Склад ресурсов и находок">
   {things.map(item=><button key={item.id} type="button"
    className={'v2-ref-storage-cell v2-ref-storage-'+item.shade+(inspect===item.id?' chosen':'')}
    onClick={()=>setInspect(item.id)} aria-pressed={inspect===item.id}
    aria-label={item.label+', '+item.count}>
      <span>{item.icon}</span><small>{item.count}</small>
    </button>)}
  </div>
  {picked&&<div className="v2-ref-storage-inspect" aria-live="polite">
   <strong>{picked.label}</strong><span>{picked.count}</span>
   {picked.itemId&&<button type="button" onClick={onShowGear}>Сравнить со снаряжением</button>}
   <button type="button" onClick={()=>setInspect(null)} aria-label="Закрыть описание">×</button>
  </div>}
 </section>;
}
