import { useEffect, useMemo, useRef, useState } from 'react';
import { encounterForChapter, nextPreviewTick, startPreviewEncounter, type HeroClass, type RuneKind, type CompanionKind } from './core/autoBattle';
import { V2_BOTTOM_NAV, V2_LEFT_SHORTCUTS, V2_RIGHT_SHORTCUTS, V2_EXTRA_MENU, type V2ScreenId } from './interfaceContract';
import { InventoryExperience, EquipmentSlot } from './InventoryExperience';
import { DEMO_START_CHAPTER, DEMO_WAVES_PER_CHAPTER, chooseDemoChapter, nextDemoChapterVictory, demoCombatSample } from './core/campaignFlow';
import { V2_SKILL_CATEGORIES, type V2SkillCategory } from './core/buildLoadout';
import { createDemoBuildSlots, saveDemoBuildSlot, loadDemoBuildSlot } from './core/previewBuilds';
import {
  createV2DemoProgress,applyV2DemoVictory,statsFromV2Progress,nextXp,
  equipV2Item,unequipV2Item,salvageV2Item,upgradeV2Equipped,
  V2_GEAR_SLOTS,type V2Progression,type V2GearSlot,
} from './core/progression';
import './next.css';
import './navigation.css';
import './approved-ui.css';

/**
 * Self-contained playable staging UI for TERRITORY 2.0.
 * Deliberately does NOT import App, auth, cloud, supabase or the old save store.
 * All profile/currencies/gear are clearly marked mock values. No wallets move.
 */
