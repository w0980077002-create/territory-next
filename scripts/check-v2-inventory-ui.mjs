// Visual hero/warehouse regression against the approved V2 user interface.
// No network, no game economy operations: reads source and validates TSX.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import ts from 'typescript';
const read=p=>readFileSync(p,'utf8');
const jsx=read('src/v2/InventoryExperience.tsx');
const css=read('src/v2/inventory.css');
const app=read('src/v2/NextApp.tsx');
const contract=read('src/v2/interfaceContract.ts');
const tree=ts.createSourceFile('InventoryExperience.tsx',jsx,ts.ScriptTarget.ES2022,true,ts.ScriptKind.TSX);
assert.equal(tree.parseDiagnostics.length,0,'Invalid V2 inventory TSX');
const parsed=ts.transpileModule(jsx,{compilerOptions:{module:ts.ModuleKind.ESNext,
 jsx:ts.JsxEmit.ReactJSX,target:ts.ScriptTarget.ES2022},reportDiagnostics:true});
assert.equal(parsed.diagnostics?.length??0,0,'Cannot compile inventory visual components');
for(const slot of ['helmet','amulet','armor','weapon','shield','ring','boots']){
 assert(jsx.includes("'"+slot+"'"),'One of the seven owner-approved equipment slots is missing: '+slot);
}
assert(jsx.includes('V2_GEAR_SLOTS')&&jsx.includes('progress.equipped[slot]'));
assert(jsx.includes('aria-pressed={selected}'),'Equipped slot must expose selection');
assert(jsx.includes('v2-hero-showcase'),'Hero portrait and stats are required');
assert(jsx.includes('statsFromV2Progress(progress)'),'Live demo stats not placeholders');
assert(jsx.includes('v2-hero-portrait-frame')&&jsx.includes('v2-hero-preview'));
assert(jsx.includes("view==='hero'")&&jsx.includes("view==='warehouse'"));
assert(jsx.includes('onView(id)'),'Hero tabs must work');
assert(jsx.includes("sortOrder==='power'")&&jsx.includes("sortOrder==='level'"));
assert(jsx.includes('rarityIndex[b.rarity]'),'Rarity sorting missing');
assert(jsx.includes("filter==='all'||x.slot===filter"),'Filters must be based on actual item slots');
assert(jsx.includes('progress.inventory.find(x=>x.id===selectedId)'),'Must compare the selected real local item');
assert(jsx.includes('progress.equipped[selected.slot]'),'Compare the correct equipped item');
assert(jsx.includes('selected.stats.attack-(compareEquipped?.stats.attack??0)'));
assert(jsx.includes('selected.stats.defense-(compareEquipped?.stats.defense??0)'));
assert(jsx.includes('selected.stats.hp-(compareEquipped?.stats.hp??0)'));
assert(jsx.includes('selected.stats.critChance-(compareEquipped?.stats.critChance??0)'));
assert(jsx.includes('difference=selected?score(selected)-score(compareEquipped):0'));
assert(!jsx.includes('itemScore(progress.equipped')&&!jsx.includes('balance=999999'),'No invented score or currency');
assert(jsx.includes('pendingSalvage===selected.id'),'Require explicit confirmation before dismantling');
assert(jsx.includes("setPendingSalvage(null)"),'Confirmation must be cancellable');
for(const label of ['НАДЕТО','НАЙДЕНО','Подтвердить разбор','Отмена','Выбери предмет на складе']){
 assert(jsx.includes(label),'Missing meaningful game UI state: '+label);
}
assert(jsx.includes('disabled={!canEquip}')&&jsx.includes('disabled={!canUpgrade}')&&jsx.includes('disabled={!canUnequip}'));
assert(jsx.includes('progress.inventory.length<V2_ITEM_LIMIT'),'Do not drop unequipped items into full inventory');
for(const tag of ['v2-hero-showcase','v2-compare-cols','v2-compare-item','v2-comparison-stats','v2-salvage-confirm']){
 assert(css.includes('.'+tag),'Missing mobile styling for '+tag);
}
assert(css.includes('@media(max-width:360px)'),'Mobile breakpoint missing');
assert(contract.includes("equipmentGrid: 'directlyBelowCombatHud'"));
assert(app.includes('<InventoryExperience')&&app.includes('onSalvage=')&&app.includes('onUpgrade='));
assert(!/\bfetch\s*\(|\bXMLHttpRequest\b|supabase\.|\.rpc\s*\(/.test(jsx));
console.log('OK: seven equipped slots, fantasy hero card, real two-column item comparison, crit deltas, sort/filter, safe confirmation, narrow phones');
