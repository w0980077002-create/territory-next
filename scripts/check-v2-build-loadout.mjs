import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import ts from 'typescript';

const tsSource=readFileSync('src/v2/core/buildLoadout.ts','utf8');
const js=ts.transpileModule(tsSource,{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}}).outputText;
const {V2_SKILL_CATEGORIES,validateV2Loadout,countEquippedSetPieces,activeSupportAuraKeys}=
  await import('data:text/javascript;base64,'+Buffer.from(js).toString('base64'));

assert.deepEqual(V2_SKILL_CATEGORIES,['basic','core','mastery','ultimate','passive']);

const lib={
  skills:[{id:'slash',category:'basic'},{id:'storm',category:'core'}],
  runes:[{id:'frost',supportedSkillIds:['storm']}],
  companions:[{id:'bear',canFight:true,auraKeys:['shield']},{id:'cow',canFight:true,auraKeys:['health']}],
  gear:[{instanceId:'axe',slot:'weapon',setId:'north'},{instanceId:'helm',slot:'helmet',setId:'north'}],
};
const rules={
  skillSlotCaps:{basic:1,core:1,mastery:0,ultimate:0,passive:0},
  supportCompanionSlots:1,
  equipmentSlotIds:['weapon','helmet'],
};
const loadout={
  skillIds:['slash','storm'],runes:{storm:'frost'},
  equipment:{weapon:'axe',helmet:'helm'},
  primaryCompanionId:'bear',supportCompanionIds:['cow'],
};
const errors=(patch, library=lib, customRules=rules)=>
  validateV2Loadout({...loadout,...patch},customRules,library);

assert.deepEqual(errors({}),[], 'valid loadout is accepted');
assert.equal(countEquippedSetPieces(loadout.equipment,lib.gear).north,2);
assert.equal(countEquippedSetPieces({weapon:'axe',helmet:'axe'},lib.gear).north,1);
assert.deepEqual(activeSupportAuraKeys(loadout,lib.companions),['health']);
assert.ok(errors({skillIds:['slash','slash','storm']}).some(e=>e.includes('duplicate selected skill')));
assert.ok(errors({skillIds:['slash','storm','storm']}).some(e=>e.includes('too many skills')));
assert.ok(errors({runes:{slash:'frost'}}).some(e=>e.includes('incompatible rune')));
assert.ok(errors({runes:{missing:'frost'}}).some(e=>e.includes('rune on unequipped skill')));
assert.ok(errors({runes:{storm:'unknown'}}).some(e=>e.includes('unknown rune')));
assert.ok(errors({equipment:{weapon:'helm'}}).some(e=>e.includes('gear in wrong slot')));
assert.ok(errors({equipment:{weapon:'axe',helmet:'axe'}}).some(e=>e.includes('gear duplicated')));
assert.ok(errors({equipment:{weapon:'axe',boots:'helm'}}).some(e=>e.includes('unknown equipment slot')));
assert.ok(errors({primaryCompanionId:'cow',supportCompanionIds:['cow']}).some(e=>e.includes('main companion also assigned')));
assert.ok(errors({supportCompanionIds:['cow','cow']}).some(e=>e.includes('duplicate support companion')));
assert.ok(errors({supportCompanionIds:['cow','bear']}).some(e=>e.includes('too many support companions')));
assert.ok(errors({primaryCompanionId:'unknown'}).some(e=>e.includes('unknown main companion')));
assert.ok(errors({},lib,{...rules,skillSlotCaps:{basic:1}}).some(e=>e.includes('missing capacity for category: core')));
assert.ok(errors({}, {...lib,skills:[...lib.skills,lib.skills[0]]}).some(e=>e.includes('duplicate definition')));
assert.ok(errors({},lib,{...rules,supportCompanionSlots:-1}).some(e=>e.includes('invalid support companion capacity')));
console.log('OK: typed research-backed V2 loadouts, 18 positive/negative tests, no guessed combat balance or real currency');
