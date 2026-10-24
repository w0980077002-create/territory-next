import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import ts from 'typescript';

const code=readFileSync('src/v2/core/previewBuilds.ts','utf8');
const js=ts.transpileModule(code,{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}}).outputText;
const m=await import('data:text/javascript;base64,'+Buffer.from(js).toString('base64'));

assert.throws(()=>m.createDemoBuildSlots(0),RangeError);
assert.throws(()=>m.createDemoBuildSlots(100),RangeError);
const init=m.createDemoBuildSlots(3);
assert.equal(init.length,3);
assert.equal(m.loadDemoBuildSlot(init,1),null);
const v={heroClass:'berserker',rune:'frost',companion:'warcow'};
const p=m.saveDemoBuildSlot(init,2,v);
assert.equal(init[1].build,null,'state mutated');
assert.deepEqual(m.loadDemoBuildSlot(p,2),v);
assert.equal(m.loadDemoBuildSlot(p,1),null);
const newer=m.saveDemoBuildSlot(p,2,{...v,rune:'thunder'});
assert.deepEqual(m.loadDemoBuildSlot(newer,2),{...v,rune:'thunder'});
assert.deepEqual(m.loadDemoBuildSlot(p,2),v,'old slot state should be unchanged');
assert.strictEqual(m.saveDemoBuildSlot(p,9,v),p);
assert.strictEqual(m.saveDemoBuildSlot(p,2,{...v,rune:'fake'}),p);
assert.equal(m.loadDemoBuildSlot([{slot:1,build:{...v,companion:'invalid'}}],1),null);
for(const heroClass of ['berserker','runemage','ranger'])
 for(const rune of ['flame','frost','thunder','guardian'])
  for(const companion of ['guardian','warrior','healer','hunter','mage','warcow'])
   assert.equal(m.validDemoBuild({heroClass,rune,companion}),true);
assert(!/fetch\s*\(|supabase|localStorage|sessionStorage|grantGold/.test(code.replace(/\/\*[\s\S]*?\*\//g,'')),'preset module must not mutate player economy or storage');
const app=readFileSync('src/v2/NextApp.tsx','utf8');
assert(app.includes('saveDemoBuildSlot') && app.includes('loadDemoBuildSlot'));
assert(app.includes('setHeroClass(selected.heroClass)'));
assert(app.includes('setRune(selected.rune)'));
assert(app.includes('setCompanion(selected.companion)'));
console.log('OK: 3 isolated session-only loadout presets, 72 valid combinations, no wallet writes');
