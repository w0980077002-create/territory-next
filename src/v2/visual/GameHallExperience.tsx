import {useEffect,useState} from 'react';
import {
 createTreasurePractice,openPracticeChest,nextPracticeChest,
 createMonopolyPractice,rollPracticeDice,V2_MONOPOLY_TILES,
 createRunePractice,spinPracticeRunes,doublePracticeWin,
 type TreasurePractice,type MonopolyPractice,type RunePractice,type RuneSymbol,
} from '../core/gameHallPractice';
import './game-hall.css';

const asset=(name:string)=>import.meta.env.BASE_URL+name;
const practiceGames=[
 {name:'Сокровищница',image:'art/icons/treasure.svg',detail:'Выбери сундук и открой находку'},
 {name:'Монополия',image:'art/icons/board.svg',detail:'Путешествие по 20 клеткам'},
 {name:'Рунические барабаны',image:'art/icons/reels.svg',detail:'5×3 барабана · 9 линий'},
 {name:'Режим 4',image:'art/icons/dice.svg',detail:'Ожидает утверждения механики'},
 {name:'Режим 5',image:'art/icons/wheel.svg',detail:'Ожидает утверждения механики'},
] as const;
const glyph:Readonly<Record<RuneSymbol,string>>={
 'ᚠ':'#b5e2fc','ᚱ':'#ffe09e','ᛟ':'#cab5f6','ᛞ':'#9ee9bc','⚔':'#ffd19a',
 'W':'#fff0a1','✦':'#ffb3f2'
};
function mapSpot(idx:number):readonly [number,number]{
 if(idx<=5)return [1,idx+1];
 if(idx<=10)return [idx-4,6];
 if(idx<=15)return [6,16-idx];
 return [21-idx,1];
}
const rollSet=()=>Array.from({length:15},()=>Math.random());
export function GameHallExperience(){
 const [active,setActive]=useState(0);
 const [treasure,setTreasure]=useState<TreasurePractice>(createTreasurePractice);
 const [monopoly,setMonopoly]=useState<MonopolyPractice>(createMonopolyPractice);
 const [runes,setRunes]=useState<RunePractice>(createRunePractice);
 const [remainingAutospins,setAutospins]=useState(0);
 useEffect(()=>{
  if(remainingAutospins<=0||active!==2)return;
  const timer=window.setTimeout(()=>{
   setRunes(previous=>spinPracticeRunes(previous,rollSet()));
   setAutospins(count=>Math.max(0,count-1));
  },900);
  return ()=>window.clearTimeout(timer);
 },[remainingAutospins,active]);
 const changeGame=(next:number)=>{
  setAutospins(0);setActive(next);
 };
 const game=practiceGames[active];
 return <section className="v2-hall" data-screen="games" aria-label="Игровой зал TERRITORY 2.0">
  <div className="v2-hall-head">
   <img src={asset('art/icons/games.svg')} alt=""/>
   <div><small>ЗАЛ СЕВЕРНОГО ЯРЛА</small><h3>Игровой зал</h3>
    <span>3 игровые тренировки · 2 режима ожидают ТЗ</span></div>
  </div>
  <div className="v2-hall-strip" role="tablist" aria-label="Выбор мини-игры">
   {practiceGames.map((g,i)=><button key={g.name} type="button" role="tab"
     aria-selected={active===i} className={active===i?'active':''} onClick={()=>changeGame(i)}>
     <img src={asset(g.image)} alt=""/><span>{g.name}</span>
     {i>2&&<small>Скоро</small>}
   </button>)}
  </div>
  <div className="v2-hall-selected" role="tabpanel" aria-label={game.name}>
   <header className="v2-hall-game-header">
    <img src={asset(game.image)} alt=""/>
    <div><strong>{game.name}</strong><span>{game.detail}</span></div>
   </header>
   {active===0&&<div className="v2-practice-panel">
    <div className="v2-practice-score"><span>Раунд <b>{treasure.round}</b></span>
      <span>Очки тренировки <b>{treasure.points}</b></span></div>
    <p className="v2-hall-hint">Выбери один из трёх сундуков. Это бесплатная симуляция без билетов и реальных предметов.</p>
    <div className="v2-hall-chests" role="group" aria-label="Сундуки">
     {Array.from({length:3},(_,i)=><button key={i} type="button"
       className={'v2-hall-chest'+(treasure.opened===i?' opened':'')}
       disabled={treasure.opened!==null}
       onClick={()=>setTreasure(t=>openPracticeChest(t,i,Math.random()))}
       aria-label={'Сундук '+(i+1)+(treasure.opened===i?', открыт':'')}>
       <img src={asset('art/icons/treasure.svg')} alt=""/>
       <b>{treasure.opened===i?'Открыт':'Сундук '+(i+1)}</b>
       {treasure.opened===i&&<span>{treasure.result}</span>}
      </button>)}
    </div>
    {treasure.opened!==null&&<div className="v2-hall-result" role="status">
       {treasure.result} · тренировочные очки начислены
     </div>}
    <button className="v2-hall-primary" type="button" disabled={treasure.opened===null}
       onClick={()=>setTreasure(nextPracticeChest)}>Следующий сундук <span>›</span></button>
    <button className="v2-hall-secondary" type="button" onClick={()=>setTreasure(createTreasurePractice())}>Сбросить тренировку</button>
    <PracticeHistory rows={treasure.history}/>
   </div>}

   {active===1&&<div className="v2-practice-panel">
    <div className="v2-practice-score"><span>Круг <b>{monopoly.lap}/3</b></span>
      <span>Очки <b>{monopoly.score}</b></span><span>Ходы <b>{monopoly.turn}</b></span></div>
    <div className="v2-monopoly-board" aria-label="Поле Монополии: 20 клеток">
     {V2_MONOPOLY_TILES.map((tile,i)=>{
      const [r,c]=mapSpot(i);
      return <div key={i} className={'v2-monopoly-tile v2-monopoly-'+tile.kind+
       (monopoly.position===i?' occupied':'')}
       style={{gridRow:r,gridColumn:c}} title={tile.name+' · '+tile.points}>
       <small>{i+1}</small><span>{tile.name}</span>
       {monopoly.position===i&&<b aria-label="Герой на клетке">⚔</b>}
      </div>;
     })}
     <div className="v2-monopoly-center"><img src={asset('art/icons/board.svg')} alt=""/>
      <strong>ТЕРРИТОРИЯ</strong><span>Поход ярла</span>
      <div className="v2-monopoly-dice" aria-live="polite">{monopoly.lastDie??'⚄'}</div>
     </div>
    </div>
    <div className="v2-hall-result" role="status">{monopoly.message}</div>
    <button className="v2-hall-primary" type="button" disabled={monopoly.finished}
      onClick={()=>setMonopoly(m=>rollPracticeDice(m,Math.random()))}>
       {monopoly.finished?'Поход завершён':'🎲 Бросить кубик'}
    </button>
    <button className="v2-hall-secondary" type="button" onClick={()=>setMonopoly(createMonopolyPractice())}>
      Начать новый поход
    </button>
    <PracticeHistory rows={monopoly.history}/>
   </div>}

   {active===2&&<div className="v2-practice-panel">
    <div className="v2-practice-score"><span>Прокрутки <b>{runes.spin}</b></span>
      <span>Очки <b>{runes.points}</b></span><span>Линии <b>{runes.winningLines.length}/9</b></span></div>
    <div className="v2-reel-grid" role="img" aria-label="Пять барабанов по три символа">
     {Array.from({length:5},(_,column)=><div key={column} className="v2-reel-column">
      {Array.from({length:3},(_,row)=>{
       const symbol=runes.grid[column]?.[row]??'ᚱ';
       return <div key={row} className={'v2-reel-symbol'+(symbol==='W'?' wild':symbol==='✦'?' scatter':'')}
         style={{color:glyph[symbol]}}>{symbol}</div>;
      })}
     </div>)}
    </div>
    <div className="v2-hall-paylines">
     <span>W = WILD</span><span>✦✦✦ = бонус</span><span>9 линий</span>
    </div>
    <div className="v2-hall-result" role="status">{runes.message}</div>
    <button className="v2-hall-primary" disabled={remainingAutospins>0}
      type="button" onClick={()=>setRunes(r=>spinPracticeRunes(r,rollSet()))}>ᚱ Прокрутить бесплатно</button>
    <div className="v2-hall-action-row">
     <button type="button" className="v2-hall-secondary" onClick={()=>setAutospins(n=>n>0?0:10)}>
      {remainingAutospins>0?'Остановить авто · '+remainingAutospins:'Авто ×10'}
     </button>
     <button type="button" className="v2-hall-secondary"
       disabled={!runes.lastPoints||runes.doubled||remainingAutospins>0}
       onClick={()=>setRunes(r=>doublePracticeWin(r,Math.random()>=.5))}>
      Удвоить очки
     </button>
    </div>
    <button className="v2-hall-secondary" type="button" onClick={()=>{setAutospins(0);setRunes(createRunePractice())}}>
      Сбросить тренировку
    </button>
    <PracticeHistory rows={runes.history}/>
   </div>}

   {active>2&&<div className="v2-practice-panel v2-hall-future">
    <img src={asset(game.image)} alt=""/>
    <strong>Режим ещё не утверждён</strong>
    <p>По ТЗ у игрового зала пять мест, но названия и механики последних двух игр пока не согласованы. Придумывать их вместо владельца нельзя.</p>
   </div>}
  </div>
  <div className="v2-hall-disclaimer">Только автономная тренировка TERRITORY 2.0. Очки не являются золотом, алмазами, билетами или наградами. Цены, RTP и реальные выплаты не заданы.</div>
 </section>;
}
function PracticeHistory({rows}:Readonly<{rows:readonly string[]}>){
 return <div className="v2-hall-history">
  <strong>История ходов</strong>
  {rows.length===0?<span>Первая попытка ещё впереди</span>:
   [...rows].reverse().map((line,i)=><span key={i}>{line}</span>)}
 </div>;
}
