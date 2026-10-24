// Gameplay overhaul: 100 pure demo stages, test receipts, shop budgets and V2-only storage.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import ts from 'typescript';
const js=path=>ts.transpileModule(readFileSync(path,'utf8'),{
 compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}
}).outputText;
const url=source=>'data:text/javascript;base64,'+Buffer.from(source).toString('base64');
const progressionURL=url(js('src/v2/core/progression.ts'));
const combatURL=url(js('src/v2/core/autoBattle.ts'));
const campaignSource=js('src/v2/core/gameplayOverhaul.ts')
 .replace(/from ['"]\.\/progression['"]/,"from '"+progressionURL+"'")
 .replace(/from ['"]\.\/autoBattle['"]/,"from '"+combatURL+"'");
const gameURL=url(campaignSource);
const core=await import(gameURL),prog=await import(progressionURL);
const saveSource=js('src/v2/core/stageSave.ts')
 .replace(/from ['"]\.\/gameplayOverhaul['"]/,"from '"+gameURL+"'");
const save=await import(url(saveSource));
assert.equal(core.V2_STAGE_CHAPTERS,5);
assert.equal(core.V2_STAGES_PER_CHAPTER,20);
assert.equal(core.V2_STAGE_MAP.length,100);
for(let i=1;i<=100;i++){
 const stage=core.stageAt(i);
 assert.equal(stage.id,i);
 assert.equal(stage.chapter,Math.ceil(i/20));
 assert.equal(stage.stage,((i-1)%20)+1);
 assert.equal(stage.kind,stage.stage%10===0?'boss':stage.stage%5===0?'elite':'normal');
 const config=core.stageEncounter(i,'berserker');
 assert(config.enemy.hp>0&&config.enemy.attack>0);
 assert.equal(config.boss,stage.kind!=='normal');
}
assert(core.stageEncounter(20,'berserker').enemy.hp>core.stageEncounter(19,'berserker').enemy.hp);
const initial=core.createV2StageCampaign();
assert.equal(initial.currentStage,1);
assert.equal(initial.highestUnlockedStage,1);
assert.strictEqual(core.chooseV2Stage(initial,3),initial);
let campaign=initial,progress=prog.createV2DemoProgress();
const opened=prog.unequipV2Item(progress,'helmet');
assert.equal(opened.equipped.helmet,undefined);
// The same slot can be autofilled only once, and the 90-item inventory cap holds.
progress=opened;
for(let i=1;i<=100;i++){
 assert.equal(campaign.currentStage,i);
 const receipt='v2-demo-encounter-'+i;
 const old=progress;
 const resolution=core.settleV2Stage(campaign,progress,receipt,777,(i*.381)%1);
 assert(resolution.burst);
 assert.equal(resolution.burst.stageId,i);
 const rawDrops=core.stageAt(i).kind==='boss'?3:core.stageAt(i).kind==='elite'?2:1;
 assert(resolution.burst.items.length<=rawDrops,'Inventory limit must cap generated loot');
 assert(resolution.burst.items.length>=0);
 assert(resolution.progress.materials>=old.materials,'Overflow loot should convert to materials');
 assert.equal(resolution.campaign.highScores[String(i)],777);
 assert.equal(resolution.campaign.claimedStages.includes(i),true);
 assert.equal(resolution.campaign.highestUnlockedStage,Math.min(100,i+1));
 assert.equal(resolution.progress.wins,old.wins+1);
 assert(resolution.progress.gold>old.gold);
 assert(resolution.progress.level>=old.level);
 assert(resolution.progress.inventory.length<=prog.V2_ITEM_LIMIT);
 assert.deepEqual([...resolution.progress.inventory,...Object.values(resolution.progress.equipped)].map(x=>x.id).length,
  new Set([...resolution.progress.inventory,...Object.values(resolution.progress.equipped)].map(x=>x.id)).size);
 assert.equal(resolution.campaign.runes-campaign.runes,core.stageAt(i).kind==='boss'?2:core.stageAt(i).kind==='elite'?1:0);
 const duplicate=core.settleV2Stage(resolution.campaign,resolution.progress,receipt,999,.99);
 assert.equal(duplicate.burst,null,'Duplicate receipt cannot grant again');
 assert.strictEqual(duplicate.progress,resolution.progress);
 ({campaign,progress}=resolution);
}
assert(progress.equipped.helmet,'Open gear slot should be populated by first matching drop');
assert.equal(campaign.highestUnlockedStage,100);
assert.equal(campaign.claimedStages.length,100);
assert.equal(campaign.runes,30,'2 bosses and 2 elites per chapter, 2 runes/boss + 1/elite');
assert.equal(campaign.highScores['100'],777);
const boughtCompanion=core.buyV2Shop(campaign,progress,'companion',.99);
assert.equal(boughtCompanion.success,true);
assert.equal(boughtCompanion.campaign.lastCompanionRoll,'warcow');
assert.equal(boughtCompanion.campaign.companionRolls,campaign.companionRolls+1);
assert.equal(boughtCompanion.progress.gold,progress.gold-core.quoteV2Shop('companion',campaign).gold);
const boughtSkill=core.buyV2Shop(campaign,progress,'skill',.25);
assert.equal(boughtSkill.success,true);
assert.equal(boughtSkill.campaign.skillMultiplier,1);
assert.equal(boughtSkill.campaign.runes,campaign.runes-1);
assert(core.v2BoughtSkillAttackMultiplier(boughtSkill.campaign)>1);
const reset=core.buyV2Shop(boughtSkill.campaign,boughtSkill.progress,'reset');
assert.equal(reset.success,true);
assert.equal(reset.campaign.skillMultiplier,0);
const refused=core.buyV2Shop(campaign,{...progress,gold:0},'companion');
assert.equal(refused.success,false);
assert.strictEqual(refused.progress.gems,progress.gems,'Shop cannot spend diamonds');
assert.equal(core.parseV2StageCampaign({...campaign,runes:1e12}),null);
assert.equal(core.parseV2StageCampaign({...campaign,highestUnlockedStage:1}),null);
assert.equal(core.parseV2StageCampaign({...campaign,claimedStages:[1,1]}),null);
const values=new Map([['territory-v1-user-data','untouched']]);
const storage={
 getItem:key=>values.get(key)??null,
 setItem:(key,value)=>values.set(key,value),
 removeItem:key=>values.delete(key)
};
assert(save.writeV2StageSave(storage,campaign));
assert.equal(save.readV2StageSave(storage).highestUnlockedStage,100);
assert(save.clearV2StageSave(storage));
assert.equal(save.readV2StageSave(storage).currentStage,1);
assert.equal(values.get('territory-v1-user-data'),'untouched');
const app=readFileSync('src/v2/NextApp.tsx','utf8');
assert(app.includes('settleV2Stage(')&&app.includes('<V2LootRain burst={game.burst}/>'));
assert(app.includes('<StageMapExperience')&&app.includes('<OverhaulShopExperience'));
assert(app.includes('clearV2StageSave('));
assert(app.includes('stageEncounter(campaign.currentStage,heroClass)'));
assert(app.includes('buyV2Shop(campaign,progress,kind,'));
assert(app.includes("if(kind==='reset')setDemoSkills(createV2DemoSkillState())"),'Reset must also release allocated demo skill points');
console.log('OK: 5x20 stages, boss/elite mods, loot burst + autoequip, rune/gold shop, 100 clears, safe V2 persistence');
