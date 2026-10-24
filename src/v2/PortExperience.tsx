import {useEffect,useState} from 'react';
import {
  V2_DEMO_MINING_DURATION_MS,V2_DEMO_RESOURCES,
  V2_DEMO_PROFESSION_LEVEL_CAP,V2_DEMO_PROFESSION_UNLOCK_BLUE_GEMS,
  v2DemoMiningSecondsLeft,type V2DemoResource,type V2DemoMiningState,
} from './core/demoPort';
import './portExperience.css';

const timeFormat=(seconds:number)=>{
  const h=Math.floor(seconds/3600);
  const m=Math.floor((seconds%3600)/60);
  const s=seconds%60;
  return [h,m,s].map(n=>String(n).padStart(2,'0')).join(':');
};
export function PortExperience({
  mode,state,blueGems,onBegin,onClaim,onCancel,onWarehouse,onProfessions,
}:{
  mode:'port'|'professions';state:V2DemoMiningState;blueGems:number;
  onBegin:(resource:V2DemoResource)=>void;onClaim:()=>void;
  onCancel:()=>void;onWarehouse:()=>void;onProfessions:()=>void;
}){
  const [selected,setSelected]=useState<V2DemoResource>('ore');
  const [now,setNow]=useState(()=>Date.now());
  useEffect(()=>{
    const timer=window.setInterval(()=>setNow(Date.now()),1000);
    return ()=>window.clearInterval(timer);
  },[]);
  const resource=V2_DEMO_RESOURCES.find(x=>x.id===state.job?.resource);
  const remaining=v2DemoMiningSecondsLeft(state,now);
  const done=!!state.job&&remaining===0;
  const unlockedPreview=blueGems>=V2_DEMO_PROFESSION_UNLOCK_BLUE_GEMS;
  return <div className="v2-port-experience">
    <section className="v2-port-hero">
      <span className="v2-port-sea-crest" aria-hidden="true">⚓</span>
      <div>
        <strong>{mode==='port'?'Северная гавань':'Мастерство и ремёсла'}</strong>
        <small>Мастерские, шахты и корабли TERRITORY</small>
      </div>
    </section>

    <div className="v2-port-stat-grid">
      <div><small>Добыча</small><strong>{state.job?(done?'Готова':'Идёт'):'Свободна'}</strong></div>
      <div><small>Продолжительность</small><strong>4 часа</strong></div>
      <div><small>Завершено</small><strong>{state.claimedJobs.length}</strong></div>
    </div>
    <section className="v2-port-pane" aria-label="Добыча ресурсов">
      <h3><span>⛏</span> Добыча ресурсов</h3>
      <p>Одновременно работает только одна добыча. Готовый результат можно забрать после четырёх часов.</p>
      {state.job?<>
        <div className="v2-port-active-job">
          <span>{resource?.icon??'⛏'}</span>
          <div>
            <strong>{resource?.label??'Ресурс'}</strong>
            <small>{done?'Добыча завершена':'Осталось времени'}</small>
            <b aria-live="off">{done?'Готово к получению':timeFormat(remaining)}</b>
          </div>
        </div>
        <div className="v2-port-progress" role="progressbar" aria-label="Ход добычи" aria-valuemin={0} aria-valuemax={100}
          aria-valuenow={Math.max(0,Math.min(100,Math.floor((1-remaining*1000/V2_DEMO_MINING_DURATION_MS)*100)))}>
          <span style={{width:Math.max(0,Math.min(100,100*(1-remaining*1000/V2_DEMO_MINING_DURATION_MS)))+'%'}}/>
        </div>
        <div className="v2-port-actions">
          {done
            ?<button className="v2-port-primary" type="button" onClick={onClaim}>✓ Завершить добычу</button>
            :<button className="v2-port-secondary" type="button" onClick={onCancel}>Отменить добычу</button>}
        </div>
      </>:<>
        <div className="v2-port-choices" role="group" aria-label="Выбор ресурса">
          {V2_DEMO_RESOURCES.map(x=><button type="button" className={selected===x.id?'selected':''}
            onClick={()=>setSelected(x.id)} aria-pressed={selected===x.id} key={x.id}>
            <b aria-hidden="true">{x.icon}</b><strong>{x.label}</strong><small>{x.description}</small>
          </button>)}
        </div>
        <button className="v2-port-primary" type="button" onClick={()=>onBegin(selected)}>
          ⚒ Начать добычу · 4 часа
        </button>
      </>}
      <small className="v2-port-caution">Тестовый таймер хранится только на этом устройстве. Завершение не добавляет реальных материалов или валюты.</small>
    </section>

    <section className="v2-port-pane" aria-label="Профессии">
      <h3><span>⚒</span> Профессии</h3>
      <p>Утверждённые правила TERRITORY: одна добыча, развитие профессии до {V2_DEMO_PROFESSION_LEVEL_CAP}-го уровня, лицензия мастера после достижения предела.</p>
      <div className="v2-port-requirement">
        <span>🔷 Открытие профессии</span>
        <strong>{V2_DEMO_PROFESSION_UNLOCK_BLUE_GEMS.toLocaleString('ru-RU')} синих алмазов</strong>
      </div>
      <div className="v2-port-requirement">
        <span>Баланс демоверсии</span><strong>{blueGems.toLocaleString('ru-RU')} 🔷</strong>
      </div>
      <div className="v2-port-status">
        {unlockedPreview?'Стоимость доступна в демобалансе; реальная покупка пока отключена':
          'Недостаточно алмазов для открытия. Списание недоступно в деморежиме.'}
      </div>
      {mode==='port'&&<button type="button" className="v2-port-secondary" onClick={onProfessions}>Открыть мастерские</button>}
    </section>

    {mode==='port'&&<section className="v2-port-pane" aria-label="Корабельные экспедиции">
      <h3><span>⛵</span> Корабельные экспедиции</h3>
      <div className="v2-port-ships">
        <div className="v2-port-ship-icon" aria-hidden="true">⛵</div>
        <div><strong>Плавания и торговые маршруты</strong><small>Выбор корабля, отправка, возвращение и однократное получение груза.</small></div>
      </div>
      <div className="v2-port-status">Отправка кораблей станет доступна после подключения отдельного серверного расписания. Время и прибыль не выдумываются.</div>
      <button className="v2-port-secondary" type="button" onClick={onWarehouse}>Посмотреть склад</button>
    </section>}
    <p className="v2-port-footer">Демонстрация правил. Профессии, лицензии мастера, добыча и груз будут начисляться только проверенным сервером TERRITORY 2.0.</p>
  </div>;
}
