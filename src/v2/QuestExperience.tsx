import {useEffect,useMemo,useState} from 'react';
import {listV2DemoQuests,v2DemoQuestPeriods,
  type V2DemoQuestGroup,type V2DemoQuestId,type V2DemoQuestState,
} from './core/demoQuests';
import type {V2Progression} from './core/progression';
import type {V2ScreenId} from './interfaceContract';
import './questExperience.css';

type Mode='quests'|'rewards'|'events';
const groupName:Record<V2DemoQuestGroup,string>={
  story:'Сюжетные',daily:'Ежедневные',weekly:'Еженедельные',
};
const groupIcon:Record<V2DemoQuestGroup,string>={
  story:'⚔',daily:'☀',weekly:'✦',
};

export function QuestExperience({
  mode,state,progress,highestUnlockedChapter,onClaim,onOpenAdventure,onNavigate,
}:{
  mode:Mode;state:V2DemoQuestState;progress:V2Progression;
  highestUnlockedChapter:number;
  onClaim:(id:V2DemoQuestId)=>void;
  onOpenAdventure:()=>void;
  onNavigate?:(id:V2ScreenId)=>void;
}){
  const [selected,setSelected]=useState<V2DemoQuestGroup>('daily');
  const [now,setNow]=useState(()=>Date.now());
  useEffect(()=>{
    const timer=window.setInterval(()=>setNow(Date.now()),30_000);
    return ()=>window.clearInterval(timer);
  },[]);
  const rows=useMemo(()=>listV2DemoQuests(
    state,progress,highestUnlockedChapter,now,
  ),[state,progress,highestUnlockedChapter,now]);
  const period=v2DemoQuestPeriods(now);
  const ready=rows.filter(x=>x.ready);
  const collected=rows.filter(x=>x.claimed);
  const chosenGroup=mode==='quests'?selected:mode==='events'?'daily':null;
  const shown=mode==='rewards'
    ? rows.filter(x=>x.ready||x.claimed)
    : rows.filter(x=>x.definition.group===chosenGroup||mode==='events'&&x.definition.group==='weekly');

  const card=(row:typeof rows[number])=>{
    const {definition:d}=row;
    const pct=Math.max(0,Math.min(100,(row.current/row.target)*100));
    const status=row.claimed?'Получено':row.ready?'Готово':'В процессе';
    return <article className={'v2-quest-card'+(row.ready?' reward-ready':'')+(row.claimed?' completed':'')} key={row.key}>
      <div className="v2-quest-card-top">
        <span className="v2-quest-medallion" aria-hidden="true">{groupIcon[d.group]}</span>
        <div className="v2-quest-card-heading">
          <strong>{d.title}</strong>
          <small>{d.description}</small>
        </div>
        <span className={'v2-quest-state'+(row.ready?' ready':'')}>{status}</span>
      </div>
      <div className="v2-quest-progress-line" role="progressbar" aria-valuemin={0} aria-valuemax={row.target} aria-valuenow={Math.min(row.target,row.current)} aria-label={'Прогресс: '+d.title}>
        <span style={{width:pct+'%'}}/>
      </div>
      <div className="v2-quest-card-foot">
        <span className="v2-quest-count">{Math.min(row.current,row.target)} / {row.target}</span>
        <span className="v2-quest-no-money">Отметка · демо</span>
        <button type="button" disabled={!row.ready} onClick={()=>onClaim(d.id)}>
          {row.claimed?'✓ Получено':row.ready?'Получить':'Не выполнено'}
        </button>
      </div>
    </article>;
  };


  const screenshotTasks=[
    {name:'Призовите Руны 3 раз',target:3,destination:'runes' as const},
    {name:'Призовите Последователя 3 раз',target:3,destination:'companions' as const},
    {name:'Повышайте уровень Последователя 3 раз',target:3,destination:'companions' as const},
    {name:'Повышайте звёздный уровень Последователя 1 раз',target:1,destination:'companions' as const},
    {name:'Пройдите Хаотическое Пастбище 1 раз',target:1,destination:'adventure' as const},
  ] as const;
  const dailyCompleted=rows.filter(row=>row.definition.group==='daily'&&row.claimed).length;
  const dailyTotal=rows.filter(row=>row.definition.group==='daily').length;
  const dailyScore=dailyTotal?Math.floor(dailyCompleted/dailyTotal*100):0;
  return <div className={'v2-quest-experience'+(mode==='quests'&&selected==='daily'?' v2-ref-daily':'')}>
    {!(mode==='quests'&&selected==='daily')&&<div className="v2-quest-summary">
      <div><small>Победы</small><strong>{progress.wins.toLocaleString('ru-RU')}</strong></div>
      <div><small>Боссы</small><strong>{progress.bosses.toLocaleString('ru-RU')}</strong></div>
      <div><small>Доступная глава</small><strong>{highestUnlockedChapter}</strong></div>
    </div>}

    {mode==='quests'&&selected==='daily'&&<section className="v2-ref-daily-board" data-reference="1000086684.jpg">
      <div className="v2-ref-daily-heading">Ежедневные Задания</div>
      <div className="v2-ref-daily-meter">
        <span className="v2-ref-daily-medal">◉</span>
        <div className="v2-ref-daily-milestones" role="progressbar" aria-label="Прогресс дневных заданий" aria-valuemin={0} aria-valuemax={100} aria-valuenow={dailyScore}>
          <div className="v2-ref-daily-bar"><span style={{width:dailyScore+'%'}}/></div>
          {[20,40,60,80,100].map((value,i)=><div className="v2-ref-daily-prize" key={value}>
            <span>{dailyScore>=value?'✔':i===4?'◆':'◼'}</span><small>{value}</small>
          </div>)}
        </div>
        <strong>{dailyScore}/100</strong>
      </div>
      <div className="v2-ref-daily-tasklist">{screenshotTasks.map((task,index)=><article className="v2-ref-daily-task" key={index}>
        <span className="v2-ref-daily-scroll">📜</span><span className="v2-ref-daily-coin">◉<small>10</small></span>
        <div className="v2-ref-daily-taskdata"><strong>{task.name}</strong>
          <div className="v2-ref-daily-taskbar"><span/></div><small>(0/{task.target})</small>
        </div>
        <button type="button" onClick={()=>onNavigate?.(task.destination)}>Перейти</button>
      </article>)}</div>
      <p className="v2-ref-daily-status">Условия пяти заданий показаны на эталоне. Регистрация этих действий и выдача наград пока не подключены к серверу.</p>
    </section>}

    {mode==='quests'&&<>
      <div className="v2-quest-group-tabs" role="group" aria-label="Виды заданий">
        {(['daily','weekly','story'] as const).map(group=>
          <button type="button" key={group} className={selected===group?'selected':''}
            onClick={()=>setSelected(group)} aria-pressed={selected===group}>
            {group==='daily'?'Ежедневные Задания':group==='weekly'?'Еженедельная Награда':'Путь Героя'}
            {rows.some(row=>row.definition.group===group&&row.ready)&&<span className="v2-quest-tab-dot" aria-label="Есть выполненные задания"/>}
          </button>)}
      </div>
      <div className="v2-quest-period">
        {selected==='story'?'Основной путь героя':
          selected==='daily'?'День: '+period.day:'Неделя от воскресенья: '+period.week}
      </div>
    </>}

    {mode==='rewards'&&<>
      <div className="v2-quest-section-header">
        <h3>Достижения и награды</h3>
        <span>{ready.length} готово · {collected.length} получено</span>
      </div>
      <p className="v2-quest-context">Получение сейчас фиксирует только тестовую отметку. Выдача золота, алмазов и предметов будет включена после утверждения наград и подключения серверных квитанций.</p>
    </>}

    {mode==='events'&&<>
      <div className="v2-quest-section-header">
        <h3>Активности героя</h3>
        <span>Демо-расписание</span>
      </div>
      <div className="v2-quest-period">День {period.day} · Неделя {period.week}</div>
      <p className="v2-quest-context">Ежедневные и недельные цели учитываются отдельно. Для будущих ограниченных событий потребуются серверные сроки начала и завершения.</p>
    </>}

    {!(mode==='quests'&&selected==='daily')&&<div className="v2-quest-card-list">
      {shown.length?shown.map(card):
        <div className="v2-quest-empty">Пока нет готовых отметок. Побеждай противников и боссов в походе.</div>}
    </div>}

    {mode==='events'&&<article className="v2-quest-upcoming">
      <span aria-hidden="true">🛡</span>
      <div>
        <strong>Сезонная экспедиция</strong>
        <small>Временный рюкзак, выбор навыка и эвакуация — по отдельному серверному расписанию.</small>
        <em>Ещё не запущено</em>
      </div>
    </article>}
    <button className="v2-quest-go-fight" type="button" onClick={onOpenAdventure}>⚔ Вернуться к походу</button>
    <p className="v2-quest-safety">Только тестовый прогресс этого браузера. Никаких настоящих наград или платежей.</p>
  </div>;
}
