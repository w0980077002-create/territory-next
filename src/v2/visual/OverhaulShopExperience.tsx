import {quoteV2Shop,V2_MAX_SHOP_SKILL_LEVEL,
 type V2ShopKind,type V2StageCampaign} from '../core/gameplayOverhaul';
import type {V2Progression} from '../core/progression';
import type {CompanionKind} from '../core/autoBattle';
import './overhaul-ui.css';
const cards:readonly {id:V2ShopKind;icon:string;name:string;summary:string}[]=[
 {id:'companion',icon:'🐂',name:'Призыв спутника',summary:'Случайный союзник из коллекции. Увеличивает число призывов.'},
 {id:'skill',icon:'ᚱ',name:'Усиление навыков',summary:'Постоянный локальный множитель атаки +3,5% за уровень.'},
 {id:'reset',icon:'♻',name:'Сброс характеристик',summary:'Сбрасывает распределение очков навыков и купленный бонус атаки, сохраняя предметы.'},
];
export function OverhaulShopExperience({
 campaign,progress,selectedCompanion,onBuy,onViewSkills,onViewCompanions
}:{
 campaign:V2StageCampaign;progress:V2Progression;selectedCompanion:CompanionKind;
 onBuy:(kind:V2ShopKind)=>void;onViewSkills:()=>void;onViewCompanions:()=>void;
}){
 return <section className="v2-overhaul-shop" data-screen="shop">
  <div className="v2-overhaul-title"><div><small>РЫНОК ВИКИНГОВ</small><h3>Игровой магазин</h3></div>
    <span>ДЕМО</span></div>
  <div className="v2-overhaul-wallet">
   <div><small>ЗОЛОТО</small><strong>🪙 {progress.gold.toLocaleString('ru-RU')}</strong></div>
   <div><small>РУНЫ</small><strong>ᚱ {campaign.runes}</strong></div>
  </div>
  <div className="v2-overhaul-shop-list">{cards.map(card=>{
   const quote=quoteV2Shop(card.id,campaign);
   const maxed=card.id==='skill'&&campaign.skillMultiplier>=V2_MAX_SHOP_SKILL_LEVEL;
   const noReset=card.id==='reset'&&campaign.skillMultiplier===0;
   const affordable=progress.gold>=quote.gold&&campaign.runes>=quote.runes&&!maxed&&!noReset;
   return <article className="v2-overhaul-shop-card" key={card.id} data-offer={card.id}>
    <span className="v2-overhaul-shop-art" aria-hidden="true">{card.icon}</span>
    <div className="v2-overhaul-shop-text"><strong>{card.name}</strong><p>{card.summary}</p>
      {card.id==='skill'&&<small>Усиление {campaign.skillMultiplier}/{V2_MAX_SHOP_SKILL_LEVEL}</small>}
      {card.id==='companion'&&<small>Призывов: {campaign.companionRolls}</small>}
      {card.id==='reset'&&<small>Перераспределение навыков</small>}
    </div>
    <button type="button" disabled={!affordable} onClick={()=>onBuy(card.id)}
     aria-label={'Купить: '+card.name}>{maxed?'МАКС':noReset?'Нет улучшений':
      <>Купить<br/>🪙 {quote.gold}{quote.runes>0?' · ᚱ '+quote.runes:''}</>}</button>
   </article>;
  })}</div>
  <div className="v2-overhaul-shop-result" aria-live="polite">
    <strong>Сейчас в отряде:</strong> {selectedCompanion}
    {campaign.lastCompanionRoll&&<div>Последний призыв: {campaign.lastCompanionRoll}</div>}
  </div>
  <div className="v2-overhaul-shop-links">
   <button type="button" onClick={onViewSkills}>ᚱ Мои навыки →</button>
   <button type="button" onClick={onViewCompanions}>🐂 Спутники →</button>
  </div>
  <p className="v2-overhaul-note">Магазин работает с локальными тестовыми монетами. Реальные платежи, серверные начисления и Telegram не подключены.</p>
 </section>;
}
