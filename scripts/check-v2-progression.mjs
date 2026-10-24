import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
const code=readFileSync('src/v2/core/progression.ts','utf8');
const executable=code.replace(/\/\*[\s\S]*?\*\//g,'').replace(/^\s*\/\/.*$/gm,'');
assert(!/\bfetch\s*\(|\bsupabase\b|saveCloudSave|localStorage|walletVersion|XMLHttpRequest/.test(executable),
  'all demo progression operations must be pure and offline');
const compiled=ts.transpileModule(code,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022},reportDiagnostics:true});
assert.equal(compiled.diagnostics?.length ?? 0,0);
const module={exports:{}};
vm.runInNewContext(compiled.outputText,{exports:module.exports,module,console});
const {
  createV2DemoProgress,makeV2Item,applyV2DemoVictory,applyV2Xp,
  equipV2Item,unequipV2Item,salvageV2Item,upgradeV2Equipped,
  nextXp,statsFromV2Progress,V2_GEAR_SLOTS,V2_ITEM_LIMIT,
  sortV2Inventory,v2UpgradeQuote,itemScore,
}=module.exports;
let initial=createV2DemoProgress();
assert.equal(Object.keys(initial.equipped).length,7);
assert.equal(initial.level,12);
assert.equal(initial.inventory.length,0);
assert.equal(initial.receipts.length,0);
assert.equal(V2_GEAR_SLOTS.length,7);
for(const slot of V2_GEAR_SLOTS){
  assert.equal(initial.equipped[slot].slot,slot);
  assert(initial.equipped[slot].stats.attack>=0);
  assert(initial.equipped[slot].stats.defense>=0);
  assert(initial.equipped[slot].stats.hp>=0);
}
assert(statsFromV2Progress(initial).attack>0);
assert(nextXp(20)>nextXp(10));
assert.equal(applyV2Xp({...initial,level:300},1e8).level,300);

// Idempotence: StrictMode, duplicate requests or repeated animations
const once=applyV2DemoVictory(initial,'round:6:1',6,1,.1);
assert.equal(once.wins,1);
assert.equal(once.gold-initial.gold,50+6*27);
assert.equal(once.inventory.length,1);
assert.strictEqual(applyV2DemoVictory(once,'round:6:1',6,1,.1),once);
assert.strictEqual(applyV2DemoVictory(once,'',6,1,.1),once);
// a boss is guaranteed to drop something when there is space
const boss=applyV2DemoVictory(once,'round:6:5',6,5,.82);
assert.equal(boss.bosses,1);
assert(boss.latestLoot.item);
assert.equal(boss.latestLoot.wave,5);
assert(boss.latestLoot.xp>once.latestLoot.xp);

// Loot is independent from equipped items until the player explicitly equips
assert.equal(boss.equipped[boss.latestLoot.item.slot].id,
             initial.equipped[boss.latestLoot.item.slot].id);
const id=boss.latestLoot.item.id;
const withEquipped=equipV2Item(boss,id);
assert.equal(withEquipped.equipped[boss.latestLoot.item.slot].id,id);
assert.equal(withEquipped.inventory.length,boss.inventory.length);
assert(withEquipped.inventory.some(x=>x.id===initial.equipped[boss.latestLoot.item.slot].id));
assert.strictEqual(equipV2Item(withEquipped,id),withEquipped);
const equippedSlot=boss.latestLoot.item.slot;
const quoted=v2UpgradeQuote(withEquipped.equipped[equippedSlot]);
assert(quoted.gold>0&&quoted.materials>0);
const augmented={...withEquipped,gold:999999,materials:9999};
const upgraded=upgradeV2Equipped(augmented,equippedSlot);
assert.equal(upgraded.equipped[equippedSlot].upgrade,1);
assert(upgraded.gold<augmented.gold&&upgraded.materials<augmented.materials);
assert(itemScore(upgraded.equipped[equippedSlot])>itemScore(augmented.equipped[equippedSlot]));
assert.strictEqual(upgradeV2Equipped({...augmented,gold:0},equippedSlot).gold,0);
assert.strictEqual(upgradeV2Equipped({...augmented,materials:0},equippedSlot).materials,0);
const old=withEquipped.inventory.find(x=>x.id.startsWith('starter-'));
const salvaged=salvageV2Item(withEquipped,old.id);
assert.equal(salvaged.inventory.length,withEquipped.inventory.length-1);
assert(salvaged.materials>withEquipped.materials);
assert.strictEqual(salvageV2Item(salvaged,old.id),salvaged);
const unequipped=unequipV2Item(withEquipped,equippedSlot);
assert.equal(unequipped.equipped[equippedSlot],undefined);
assert.equal(unequipped.inventory.length,withEquipped.inventory.length+1);
assert.equal(sortV2Inventory(boss.inventory).length,boss.inventory.length);

// Repeated sessions must never create duplicate IDs, overflow inventory,
// produce negative currencies, or grant rewards for the same receipt twice.
let state=initial;
for(let i=1;i<=300;i++){
 const prev=state;
 const wave=i%5+1;
 const receipt='simulation:'+i;
 state=applyV2DemoVictory(state,receipt,5+Math.floor(i/5),wave,((i*139)%997)/997);
 assert.equal(state.wins,prev.wins+1);
 assert.strictEqual(applyV2DemoVictory(state,receipt,10,wave,.12),state);
 assert(state.gold>=prev.gold&&state.materials>=prev.materials);
 assert(state.inventory.length<=V2_ITEM_LIMIT);
 assert(state.level>=prev.level && state.level<=300);
 assert.equal(new Set(state.inventory.map(x=>x.id)).size,state.inventory.length);
 const equippedList=Object.values(state.equipped);
 const ids=[...state.inventory,...equippedList].map(x=>x.id);
 assert.equal(new Set(ids).size,ids.length);
}
assert(state.inventory.length<=90);
assert(state.receipts.length===300);
for(const rarity of ['common','rare','epic','legendary']){
 for(const slot of V2_GEAR_SLOTS){
  const item=makeV2Item(rarity+slot,slot,rarity,22,25);
  assert.equal(v2UpgradeQuote(item),null);
  assert(itemScore(item)>=0);
 }
}
console.log('TERRITORY V2 progression: 300 receipts, duplicates blocked, 7 slots, equip/upgrade/salvage, inventory cap OK');
