// Mobile screenshot regression for approved TERRITORY 2.0 reference.
// This is structural validation; real screenshot visual signoff remains pending.
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import {createHash} from 'node:crypto';
const read=p=>readFileSync(p,'utf8');
const app=read('src/v2/NextApp.tsx');
const style=read('src/v2/sunlit-reference-polish.css');
const approved=readFileSync('docs/reference/TERRITORY_2_0_APPROVED_2026-10-24.jpg');
const scenic='public/v2-winter-stage-v5.webp';
const cow='public/v2-battle-cow-approved.webp';
const avatar='public/v2-approved-avatar.webp';
assert(existsSync(scenic),'Approved winter scenic derivative missing');
assert(existsSync(cow),'Approved battle cow art missing');
assert(existsSync(avatar),'Approved portrait crop missing');
assert.equal(createHash('sha256').update(approved).digest('hex'),
'ab4201e4d5b168d9941b287329c097ec217bd6510af503e421a957132924384c',
'Owner-approved image was altered');
assert(style.includes("url('/v2-winter-stage-v5.webp')"),'Stage not using approved winter scene');
assert(!style.includes("url('/v2-snowy-approved-derived.webp')"),'Old flat snow band has returned');
assert(app.includes("warcow: asset('v2-battle-cow-approved.webp')"),'Wireframe cow cannot be active art');
assert(app.includes("asset('v2-approved-avatar.webp')"),'Approved player portrait not rendered');
assert(!style.includes("city-bg-vibrant.webp"),'Old city image cannot be the new winter scene');
assert(app.includes("offlineSave?.companion??'warcow'"),'Reference battle cow must be default companion when no local demo save exists');
assert(app.includes('v2-command-actions') && app.includes('v2-command-spacer'),'No reserved center gap — bottom battle button obscures quest');
assert(style.includes('grid-template-columns:minmax(0,41%) minmax(61px,18%) minmax(0,1fr)'),'Quest and command spacing regressed');
assert(app.includes('v2-nav-fight') && app.includes('БОЙ'),'Center combat button lost its caption');
assert(style.includes('v2-combat-notice') && style.includes('bottom:4%'),'Victory notification must be compact and below fighters');
assert(app.includes("import './sunlit-reference-polish.css'"),'Approved style file not loaded last');
console.log('OK: approved screenshot unchanged, winter scene has no geometric bands, original cow and portrait installed, shortcut layout protected');
