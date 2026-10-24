import {type V2LootBurst} from '../core/gameplayOverhaul';
import './overhaul-ui.css';
const art=(slot:string)=>import.meta.env.BASE_URL+'item-'+slot+'.webp';
export function V2LootRain({burst}:Readonly<{burst:V2LootBurst|null}>){
 if(!burst)return null;
 return <div className="v2-overhaul-rain" aria-label="Добыча после боя" role="status" key={burst.receiptId}>
    <strong>✦ ДОБЫЧА ✦</strong>
    <span>🪙 +{burst.gold} · XP +{burst.xp}{burst.runes?' · ᚱ +'+burst.runes:''}</span>
    <div className="v2-overhaul-rain-items">
     {burst.items.map((item,i)=><span key={item.id}
       className={'v2-overhaul-loot-icon v2-rarity-'+item.rarity}
       style={{animationDelay:(i*.11)+'s'}}>
       <img src={art(item.slot)} alt={item.name}/>
       {burst.autoequipped.includes(item.id)&&<small>Надето</small>}
     </span>)}
    </div>
 </div>;
}
