import {useState} from 'react';
import type {V2ScreenId} from '../interfaceContract';
import type {V2Progression} from '../core/progression';
import type {V2StageCampaign} from '../core/gameplayOverhaul';
import './inner-panels.css';

export type FeaturePanelId=Extract<V2ScreenId,
  'mail'|'trials'|'arena'|'friends'|'invitation'|'socialRewards'|
  'specialMarket'|'welcomeBundle'|'seaBundle'|'clan'|'games'>;

const asset=(path:string)=>import.meta.env.BASE_URL+path.replace(/^\//,'');
const mailItems=[
  {id:'welcome',title:'Добро пожаловать на Север',from:'Летописец TERRITORY',
   image:'ic-mail.webp',body:'Ты открываешь отдельную тестовую TERRITORY 2.0. Здесь можно проверять экраны и прокачку, не затрагивая настоящих игроков.'},
  {id:'expedition',title:'Отчёт о походах',from:'Совет северных земель',
   image:'ic-quests.webp',body:'Все результаты кампании и предметы сохраняются лишь в демоданных этого браузера. Серверная выдача наград в почте пока не подключена.'},
  {id:'supplies',title:'Подарки и посылки',from:'Кладовщик',
   image:'ic-daily.webp',body:'В релизе здесь появятся вложения писем, получение одной или нескольких наград и защита от повторной выдачи. Пока это только интерактивная демонстрация.'},
] as const;
const trials=[
 {stage:10,name:'Страж ледяной крепости',image:'assets/territory/characters/bosses/giant_king/idle.webp'},
 {stage:20,name:'Северный ярл',image:'assets/territory/characters/bosses/northern_jarl/idle.webp'},
 {stage:30,name:'Повелитель штормов',image:'assets/territory/characters/bosses/storm_lord/idle.webp'},
 {stage:40,name:'Король нежити',image:'assets/territory/characters/bosses/undead_king/idle.webp'},
 {stage:50,name:'Владыка огня',image:'assets/territory/characters/bosses/fire_lord/idle.webp'},
 {stage:60,name:'Хранитель кургана',image:'assets/territory/characters/bosses/barrow_guardian/idle.webp'},
 {stage:70,name:'Тёмный жрец',image:'assets/territory/characters/bosses/dark_priest/idle.webp'},
 {stage:80,name:'Вождь разбойников',image:'assets/territory/characters/bosses/bandit_chief/idle.webp'},
 {stage:90,name:'Тень хаоса',image:'assets/territory/characters/bosses/chaos_shadow/idle.webp'},
 {stage:100,name:'Демон бездны',image:'assets/territory/characters/bosses/abyss_demon/idle.webp'},
] as const;
const hall=[
 {name:'Сокровищница',image:'fortune/golden-chest.svg',description:'Сундуки и выбор сокровищ'},
 {name:'Монополия',image:'monopoly/hero.webp',description:'Настольное путешествие'},
 {name:'Рунические барабаны',image:'ic-trophy.webp',description:'Пять барабанов · игровой концепт'},
 {name:'Кости ярла',image:'ic-arena.webp',description:'Идея будущей мини-игры'},
 {name:'Колесо судьбы',image:'ic-daily.webp',description:'Идея будущей мини-игры'},
] as const;

function HallTitle({eyebrow,title,detail,image}:{
 eyebrow:string;title:string;detail:string;image:string;
}){
 return <div className="v2-inner-banner">
  <img src={asset(image)} alt="" loading="lazy"/>
  <div><small>{eyebrow}</small><h3>{title}</h3><p>{detail}</p></div>
 </div>;
}

export function FeaturePanelExperience({mode,progress,campaign,onNavigate}:{
 mode:FeaturePanelId;
 progress:V2Progression;
 campaign:V2StageCampaign;
 onNavigate:(id:V2ScreenId)=>void;
}){
 const [openedMail,setOpenedMail]=useState<string>('welcome');
 const [readMail,setReadMail]=useState<readonly string[]>([]);
 const [markedMail,setMarkedMail]=useState<readonly string[]>([]);
 const [selectedBoss,setSelectedBoss]=useState<number>(10);
 const [selectedGame,setSelectedGame]=useState(0);
 const [clanTab,setClanTab]=useState<'overview'|'roster'|'missions'>('overview');
 const unreads=mailItems.filter(m=>!readMail.includes(m.id)).length;
 const mail=mailItems.find(m=>m.id===openedMail)??mailItems[0];
 const markRead=(id:string)=>setReadMail(old=>old.includes(id)?old:[...old,id]);

 if(mode==='mail')return <section className="v2-inner-screen" data-screen="mail">
  <HallTitle eyebrow="КОРОЛЕВСКАЯ ПОЧТА" title="Письма героя" detail={'Непрочитано: '+unreads}
   image="ic-mail.webp"/>
  <div className="v2-inner-toolbar">
   <span>{mailItems.length} письма · пример интерфейса</span>
   <button type="button" disabled={unreads===0} onClick={()=>setReadMail(mailItems.map(m=>m.id))}>Прочитать все</button>
  </div>
  <div className="v2-mail-layout">
   <div className="v2-mail-list" role="group" aria-label="Входящие письма">
    {mailItems.map(m=><button type="button" key={m.id} className={'v2-mail-row'+(openedMail===m.id?' selected':'')}
       aria-pressed={openedMail===m.id} onClick={()=>{setOpenedMail(m.id);markRead(m.id)}}>
      <img src={asset(m.image)} alt=""/><span><strong>{m.title}</strong><small>{m.from}</small></span>
      {!readMail.includes(m.id)&&<em>НОВОЕ</em>}
     </button>)}
   </div>
   <article className="v2-inner-parchment">
    <small>ПИСЬМО · ДЕМОВЕРСИЯ</small><h4>{mail.title}</h4>
    <p>{mail.body}</p>
    <div className="v2-inner-reward-demo"><img src={asset('ic-daily.webp')} alt=""/>
     <div><strong>Посылка без предметов</strong><small>Серверное начисление отключено</small></div>
    </div>
    <button type="button" className="v2-inner-action" disabled={markedMail.includes(mail.id)}
     onClick={()=>{markRead(mail.id);setMarkedMail(old=>old.includes(mail.id)?old:[...old,mail.id])}}>
      {markedMail.includes(mail.id)?'✓ Отмечено в демо':'Отметить просмотренным'}
    </button>
   </article>
  </div>
  <p className="v2-inner-disclaimer">Кнопки работают только на этом экране. Никакие предметы, VIP и валюты не выдаются.</p>
 </section>;

 if(mode==='trials') {
  const boss=trials.find(b=>b.stage===selectedBoss)??trials[0];
  const open=boss.stage<=campaign.highestUnlockedStage;
  return <section className="v2-inner-screen" data-screen="trials">
   <HallTitle eyebrow="ПОДЗЕМЕЛЬЯ СЕВЕРА" title="Испытания и боссы"
    detail="Десять противников · путь через кампанию" image="ic-trials.webp"/>
   <div className="v2-boss-feature">
    <img src={asset(boss.image)} alt={'Босс '+boss.name}/>
    <div><small>БОСС · ЭТАП {boss.stage}</small><strong>{boss.name}</strong>
     <span>{open?'Доступен в кампании':'Ещё не открыт'}</span>
     <button className="v2-inner-action" type="button" onClick={()=>onNavigate('adventure')}>
       Открыть карту этапов
     </button>
    </div>
   </div>
   <div className="v2-inner-grid" role="group" aria-label="Выбор босса">
    {trials.map(b=><button type="button" key={b.stage}
      className={'v2-boss-tile'+(selectedBoss===b.stage?' selected':'')}
      aria-pressed={selectedBoss===b.stage} onClick={()=>setSelectedBoss(b.stage)}>
       <img src={asset(b.image)} alt=""/><strong>{b.stage}</strong><small>{b.stage<=campaign.highestUnlockedStage?'Доступен':'Закрыт'}</small>
     </button>)}
   </div>
   <p className="v2-inner-disclaimer">Это атлас боссов. Отдельные серверные испытания и таблицы лидеров не запущены; карта показывает существующий демопрогресс.</p>
  </section>;
 }

 if(mode==='games')return <section className="v2-inner-screen" data-screen="games">
  <HallTitle eyebrow="ЗАЛ РАЗВЛЕЧЕНИЙ" title="Игровой зал"
   detail="Пять игровых направлений · без расходования билетов" image="ic-trophy.webp"/>
  <div className="v2-game-grid" role="group" aria-label="Мини-игры">
   {hall.map((g,i)=><button type="button" key={g.name}
    className={'v2-game-card'+(selectedGame===i?' selected':'')} aria-pressed={selectedGame===i}
    onClick={()=>setSelectedGame(i)}>
    <img src={asset(g.image)} alt=""/><strong>{g.name}</strong><small>{i>=3?'Концепт':'В разработке'}</small>
   </button>)}
  </div>
  <article className="v2-inner-parchment">
   <small>ВЫБРАННАЯ ИГРА</small><h4>{hall[selectedGame].name}</h4><p>{hall[selectedGame].description}</p>
   <div className="v2-inner-status"><span>Билеты</span><strong>Не подключены</strong></div>
   <button className="v2-inner-action" type="button" disabled>Запуск после интеграции</button>
  </article>
  <p className="v2-inner-disclaimer">Игры не выдают награды и не списывают билеты. Запускать неготовый игровой автомат нельзя.</p>
 </section>;

 if(mode==='friends'||mode==='invitation'||mode==='socialRewards')return <section className="v2-inner-screen" data-screen="social">
  <HallTitle eyebrow="СОЮЗЫ И ПРИГЛАШЕНИЯ" title={mode==='socialRewards'?'Награды за друзей':mode==='invitation'?'Пригласить в отряд':'Мои друзья'}
    detail="Награды за приглашения будут подтверждаться сервером" image="ic-invite.webp"/>
  <div className="v2-inner-tabs">
   {([{id:'friends',label:'Друзья'},{id:'invitation',label:'Приглашение'},{id:'socialRewards',label:'Награды'}] as const)
    .map(x=><button key={x.id} type="button" className={mode===x.id?'selected':''}
     aria-pressed={mode===x.id} onClick={()=>onNavigate(x.id)}>{x.label}</button>)}
  </div>
  <div className="v2-social-emblem"><img src={asset('ic-invite.webp')} alt=""/></div>
  <article className="v2-inner-parchment">
   <small>ТЕЛЕГРАМ · БЕЗОПАСНЫЙ РЕЖИМ</small>
   <h4>{mode==='invitation'?'Твоя ссылка-приглашение':mode==='friends'?'Список приглашённых':'Путь к подаркам'}</h4>
   <p>{mode==='invitation'
     ?'Настоящая персональная ссылка появится после подключения защищённого Telegram ID. Выдуманный код не показываем.'
     :mode==='friends'
       ?'Пока в демоверсии нет привязанных друзей. Здесь будут отображаться подтверждённые приглашения и прогресс каждого друга.'
       :'Здесь появятся сундуки и бонусы по подтверждённым условиям. Размеры наград и защиту от повторных начислений утвердим для V2 отдельно.'}</p>
   <div className="v2-inner-status"><span>Подтверждено приглашений</span><strong>Нет данных сервера</strong></div>
   <button className="v2-inner-action" type="button" onClick={()=>onNavigate('quests')}>Открыть задания героя</button>
  </article>
  <p className="v2-inner-disclaimer">Никаких фиктивных рефералов и клиентских начислений красных алмазов.</p>
 </section>;

 if(mode==='clan')return <section className="v2-inner-screen" data-screen="clan">
  <HallTitle eyebrow="СЕВЕРНЫЙ СОЮЗ" title="Крепость клана"
   detail="Совместные задачи и отряд появятся после подключения серверной системы" image="nav-clan.webp"/>
  <div className="v2-inner-tabs" role="group" aria-label="Раздел клана">
   {([{id:'overview',label:'Крепость'},{id:'roster',label:'Участники'},{id:'missions',label:'Задания'}] as const)
    .map(x=><button type="button" key={x.id} aria-pressed={clanTab===x.id}
     className={clanTab===x.id?'selected':''} onClick={()=>setClanTab(x.id)}>{x.label}</button>)}
  </div>
  <div className="v2-inner-hero-art"><img src={asset('nav-clan.webp')} alt=""/></div>
  <article className="v2-inner-parchment">
   <small>КЛАНЫ · ДЕМОНСТРАЦИЯ</small><h4>{clanTab==='overview'?'Крепость пока пуста':clanTab==='roster'?'Участников нет':'Клановые миссии'}</h4>
   <p>{clanTab==='overview'?'Создание клана потребует реального игрока и проверенных сервером ресурсов. Пока доступен просмотр интерфейса.'
     :clanTab==='roster'?'Список участников будет загружаться только из V2-базы, без вымышленных игроков.'
     :'Задачи клана станут доступны после внедрения серверного прогресса и защиты совместных наград.'}</p>
  </article>
 </section>;

 if(mode==='arena')return <section className="v2-inner-screen" data-screen="arena">
  <HallTitle eyebrow="ПОЛЕ ЧЕСТИ" title="Арена героев"
   detail="PvP · чат во время боя · сезоны" image="ic-arena.webp"/>
  <div className="v2-arena-preview">
   <img src={asset('assets/territory/characters/heroes/male_viking/idle.webp')} alt="Герой"/>
   <span>VS</span>
   <img src={asset('assets/territory/characters/enemies/bandit/idle.webp')} alt="Тестовый противник"/>
  </div>
  <div className="v2-inner-stat-row">
   <span>Побед в PvE <strong>{progress.wins}</strong></span>
   <span>Боссов <strong>{progress.bosses}</strong></span>
  </div>
  <article className="v2-inner-parchment"><small>ПЛАН АРЕНЫ</small><h4>Сражения с реальными игроками</h4>
   <p>Чат доступен во время битвы; после боя переписка должна оставаться на 30 минут. Семь слотов экипировки и компактные эликсиры всегда под рукой.</p>
   <div className="v2-inner-status"><span>Поиск PvP-соперника</span><strong>Сервер не подключён</strong></div>
   <button className="v2-inner-action" type="button" onClick={()=>onNavigate('adventure')}>Открыть PvE-приключение</button>
  </article>
 </section>;

 const market=mode==='specialMarket';
 const first=mode==='welcomeBundle';
 return <section className="v2-inner-screen" data-screen="offer">
  <HallTitle eyebrow={market?'ОСОБЫЕ ПРЕДЛОЖЕНИЯ':first?'НАЧАЛО ПУТИ':'МОРСКИЕ ПОСТАВКИ'}
   title={market?'Специальный рынок':first?'Набор новичка':'Морской набор'}
   detail="Витрина будущих предложений без реальных платежей"
   image={market?'ic-shop.webp':first?'ic-daily.webp':'ic-sea.webp'}/>
  <div className="v2-inner-offer-art">
   <img src={asset(market?'ic-shop.webp':first?'fortune/golden-chest.svg':'ic-sea.webp')} alt=""/>
   <div><small>ПРЕДПРОСМОТР</small><strong>{market?'Редкие товары':first?'Подарочный сундук':'Припасы для плавания'}</strong></div>
  </div>
  <article className="v2-inner-parchment">
   <small>УСЛОВИЯ НЕ УТВЕРЖДЕНЫ</small>
   <h4>Пока без покупки</h4>
   <p>Состав, цена, лимиты и серверная выдача для этой витрины ещё не утверждены. Поэтому здесь нет фиктивной скидки, реальных начислений или платежной кнопки.</p>
   <button className="v2-inner-action" type="button" onClick={()=>onNavigate('shop')}>Открыть тестовый магазин</button>
  </article>
 </section>;
}
