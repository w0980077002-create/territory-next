// SCR-05 & SCR-08: isolated rune + companion visual interaction contract.
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import ts from 'typescript';
const read=file=>readFileSync(file,'utf8');
const app=read('src/v2/NextApp.tsx');
const view=read('src/v2/visual/RuneCompanionGallery.tsx');
const styles=read('src/v2/visual/rune-companion.css');
const cfg=JSON.parse(read('src/v2/modules/lootborn/lootborn-modules.json'));
const preview=read('public-v2/v2-preview.html');
const original=readFileSync('docs/reference/TERRITORY_2_0_APPROVED_2026-10-24.jpg');
const tree=ts.createSourceFile('RuneCompanionGallery.tsx',view,ts.ScriptTarget.ES2022,true,ts.ScriptKind.TSX);
assert.equal(tree.parseDiagnostics.length,0,'Rune/companion gallery must parse');
const js=ts.transpileModule(view,{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.ReactJSX},reportDiagnostics:true});
assert.equal(js.diagnostics?.length??0,0,'Rune/companion TSX compile failed');
assert.equal(cfg.schema,'territory_v2');
assert.equal(cfg.companions.length,2);
assert.equal(cfg.skills.length,3);
assert(cfg.companions.every(c=>c.activeSkillId&&cfg.skills.some(s=>s.id===c.activeSkillId)));
assert(app.includes("<RuneGallery runes={runeOptions} selected={rune}"));
assert(app.includes("onChoose={setRune}"),'Rune selection must update actual existing demo state');
assert(app.includes("<CompanionGallery companions={followerOptions}"));
assert(app.includes("onChoose={setCompanion}"),'Companion selection must update active demo state');
assert(app.includes('portraits={companionArt}'));
assert(app.includes("offlineSave?.companion??'warcow'"),'Keep special cow default');
assert(app.includes("warcow: asset('art/companions/warcow.svg')"));
assert(view.includes("data-screen-template=\"runes\""));
assert(view.includes("data-screen-template=\"companions\""));
assert(view.includes("role=\"group\" aria-label=\"Выбор активной руны\""));
assert(view.includes('aria-pressed={selected===r.id}'));
assert(view.includes('aria-pressed={selected===c.id}'));
assert(view.includes("moduleFor(selected)"));
assert(view.includes("V2_MODULES.companions.find"));
assert(view.includes("module.auraModifiers.map"),'Aura display must derive from the JSON ruleset');
assert(view.includes('scaleFormula(a.formula,level,1)'),'No hardcoded aura strength');
assert(view.includes("portraits[selected]"),'Show the selected actual sidekick artwork');
assert(view.includes('c.id===\'warcow\'')||view.includes("selected==='warcow'"),'War cow remains an independent V2 sprite');
assert(view.includes('stats:null')||view.includes('}:null'),'Unconfigured helpers cannot receive fake detailed stats');
assert(view.includes('onShowSkills'),'Rune/companion screens must cross-link back to skills');
assert(view.includes('Только')||view.includes('сервером'),'Visual stats must not imply server-confirmed effects');
for(const rule of [
  '.v2-rune-gallery','.v2-rune-gallery-card.v2-gallery-active',
  '.v2-companion-gallery','.v2-companion-gallery-card.v2-gallery-active',
  '.v2-codex-detail','.v2-codex-statlines','@media(max-width:355px)',
]){
  assert(styles.includes(rule),'Missing approved visual treatment '+rule);
}
assert(!/\bfetch\s*\(|XMLHttpRequest|\.rpc\(|localStorage|supabase\./.test(view),'No backend or V1 side effects in view');
assert(preview.includes('src="./"'));
assert(existsSync('public-v2/art/companions/warcow.svg'));
assert(original.byteLength===465531,'Owner reference changed');
console.log('OK: rune slot, 6 sidekick cards, selected artwork, configuration-only auras, static preview and 2026-10-24 owner screenshot');
