import {useState} from 'react';
import type {V2ScreenId} from '../interfaceContract';
import type {V2Progression} from '../core/progression';
import type {V2StageCampaign} from '../core/gameplayOverhaul';
import {listV2DemoMail,type V2DemoMailState} from '../core/demoMail';
import './inner-panels.css';

export type FeaturePanelId=Extract<V2ScreenId,
  'mail'|'trials'|'arena'|'friends'|'invitation'|'socialRewards'|
  'specialMarket'|'welcomeBundle'|'seaBundle'|'clan'>;

const asset=(path:string)=>import.meta.env.BASE_URL+path.replace(/^\//,'');
const trials=[
 {stage:10,name:'Страж ледяной крепости',image:'art/bosses/giant_king.svg'},
 {stage:20,name:'Северный ярл',image:'art/bosses/northern_jarl.svg'},
 {stage:30,name:'Повелитель штормов',image:'art/bosses/storm_lord.svg'},
 {stage:40,name:'Король нежити',image:'art/bosses/undead_king.svg'},
 {stage:50,name:'Владыка огня',image:'art/bosses/fire_lord.svg'},
 {stage:60,name:'Хранитель кургана',image:'art/bosses/barrow_guardian.svg'},
 {stage:70,name:'Тёмный жрец',image:'art/bosses/dark_priest.svg'},
 {stage:80,name:'Вождь разбойников',image:'art/bosses/bandit_chief.svg'},
 {stage:90,name:'Тень хаоса',image:'art/bosses/chaos_shadow.svg'},
 {stage:100,name:'Демон бездны',image:'art/bosses/abyss_demon.svg'},
] as const;

function HallTitle({eyebrow,title,detail,image}:{
 eyebrow:string;title:string;detail:string;image:string;
}){
 return <div className="v2-inner-banner">
  <img src={asset(image)} alt="" loading="lazy"/>
  <div><small>{eyebrow}</small><h3>{title}</h3><p>{detail}</p></div>
 </div>;
}

export function FeaturePanelExperience({mode,progress,campaign,mailState,onMailAction,onNavigate}:{
 mode:FeaturePanelId;
 progress:V2Progression;
 campaign:V2StageCampaign;
 mailState:V2DemoMailState;
 onMailAction:(action:'read'|'review'|'archive'|'restore'|'read-all',id?:string)=>void;
 onNavigate:(id:V2ScreenId)=>void;
}){
 const [openedMail,setOpenedMail]=useState<string>('welcome');
 const [mailFilter,setMailFilter]=useState<'inbox'|'unread'|'archive'>('inbox');
 const [selectedBoss,setSelectedBoss]=useState<number>(10);
 const [clanTab,setClanTab]=useState<'overview'|'roster'|'missions'>('overview');
 const mailItems=listV2DemoMail(mailState);
 const unreads=mailItems.filter(m=>!mailState.read.includes(m.id)&&!mailState.archived.includes(m.id)).length;
 const visibleMail=mailItems.filter(m=>mailFilter==='archive'?mailState.archived.includes(m.id):
   !mailState.archived.includes(m.id)&&(mailFilter!=='unread'||!mailState.read.includes(m.id)));
 const mail=visibleMail.find(m=>m.id===openedMail)??visibleMail[0]??null;

 if(mode==='mail')return <section className="v2-inner-screen" data-screen="mail">
  <HallTitle eyebrow="КОРОЛЕВСКАЯ ПОЧТА" title="Письма героя" detail={'Непрочитано: '+unreads}
   image="art/icons/mail.svg"/>
  <div className="v2-inner-toolbar">
   <span>{mailItems.length} писем · история боёв сохраняется в браузере</span>
   <button type="button" disabled={unreads===0} onClick={()=>onMailAction('read-all')}>Прочитать все</button>
  </div>
  <div className="v2-mail-filters" role="group" aria-label="Папки почты">
   {([{id:'inbox',label:'Входящие'},{id:'unread',label:'Непрочитанные'},{id:'archive',label:'Архив'}] as const)
    .map(filter=><button type="button" key={filter.id} aria-pressed={mailFilter===filter.id}
      className={mailFilter===filter.id?'selected':''}
      onClick={()=>setMailFilter(filter.id)}>{filter.label}</button>)}
  </div>
  <div className="v2-mail-layout">
   <div className="v2-mail-list" role="group" aria-label="Письма в выбранной папке">
    {visibleMail.map(m=><button type="button" key={m.id} className={'v2-mail-row'+(mail?.id===m.id?' selected':'')}
       aria-pressed={mail?.id===m.id} onClick={()=>{setOpenedMail(m.id);onMailAction('read',m.id)}}>
      <img src={asset(m.image)} alt=""/><span><strong>{m.title}</strong><small>{m.from} · {m.sentAt}</small></span>
      {!mailState.read.includes(m.id)&&<em>НОВОЕ</em>}
      {mailState.reviewed.includes(m.id)&&<span className="v2-mail-reviewed" aria-label="Просмотрено">✓</span>}
     </button>)}
    {visibleMail.length===0&&<div className="v2-mail-empty">В этой папке пока нет писем.</div>}
   </div>
   {mail&&<article className="v2-inner-parchment">
    <small>ПИСЬМО · ДЕМО · {mail.sentAt}</small><h4>{mail.title}</h4>
    <p>{mail.body}</p>
    <div className="v2-inner-reward-demo"><img src={asset('art/icons/rewards.svg')} alt=""/>
     <div><strong>{mail.attachmentLabel}</strong><small>Серверное начисление отключено</small></div>
    </div>
    <div className="v2-mail-actions">
     <button type="button" className="v2-inner-action" disabled={mailState.reviewed.includes(mail.id)}
      onClick={()=>onMailAction('review',mail.id)}>
       {mailState.reviewed.includes(mail.id)?'✓ Просмотрено':'Отметить просмотренным'}
     </button>
     <button type="button" className="v2-inner-action"
      onClick={()=>onMailAction(mailState.archived.includes(mail.id)?'restore':'archive',mail.id)}>
       {mailState.archived.includes(mail.id)?'Вернуть во входящие':'В архив'}
     </button>
    </div>
   </article>}
  </div>
  <p className="v2-inner-disclaimer">Письма и отметки сохраняются только в этой тестовой игре. Никакие предметы, VIP и валюты не выдаются.</p>
 </section>;

 if(mode==='trials') {
  const boss=trials.find(b=>b.stage===selectedBoss)??trials[0];
  const open=boss.stage<=campaign.highestUnlockedStage;
  return <section className="v2-inner-screen" data-screen="trials">
   <HallTitle eyebrow="ПОДЗЕМЕЛЬЯ СЕВЕРА" title="Испытания и боссы"
    detail="Десять противников · путь через кампанию" image="art/icons/trials.svg"/>
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


 if(mode==='friends'||mode==='invitation'||mode==='socialRewards')return <section className="v2-inner-screen" data-screen="social">
  <HallTitle eyebrow="СОЮЗЫ И ПРИГЛАШЕНИЯ" title={mode==='socialRewards'?'Награды за друзей':mode==='invitation'?'Пригласить в отряд':'Мои друзья'}
    detail="Награды за приглашения будут подтверждаться сервером" image="art/icons/invitation.svg"/>
  <div className="v2-inner-tabs">
   {([{id:'friends',label:'Друзья'},{id:'invitation',label:'Приглашение'},{id:'socialRewards',label:'Награды'}] as const)
    .map(x=><button key={x.id} type="button" className={mode===x.id?'selected':''}
     aria-pressed={mode===x.id} onClick={()=>onNavigate(x.id)}>{x.label}</button>)}
  </div>
  <div className="v2-social-emblem"><img src={asset('art/icons/invitation.svg')} alt=""/></div>
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
   detail="Совместные задачи и отряд появятся после подключения серверной системы" image="art/icons/clan.svg"/>
  <div className="v2-inner-tabs" role="group" aria-label="Раздел клана">
   {([{id:'overview',label:'Крепость'},{id:'roster',label:'Участники'},{id:'missions',label:'Задания'}] as const)
    .map(x=><button type="button" key={x.id} aria-pressed={clanTab===x.id}
     className={clanTab===x.id?'selected':''} onClick={()=>setClanTab(x.id)}>{x.label}</button>)}
  </div>
  <div className="v2-inner-hero-art"><img src={asset('art/icons/clan.svg')} alt=""/></div>
  <article className="v2-inner-parchment">
   <small>КЛАНЫ · ДЕМОНСТРАЦИЯ</small><h4>{clanTab==='overview'?'Крепость пока пуста':clanTab==='roster'?'Участников нет':'Клановые миссии'}</h4>
   <p>{clanTab==='overview'?'Создание клана потребует реального игрока и проверенных сервером ресурсов. Пока доступен просмотр интерфейса.'
     :clanTab==='roster'?'Список участников будет загружаться только из V2-базы, без вымышленных игроков.'
     :'Задачи клана станут доступны после внедрения серверного прогресса и защиты совместных наград.'}</p>
  </article>
 </section>;

 if(mode==='arena')return <section className="v2-inner-screen" data-screen="arena">
  <HallTitle eyebrow="ПОЛЕ ЧЕСТИ" title="Арена героев"
   detail="PvP · чат во время боя · сезоны" image="art/icons/arena.svg"/>
  <div className="v2-arena-preview">
   <img src={asset('art/heroes/berserker.svg')} alt="Герой"/>
   <span>VS</span>
   <img src={asset('art/enemies/bandit.svg')} alt="Тестовый противник"/>
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
   image={market?'art/icons/market.svg':first?'art/icons/welcome.svg':'art/icons/sea.svg'}/>
  <div className="v2-inner-offer-art">
   <img src={asset(market?'art/icons/shop.svg':first?'art/icons/treasure.svg':'art/icons/sea.svg')} alt=""/>
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
