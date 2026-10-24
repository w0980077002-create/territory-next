import assert from 'node:assert/strict';
import {existsSync,readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';

const read=file=>readFileSync(file,'utf8');
const app=read('src/v2/NextApp.tsx');
const contract=read('src/v2/interfaceContract.ts');
const stages=read('src/v2/visual/StageMapExperience.tsx');
const features=read('src/v2/visual/FeaturePanelExperience.tsx');
const css=read('src/v2/visual/inner-panels.css');
const approved=readFileSync('docs/reference/TERRITORY_2_0_APPROVED_2026-10-24.jpg');
assert.equal(createHash('sha256').update(approved).digest('hex'),
  'ab4201e4d5b168d9941b287329c097ec217bd6510af503e421a957132924384c');

assert(app.includes('<FeaturePanelExperience mode={overlay as FeaturePanelId}'));
assert(app.includes('<StageMapExperience state={campaign}'));
assert(app.includes('V2_BOTTOM_NAV.map(')&&app.includes('V2_LEFT_SHORTCUTS.map(')&&app.includes('V2_RIGHT_SHORTCUTS.map('));
assert(app.includes('menuTileArt[id]'),'No emoji-only inner menu');
assert(!app.includes('Здесь будет их обновлённый интерфейс после интеграции'));
for(const mode of ['mail','trials','arena','friends','invitation','socialRewards',
    'specialMarket','welcomeBundle','seaBundle','clan']) {
 assert(features.includes("'"+mode+"'"),'Missing isolated interactive panel: '+mode);
}
for(const s of ['v2-route-chapter-tabs','v2-route-banner','v2-route-trail',
 'v2-route-current','v2-mail-list','v2-inner-parchment',
 'v2-boss-feature','v2-inner-tabs','v2-arena-preview'])assert(css.includes('.'+s),'Missing themed CSS: '+s);
assert(stages.includes('V2_STAGE_MAP.slice(')&&stages.includes('V2_STAGE_CHAPTERS'));
assert(stages.includes('disabled={!available}')&&stages.includes('stage.id<=state.highestUnlockedStage'));
assert(stages.includes('aria-selected={viewingChapter===chapter}'));
assert(stages.includes('state.highScores[String(active.id)]'));
assert(stages.includes('onSelect(stage.id)')&&stages.includes('onFight'));
assert(features.includes('setReadMail')&&features.includes('setMarkedMail'));
assert(features.includes('onNavigate(\'adventure\')'));
assert(!features.includes('Math.random(')&&!features.includes('fetch('));
assert(!features.includes('supabase-js')&&!features.includes('localStorage')&&!features.includes('service_role'));
assert(features.includes('Никакие предметы, VIP и валюты не выдаются'));
for(const filename of ['public-v2/art/icons/mail.svg','public-v2/art/icons/trials.svg','public-v2/art/icons/clan.svg',
 'public-v2/art/bosses/northern_jarl.svg']) {
 assert(existsSync(filename),'Missing original V2 art: '+filename);
}
assert(!css.includes('.v2-battle{')&&!css.includes('.v2-biome-'),
 'Inner panels must not change approved main battlefield');
for(const marker of ['Задания','События','Друзья','Награды','Приглашение','Социальные награды','Морской набор'])
 assert(contract.includes("label: '"+marker+"'"),'Approved shortcut missing: '+marker);
console.log('OK: 5 illustrated chapter tabs / 100 locked stages, 10 distinct inner panels, demo-only mail, battle HUD unchanged');
