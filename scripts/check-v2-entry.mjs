// TERRITORY 2.0 independent-client regression guards.
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
const read=(file)=>readFileSync(file,'utf8');

const entry=read('index.html');
const main=read('src/v2/main.tsx');
const app=read('src/v2/NextApp.tsx');
const css=read('src/v2/next.css');
const db=read('src/game/supabase.ts');
const layout=read('src/v2/interfaceContract.ts');

assert.match(entry,/src\/v2\/main\.tsx/, 'new repository root must run NextApp');
assert(!entry.includes('/src/main.tsx'), 'legacy authenticated entry must not run');
assert(!entry.includes('telegram-web-app.js'), 'never use old Telegram login inside preview');
assert.match(main,/import \{ NextApp \}/);
assert(!/\bimport\s+.+?from\s+['"].*(App\.tsx|game\/auth|game\/cloud|supabase)/.test(main),
  'offline entry must not import the legacy authenticated game');
assert(!/(\bfetch\s*\(|XMLHttpRequest|\.rpc\(|\.from\(['"]players['"]\)|getTelegramInitData|useAuth|saveCloudSave)/.test(app),
  'standalone preview must not call production APIs or mutate player accounts');
assert.match(app,/nextPreviewTick/, 'actual combat simulator must animate combat');
assert.match(app,/V2_BOTTOM_NAV/, 'approved mobile navigation must be rendered');
assert.match(app,/V2_LEFT_SHORTCUTS/);
assert.match(app,/V2_RIGHT_SHORTCUTS/);
assert.match(app,/v2-arena-button/, 'Arena button missing');
assert.match(app,/v2-hp-bar/);
assert.match(app,/v2-orb energy/);
assert.match(app,/v2-equipment/);
assert.match(app,/V2_GEAR_SLOTS|const gear =/, 'seven existing equipment slots must remain visible');
assert.match(layout,/label: 'Приключение'/);
assert.match(db,/VITE_V2_STAGING_APPROVED === 'yes'/);
assert.match(db,/isLegacyProduction/);
assert(!existsSync('.github/workflows/pages.yml'), 'old production deploy workflow must be absent');
assert.match(css,/prefers-reduced-motion/, 'accessibility motion toggle must exist');
assert.match(css,/safe-area-inset-bottom/, 'support iOS and Telegram safe area');
console.log('TERRITORY 2.0 standalone React client / no production auth / mobile HUD safeguards: OK');
