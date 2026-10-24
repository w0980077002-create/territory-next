// The /v2-preview.html route hosts the same isolated React UI as index.html.
// This replaces the older, non-interactive static mockup while preserving the
// original 2026-10-24 screenshot and all V1/production safety boundaries.
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
const read=path=>readFileSync(path,'utf8');
const html=read('public/v2-preview.html');
const main=read('src/v2/main.tsx');
const app=read('src/v2/NextApp.tsx');
const style=read('src/v2/visual/reference-templates.css');
const modules=read('src/v2/visual/LootbornTemplates.tsx');
const config=JSON.parse(read('src/v2/modules/lootborn/lootborn-modules.json'));
const manager=read('src/v2/SkillManager.ts');
const nav=read('src/v2/interfaceContract.ts');
const index=read('index.html');
const archivedJS=read('public/v2-preview.js');
assert.match(html,/<iframe[^>]*class="v2-preview-frame"[\s\S]*?src="\.\/"/,
 'Preview must embed built React entrypoint at relative path, including GitHub Pages base');
assert(!html.includes('src="./v2-preview.js"'),'Stale static mockup must not execute');
assert(!html.includes('href="./v2-preview.css"'),'Stale static mockup must not style the React HUD');
assert(!/https:\/\/[^"']+/.test(html),'Preview must never load remote code');
assert(index.includes('/src/v2/main.tsx'));
assert(main.includes("from './NextApp'"));
assert(app.includes("import './visual/reference-templates.css'"));
assert(app.includes('LootbornSkillsTemplate')&&app.includes('RuneGallery')&&app.includes('CompanionGallery'));
assert(app.includes('data-layout="two-row-gear"'));
assert(app.includes('data-layout="five-button-fixed"'));
assert(app.includes('v2-orb-percent')&&app.includes('heroHpPct')&&app.includes('energyPct'));
assert(app.includes('aria-modal="false"'),'Drawer must allow persistent bottom navigation');
assert(modules.includes('aria-expanded={inspectedId===skill.id}'),'Skill cards must expand in-place');
assert(modules.includes('v2-module-inspector'),'Skill details must come directly from V2 module config');
assert(modules.includes('getPortrait(companion.selectorAlias)'),'Companion should use existing approved sprites');
assert(style.includes('.v2-shell .v2-mask{bottom:var(--v2-preview-nav-height);z-index:50}'),'Backdrop must not block footer');
assert(style.includes('.v2-shell .v2-bottom{z-index:60}'),'Bottom navigation must stay clickable above drawer');
assert(style.includes('max-height:650px'),'Short screen drawer/footer contract missing');
assert(modules.includes("from '../SkillManager'"),'UI must use validated single-source JSON library');
assert(manager.includes("from './modules/lootborn/lootborn-modules.json'"));
assert.equal(config.schema,'territory_v2');
assert.equal(config.skills.length,3);
assert.equal(config.companions.length,2);
assert.equal(config.limits.maxActiveCompanions,1);
assert(style.includes('grid-template-rows:repeat(2,minmax(0,1fr))'));
assert(style.includes('grid-template-columns:1fr 1fr 1.25fr 1fr 1fr'));
assert(style.includes('.v2-shell .v2-orb{overflow:hidden}'),'Orb filling must not leak outside round spheres');
for(const id of ["port","skills","expedition","adventure","shop"])
 assert(nav.includes("id: '"+id+"'"),'Missing accepted navigation destination '+id);
assert(existsSync('docs/reference/TERRITORY_2_0_APPROVED_2026-10-24.jpg'));
execFileSync(process.execPath,['--check','public/v2-preview.js'],{stdio:'pipe'});
assert(!/fetch\s*\(|XMLHttpRequest|sendBeacon|supabase\./.test(archivedJS));
assert(!/import.*\/game\//.test(main+app+modules),'V1 runtime leaked into preview');
console.log('OK: screenshot-aligned V2 React iframe preview, data-driven templates, 2 spheres, 2 rows, 5-button navigation');