const asset = (path: string): string => import.meta.env.BASE_URL + path.replace(/^\//, '');
const heroAsset = asset('assets/territory/characters/heroes/male_viking/idle.webp');
const altHeroAssets = {
  berserker: heroAsset,
  runemage: asset('assets/territory/characters/heroes/female_warrior/idle.webp'),
  ranger: asset('assets/territory/characters/heroes/female_archer/idle.webp'),
} satisfies Record<HeroClass, string>;
const companionArt: Record<CompanionKind, string> = {
  guardian: asset('assets/territory/characters/followers/loyal_shield/idle.webp'),
  warrior: asset('assets/territory/characters/followers/northern_warrior/idle.webp'),
  healer: asset('assets/territory/characters/followers/forest_healer/idle.webp'),
  hunter: asset('assets/territory/characters/followers/moon_hunter/idle.webp'),
  mage: asset('assets/territory/characters/followers/rune_mage/idle.webp'),
  warcow: asset('assets/territory/v2/followers/battle-cow.svg'),
};
const enemies = [
  asset('assets/territory/characters/enemies/wolf/idle.webp'),
  asset('assets/territory/characters/enemies/goblin/idle.webp'),
  asset('assets/territory/characters/enemies/bandit/idle.webp'),
  asset('assets/territory/characters/enemies/troll/idle.webp'),
  asset('assets/territory/characters/bosses/giant_king/idle.webp'),
];
const bottomIcon: Record<string, string> = {
  port:'ic-sea.webp',
  skills:'ic-blessing.webp',
  expedition:'nav-battle.webp',
  adventure:'nav-map-parchment.webp',
  shop:'ic-shop.webp',
};
const shortcutArt: Record<string,string> = {
  quests:'ic-quests.webp',events:'ic-events.webp',friends:'ic-invite.webp',
  rewards:'ic-daily.webp',settings:'ic-settings.webp',specialMarket:'ic-shop.webp',
  trials:'ic-trials.webp',welcomeBundle:'ic-blessing.webp',
  invitation:'ic-invite.webp',socialRewards:'ic-trophy.webp',seaBundle:'ic-sea.webp',ranking:'ic-trophy.webp',
};
const shortcutIcon: Record<string, string> = {
  quests:'📜', events:'🎇', friends:'🤝', rewards:'🎁', specialMarket:'💰', trials:'🐲',
  welcomeBundle:'🎖', hero:'🛡', warehouse:'🎒', runes:'ᚱ', companions:'🐂', arena:'⚔',
  clan:'🏰', professions:'⚒', games:'🎲', mail:'✉', settings:'⚙',
  port:'⚓', skills:'ᛟ', expedition:'⚔', adventure:'🗺', shop:'🏪',
  invitation:'✉', socialRewards:'🏅', seaBundle:'⛵',ranking:'🏆',
};
const gear = [
  ['weapon','Оружие'],['helmet','Шлем'],['armor','Броня'],['boots','Обувь'],
  ['shield','Щит'],['ring','Кольцо'],['amulet','Амулет'],
] as const;
const runeOptions: {id:RuneKind; name:string; icon:string; desc:string}[] = [
  {id:'flame',name:'Огонь',icon:'🔥',desc:'Поджигает врагов'},
  {id:'frost',name:'Лёд',icon:'❄',desc:'Может прервать удар'},
  {id:'thunder',name:'Гром',icon:'⚡',desc:'Накапливает мощь'},
  {id:'guardian',name:'Защита',icon:'🛡',desc:'Создаёт щит'},
];
const followerOptions: {id:CompanionKind; name:string; desc:string}[] = [
  {id:'guardian',name:'Верный щит',desc:'Снижает входящий урон'},
  {id:'warrior',name:'Северный воин',desc:'Участвует в атаке'},
  {id:'healer',name:'Хранитель леса',desc:'Восстанавливает HP'},
  {id:'hunter',name:'Лунный охотник',desc:'Поддерживает атаки'},
  {id:'mage',name:'Маг рун',desc:'Наносит дополнительный урон'},
  {id:'warcow',name:'Боевая корова',desc:'Броня, защита и мощная атака рогами'},
];
const classes: {id:HeroClass; name:string; desc:string}[] = [
  {id:'berserker',name:'Берсерк',desc:'Мощный ближний бой'},
  {id:'runemage',name:'Рунный воин',desc:'Сила волшебных рун'},
  {id:'ranger',name:'Следопыт',desc:'Быстрые точные атаки'},
];
const skillCategories: Readonly<Record<V2SkillCategory,{label:string;desc:string}>> = {
  basic: {label:'Базовые',desc:'Основа атак и восстановления боевого ресурса.'},
  core: {label:'Ключевые',desc:'Основное умение, руна изменяет его поведение в демонстрационном бою.'},
  control: {label:'Контроль',desc:'Эффекты прерывания и ограничения врага. Точные слоты пока не подтверждены.'},
  ultimate: {label:'Ультимативные',desc:'Сильные умения с особым временем применения. Численные параметры ещё не утверждены.'},
  passive: {label:'Пассивные',desc:'Долговременные эффекты сборки, комплектов и спутников; баланс пока не подключён.'},
};

type Overlay = V2ScreenId | 'menu' | null;

function DemoNote() {
  return <div className="v2-demo-note">ТЕСТОВАЯ ВЕРСИЯ · Сохранения игроков и реальные валюты не подключены</div>;
}
function Shortcut({id,label,onClick}: {id:string;label:string;onClick:()=>void}) {
  return <button className="v2-shortcut" type="button" onClick={onClick} title={label}>
    <b aria-hidden="true">{id==='settings'?<span className="v2-menu-glyph"/>:shortcutArt[id]?<img src={asset(shortcutArt[id])} alt="" loading="lazy"/>:shortcutIcon[id]??'✦'}</b><span>{label}</span>
  </button>;
}
function ViewTile({name,icon,onClick}: {name:string;icon:string;onClick:()=>void}) {
  return <button className="v2-view-tile" type="button" onClick={onClick}><b>{icon}</b><span>{name}</span></button>;
}

export function NextApp() {
  const [chapter,setChapter] = useState(DEMO_START_CHAPTER);
  const [highestUnlockedChapter,setHighestUnlockedChapter] = useState(DEMO_START_CHAPTER);
  const [skillCategory,setSkillCategory] = useState<V2SkillCategory>('core');
  const [demoBuilds,setDemoBuilds] = useState(()=>createDemoBuildSlots(3));
  const [buildNotice,setBuildNotice] = useState('');
  const settledDemoEncounters = useRef<Set<number>>(new Set());
  const [wave,setWave] = useState(2);
  const [heroClass,setHeroClass] = useState<HeroClass>('berserker');
  const [rune,setRune] = useState<RuneKind>('flame');
  const [companion,setCompanion] = useState<CompanionKind>('guardian');
  const [overlay,setOverlay] = useState<Overlay>(null);
  const [speed,setSpeed] = useState<1|2>(1);
  const [auto,setAuto] = useState(true);
  const [victories,setVictories] = useState(0);
  const [defeats,setDefeats] = useState(0);
  const [notice,setNotice] = useState('');
  const [progress,setProgress] = useState<V2Progression>(createV2DemoProgress);
  const [encounterId,setEncounterId] = useState(1);
  const [gearFocus,setGearFocus] = useState<V2GearSlot>('weapon');
  const heroStats = useMemo(()=>statsFromV2Progress(progress),[progress]);
  const config = useMemo(() => ({
    ...encounterForChapter(chapter,wave,heroClass),
    hero: {level:progress.level,...heroStats},
    rune,companion,speed:1 as const
  }),[chapter,wave,heroClass,rune,companion,progress.level,heroStats]);
  const [battle,setBattle] = useState(() => startPreviewEncounter(config));

  useEffect(()=>{setBattle(startPreviewEncounter(config));},[config]);
  useEffect(()=>{
    if(!auto || battle.finished) return;
    const interval = window.setInterval(()=>{
      setBattle(b=>nextPreviewTick(b,demoCombatSample(encounterId,b.tick)));

    },speed===2?340:680);
    return ()=>window.clearInterval(interval);
  },[auto,battle.finished,speed,encounterId]);

  useEffect(()=>{
    if(!battle.finished) return;
    const status = battle.finished;
    setNotice(status==='victory'?'Победа! Следующая волна':'Герой восстанавливается');
    const timeout=window.setTimeout(()=>{
      if(settledDemoEncounters.current.has(encounterId)) return;
      settledDemoEncounters.current.add(encounterId);
      if(status==='victory'){
        // Local demo receipts are unique per encounter. Replaying an effect
        // can never mint twice; real economy needs server-generated receipts.
        setProgress(p=>applyV2DemoVictory(
          p,'v2-demo-encounter-'+encounterId,chapter,wave,
          ((encounterId*531+chapter*73+wave*17)%997)/997
        ));
        setVictories(v=>v+1);
        const outcome=nextDemoChapterVictory({chapter,wave},highestUnlockedChapter);
        setHighestUnlockedChapter(outcome.highestUnlockedChapter);
        setChapter(outcome.nextRoute.chapter);
        setWave(outcome.nextRoute.wave);
      } else {
        setDefeats(v=>v+1);
        setBattle(startPreviewEncounter(config));
      }
      setEncounterId(x=>x+1);
      setNotice('');
    },1350);
    return ()=>window.clearTimeout(timeout);
  },[battle.finished,config,wave,chapter,encounterId,highestUnlockedChapter]);

  const heroHpPct=Math.max(0,100*battle.heroHp/config.hero.hp);
  const enemyHpPct=Math.max(0,100*battle.enemyHp/config.enemy.hp);
  const energyPct=Math.max(0,100*battle.mana/battle.maxMana);
  const latestHit = [...battle.events].reverse().find(e=>e.target==='enemy' && e.amount>0);
  const chapterPercent=(wave-1)*100/DEMO_WAVES_PER_CHAPTER+(1-enemyHpPct/100)*100/DEMO_WAVES_PER_CHAPTER;
  const xpPct=progress.level>=300?100:Math.min(100,progress.xp/nextXp(progress.level)*100);
  const routeTitle:Record<string,string>={port:'Порт',skills:'Навыки',expedition:'Поход',adventure:'Приключение',shop:'Магазин',hero:'Герой',warehouse:'Склад',runes:'Руны',companions:'Последователи',arena:'Арена',quests:'Задания',events:'События',friends:'Друзья',rewards:'Награды',clan:'Клан',professions:'Профессии',games:'Игровой зал',mail:'Почта',specialMarket:'Рынок',trials:'Испытания',welcomeBundle:'Первый взнос',settings:'Настройки',menu:'Меню',invitation:'Приглашение',socialRewards:'Социальные награды',seaBundle:'Морской набор',ranking:'Рейтинг'};
  const open = (id: V2ScreenId | 'menu')=>id==='expedition'?(setOverlay(null),setAuto(true)):setOverlay(id);

  return <div className="v2-shell">
    <div className="v2-prelabel">TERRITORY 2.0 <span>DEMO</span></div>
    <header className="v2-header">
      <button className="v2-profile" type="button" onClick={()=>open('hero')}>
        <img src={altHeroAssets[heroClass]} alt="" />
        <span className="v2-level-badge">{progress.level}</span>
      </button>
      <div className="v2-identity">
        <div className="v2-power-banner" title="Демонстрационный показатель, не реальная боевая мощь">🔥 {Math.round(config.hero.attack*87).toLocaleString('ru-RU')}</div>
        <strong>Викинг <i>VIP 5</i></strong>
        <span className="v2-experience-line" title={progress.xp+' / '+nextXp(progress.level)+' XP'}><span style={{width:xpPct+'%'}}/></span>
      </div>
      <div className="v2-wallet" aria-label="Демонстрационные валюты">
        <button type="button" onClick={()=>open('shop')} aria-label="Золото — открыть магазин"><img src={asset('gold-coin.webp')} alt=""/>{progress.gold.toLocaleString('ru-RU')}<b>+</b></button>
        <button type="button" onClick={()=>open('shop')} aria-label="Синие алмазы — открыть магазин"><img src={asset('blue-gem.webp')} alt=""/>{progress.gems.toLocaleString('ru-RU')}<b>+</b></button>
        <button type="button" onClick={()=>open('shop')} aria-label="Красные алмазы — открыть магазин"><img src={asset('red-gem.webp')} alt=""/>{progress.redGems.toLocaleString('ru-RU')}<b>+</b></button>
      </div>
    </header>

    <section className={'v2-battle v2-biome-'+(Math.floor((chapter-1)/3)%4)} aria-label="Боевой поход">
      <div className="v2-parallax" aria-hidden="true"/>
      <div className="v2-stagehead">
        <div className="v2-stage-track" role="progressbar" aria-label="Прогресс главы" aria-valuemin={0} aria-valuemax={DEMO_WAVES_PER_CHAPTER} aria-valuenow={wave-1}>
          <div className="v2-stage-line" style={{width:chapterPercent*.8+'%'}} aria-hidden="true"/>
          {Array.from({length:DEMO_WAVES_PER_CHAPTER},(_,i)=><span key={i} className={(i+1<wave?'cleared ':i+1===wave?'current ':'')+(i===DEMO_WAVES_PER_CHAPTER-1?'boss-node':'')} aria-label={'Этап '+(i+1)}>{i===DEMO_WAVES_PER_CHAPTER-1?'☠':'◆'}</span>)}
        </div>
        <strong>[Глава {chapter}] Северные земли</strong>
        <small>{chapter}-{wave} · {wave===DEMO_WAVES_PER_CHAPTER?'Босс: ':''}{config.enemyName}</small>
        <button className="v2-stage-enter" type="button" onClick={()=>setAuto(true)} aria-label="Войти в текущий этап">{auto?'В бою':'Войти'}</button>
      </div>
      <div className="v2-left-buttons">
        {V2_LEFT_SHORTCUTS.map(x=><Shortcut key={x.id} {...x} onClick={()=>open(x.id)}/>)}
      </div>
      <div className="v2-right-buttons">
        <Shortcut id="settings" label="Меню" onClick={()=>open('menu')}/>
        {V2_RIGHT_SHORTCUTS.map(x=><Shortcut key={x.id} {...x} label={x.label} onClick={()=>open(x.id)}/>)}
      </div>
      <div className={'v2-combatants'+(!auto?' paused':'')}>
        <div className="v2-follow">
          <img src={companionArt[companion]} alt="Спутник"/>

        </div>
        <div className="v2-warrior">
          <img src={altHeroAssets[heroClass]} alt="Викинг"/>
          <span className="v2-swipe" aria-hidden="true"/>
        </div>
        <div className={'v2-foe'+(wave===5?' boss':'')}>
          <div className="v2-foe-hp"><span style={{width:enemyHpPct+'%'}}/></div>
          <img src={enemies[(wave-1)%enemies.length]} alt={config.enemyName}/>
          {latestHit&&auto&&<b className="v2-damage" key={battle.tick}>−{latestHit.amount}</b>}
        </div>
      </div>
      <button className="v2-arena-button" onClick={()=>open('arena')} type="button">
        <img src={asset('ic-arena.webp')} alt=""/><span>Арена</span>
      </button>
      {(notice||!auto)&&<div className="v2-combat-notice">{notice||'Автобой остановлен'}</div>}
    </section>

    <section className="v2-healthrow" aria-label="Здоровье и энергия">
      <div className="v2-orb hp"><b>HP</b></div>
      <div className="v2-hp-wrap">
        <span className="v2-lvl">{progress.level}</span>
        <div className="v2-hp-bar"><div style={{width:heroHpPct+'%'}}/><strong>{battle.heroHp.toLocaleString('ru-RU')} / {config.hero.hp.toLocaleString('ru-RU')}</strong></div>
      </div>
      <button className="v2-hud-stat" onClick={()=>open('hero')} aria-label="Характеристики">▥</button>
      <div className="v2-orb energy" title={'Энергия '+battle.mana}>
        <div style={{height:energyPct+'%'}}/><b>{battle.mana}</b>
      </div>
    </section>

    <section className="v2-equipment" aria-label="Экипировка">
      {V2_GEAR_SLOTS.map(slot=><EquipmentSlot key={slot} slot={slot} item={progress.equipped[slot]} onClick={()=>{setGearFocus(slot);open('hero');}}/>)}
      <button className="v2-gear v2-extra-rune" type="button" onClick={()=>open('runes')} aria-label="Активная руна"><span className="v2-rune-glyph">ᚱ</span><small>Руна</small></button>
      <button className="v2-gear v2-extra-skill" type="button" onClick={()=>open('skills')} aria-label="Активные навыки"><img src={asset('ic-blessing.webp')} alt=""/><small>Навык</small></button>
      <button className="v2-gear v2-extra-follower" type="button" onClick={()=>open('companions')} aria-label="Активный спутник"><img src={companionArt[companion]} alt=""/><small>Спутник</small></button>
    </section>

    <section className="v2-commands">
      <button className="v2-task" onClick={()=>open('quests')}>
        <strong>Задание главы</strong><span>Победи {wave===5?'босса':'врагов'}</span>
        <small>{progress.wins} побед · {progress.bosses} боссов · 🎒 {progress.inventory.length}</small>
      </button>
      <button className="v2-control" type="button" onClick={()=>setSpeed(s=>s===1?2:1)} aria-label="Скорость">×{speed}</button>
      <button className={'v2-control repeat'+(auto?' active':'')} type="button" onClick={()=>setAuto(a=>!a)} aria-label={auto?'Остановить автобой':'Начать автобой'}>⟳</button>
      <button className="v2-control" type="button" onClick={()=>open('ranking')} aria-label="Рейтинг"><img className="v2-rank-icon" src={asset('ic-trophy.webp')} alt=""/></button>
    </section>

    <nav className="v2-bottom" aria-label="Основная навигация">
      {V2_BOTTOM_NAV.map(({id,label})=><button key={id} onClick={()=>open(id)}
        className={id==='expedition'?'main':''}
        type="button" aria-label={label||'Бой'}>
        <img src={asset(bottomIcon[id])} alt="" loading="lazy"/>{label?<span>{label}</span>:<small className="v2-nav-demo">ДЕМО</small>}
      </button>)}
    </nav>

    {overlay&&<div className="v2-mask" role="presentation" onClick={()=>setOverlay(null)}>
      <section className="v2-drawer" role="dialog" aria-modal="true" aria-label={routeTitle[overlay]} onClick={e=>e.stopPropagation()}>
        <header><button onClick={()=>overlay==='menu'?setOverlay(null):setOverlay('menu')} aria-label="Назад">‹</button><h2>{routeTitle[overlay]}</h2><button onClick={()=>setOverlay(null)} aria-label="Закрыть">×</button></header>
        <div className="v2-drawer-content">
          {(overlay==='menu'||overlay==='port')&&<div className="v2-tilegrid">
            {(overlay==='menu'?V2_EXTRA_MENU:[...V2_EXTRA_MENU.slice(0,4),{id:'adventure',label:'Приключение'},{id:'arena',label:'Арена'},{id:'games',label:'Игры'},{id:'professions',label:'Профессии'}]).map(x=><ViewTile key={x.id} name={x.label} icon={shortcutIcon[x.id]??'✦'} onClick={()=>open(x.id as V2ScreenId)}/>)}
          </div>}
          {(overlay==='hero'||overlay==='warehouse')&&<InventoryExperience
            view={overlay}
            progress={progress}
            heroArt={altHeroAssets[heroClass]}
            focusSlot={gearFocus}
            onView={open}
            onEquip={id=>setProgress(p=>equipV2Item(p,id))}
            onUnequip={slot=>setProgress(p=>unequipV2Item(p,slot))}
            onUpgrade={slot=>setProgress(p=>upgradeV2Equipped(p,slot))}
            onSalvage={id=>setProgress(p=>salvageV2Item(p,id))}
          />}
          {overlay==='skills'&&<>
            <h3>Выбор класса · демонстрационная сборка</h3>
            {classes.map(x=><button className={'v2-choice'+(heroClass===x.id?' chosen':'')} key={x.id} onClick={()=>setHeroClass(x.id)}><b>{x.name}</b><span>{x.desc}</span>{heroClass===x.id&&<em>Активен</em>}</button>)}
            <h3>Сборки героя · демонстрационные слоты</h3>
            <p>Эти 3 пресета существуют только в текущей демосессии и не меняют настоящий аккаунт. Количество реальных слотов в TERRITORY ещё не утверждено.</p>
            <div className="v2-build-presets">
              {demoBuilds.map(slot=><div className="v2-build-preset" key={slot.slot}>
                <b>Сборка {slot.slot}</b>
                <small>{slot.build?classes.find(x=>x.id===slot.build?.heroClass)?.name+' · '+runeOptions.find(x=>x.id===slot.build?.rune)?.name+' · '+followerOptions.find(x=>x.id===slot.build?.companion)?.name:'Пустой слот'}</small>
                <div>
                  <button type="button" aria-label={'Сохранить сборку '+slot.slot} onClick={()=>{
                    setDemoBuilds(s=>saveDemoBuildSlot(s,slot.slot,{heroClass,rune,companion}));
                    setBuildNotice('Сборка '+slot.slot+' сохранена только в демо');
                  }}>Сохранить</button>
                  <button type="button" disabled={!slot.build} aria-label={'Применить сборку '+slot.slot} onClick={()=>{
                    const selected=loadDemoBuildSlot(demoBuilds,slot.slot);
                    if(!selected)return;
                    setHeroClass(selected.heroClass);setRune(selected.rune);setCompanion(selected.companion);
                    setBuildNotice('Сборка '+slot.slot+' применена к демо-бою');
                  }}>Применить</button>
                </div>
              </div>)}
            </div>
            {buildNotice&&<p className="v2-preview-chip" role="status">{buildNotice}</p>}
            <h3>Категории боевых навыков</h3>
            <div className="v2-skill-tabs" role="group" aria-label="Категории навыков">
              {V2_SKILL_CATEGORIES.map(id=><button key={id} type="button" className={skillCategory===id?'chosen':''} onClick={()=>setSkillCategory(id)}>{skillCategories[id].label}</button>)}
            </div>
            <div className="v2-skill-detail">
              <strong>{skillCategories[skillCategory].label}</strong>
              <p>{skillCategories[skillCategory].desc}</p>
              {skillCategory==='core'
                ? <><span className="v2-preview-chip">ДЕМО · руна: {runeOptions.find(x=>x.id===rune)?.name}</span><button className="v2-cta" type="button" onClick={()=>open('runes')}>Настроить руну основной атаки</button></>
                : <p className="v2-preview-chip">Система категории подтверждена для региональной игры; слоты, уровни и численные эффекты в TERRITORY ещё не настроены.</p>}
            </div>
          </>}
          {overlay==='runes'&&<>
            <p>Каждая руна изменяет ход демонстрационного боя. Выбор применяется сразу.</p>
            <div className="v2-runes">{runeOptions.map(x=><button key={x.id} className={rune===x.id?'chosen':''} onClick={()=>setRune(x.id)}><b>{x.icon}</b><strong>{x.name}</strong><small>{x.desc}</small></button>)}</div>
          </>}
          {overlay==='companions'&&<>
            <p>Выбран один активный спутник. Его роль изменяет бой.</p>
            <div className="v2-comp-list">{followerOptions.map(x=><button key={x.id} onClick={()=>setCompanion(x.id)} className={companion===x.id?'chosen':''}><img src={companionArt[x.id]} alt=""/><span><b>{x.name}</b><small>{x.desc}</small></span>{companion===x.id&&<strong>✓</strong>}</button>)}</div>
            <div className="v2-cow-preview"><img src={companionArt.warcow} alt="Боевая корова в доспехах" className="v2-cow-sprite"/><div><strong>Боевая корова</strong><p>Особенный шестой спутник! Таранит врагов и частично защищает героя. Авторский первый векторный арт — ещё будем совершенствовать перед выпуском.</p><button type="button" className="v2-cow-select" onClick={()=>setCompanion('warcow')}>Выбрать боевую корову</button></div></div>
          </>}
          {overlay==='adventure'&&<>
            <p>Доступные главы демонстрационного похода · последняя открытая: {highestUnlockedChapter}. Следующая глава открывается только после победы над боссом текущей.</p>
            <div className="v2-stage-grid">{Array.from({length:Math.max(12,highestUnlockedChapter+1)},(_,i)=>i+1).map(x=><button type="button" disabled={x>highestUnlockedChapter} className={(chapter===x?'chosen ':'')+(x>highestUnlockedChapter?'locked':'')} key={x} onClick={()=>{
              const next=chooseDemoChapter(x,highestUnlockedChapter);
              if(!next)return;
              setChapter(next.chapter);setWave(next.wave);setOverlay(null);setAuto(true);
            }}>{x>highestUnlockedChapter?'🔒 ':''}Глава {x}<small>{x>highestUnlockedChapter?'Победи босса предыдущей главы':'Доступна · демо'}</small></button>)}</div>
          </>}
          {overlay==='quests'&&<><h3>Боевые задания</h3><div className="v2-info-row">Победы в демонстрационном походе <b>{progress.wins}</b></div><div className="v2-info-row">Побеждённые боссы <b>{progress.bosses}</b></div><div className="v2-info-row">Камни за обычного врага <b>0</b></div><div className="v2-info-row">Опыт героя <b>{progress.xp}/{nextXp(progress.level)}</b></div>
            {progress.latestLoot&&<div className="v2-quest-loot">
              <h3>Последняя добыча</h3>
              <p>🪙 +{progress.latestLoot.gold} · ⭐ +{progress.latestLoot.xp} XP · ⚒ +{progress.latestLoot.materials}</p>
              <strong>{progress.latestLoot.item?'🎒 '+progress.latestLoot.item.name:'Без предмета'}</strong>
              <button className="v2-cta" type="button" onClick={()=>open('warehouse')}>Посмотреть склад</button>
            </div>}
          </>}
          {overlay==='arena'&&<><p>Арена TERRITORY 2.0: PvP-чат во время боя, снаряжение, эликсиры, сезоны и 30 минут переписки после боя.</p><p>Пока доступен только интерфейс. Настоящие PvP-матчи требуют отдельного сервера.</p></>}
          {overlay==='ranking'&&<><h3>Рейтинг похода · локальная демонстрация</h3><div className="v2-info-row">Победы <b>{victories}</b></div><div className="v2-info-row">Боссы <b>{progress.bosses}</b></div><div className="v2-info-row">Поражения <b>{defeats}</b></div><p>Настоящий рейтинг появится после подключения независимого серверного учёта матчей.</p></>}
          {['shop','specialMarket','welcomeBundle','trials','events','rewards','friends','invitation','socialRewards','seaBundle','clan','professions','games','mail','settings'].includes(overlay)&&<div className="v2-feature-cards">
            <p>Раздел «{routeTitle[overlay]}» входит в нашу структуру TERRITORY 2.0.</p><p>Исходные механики уже перенесены в новый репозиторий. Здесь будет их обновлённый интерфейс после интеграции с тестовой базой.</p>
            <button className="v2-cta" onClick={()=>open('menu')}>Открыть меню</button>
          </div>}
        </div>
        <DemoNote/>
      </section>
    </div>}
  </div>;
}
