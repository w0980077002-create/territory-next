// Mobile screenshot regression for approved TERRITORY 2.0 reference.
// This is structural validation; real screenshot visual signoff remains pending.
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import {createHash} from 'node:crypto';
const read=p=>readFileSync(p,'utf8');
const app=read('src/v2/NextApp.tsx');
const style=read('src/v2/sunlit-reference-polish.css');
const approved=readFileSync('docs/reference/TERRITORY_2_0_APPROVED_2026-10-24.jpg');
const scenic='public/v2-snowy-approved-derived.webp';
assert(existsSync(scenic),'Approved winter scenic derivative missing');
assert.equal(createHash('sha256').update(approved).digest('hex'),
'ab4201e4d5b168d9941b287329c097ec217bd6510af503e421a957132924384c',
'Owner-approved image was altered');
assert(style.includes("url('/v2-snowy-approved-derived.webp')"),'Stage not using derived screenshot background');
assert(!style.includes("city-bg-vibrant.webp"),'Old city image cannot be the new winter scene');
assert(app.includes("useState<CompanionKind>('warcow')"),'Reference battle cow must be default companion in demo');
assert(app.includes('v2-command-actions') && app.includes('v2-command-spacer'),'No reserved center gap — bottom battle button obscures quest');
assert(style.includes('grid-template-columns:minmax(0,41%) minmax(61px,18%) minmax(0,1fr)'),'Quest and command spacing regressed');
assert(app.includes('v2-nav-fight') && app.includes('БОЙ'),'Center combat button lost its caption');
assert(style.includes('v2-combat-notice') && style.includes('bottom:4%'),'Victory notification must be compact and below fighters');
assert(app.includes("import './sunlit-reference-polish.css'"),'Approved style file not loaded last');
console.log('OK: approved screenshot unchanged, new winter scene is derived from it, no duplicated Viking, quest/central navigation separated');
