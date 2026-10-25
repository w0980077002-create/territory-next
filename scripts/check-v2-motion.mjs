import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import ts from 'typescript';

// CI uses Node 20, which cannot import TypeScript directly. Verify the same
// production source after TypeScript's standard ES module transpilation.
const motionSource = readFileSync('src/v2/animation/motionState.ts', 'utf8');
const motionJs = ts.transpileModule(motionSource, {
  compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2020 },
}).outputText;
const { motionForCombatant } = await import('data:text/javascript;base64,' + Buffer.from(motionJs).toString('base64'));

const registry = JSON.parse(readFileSync('src/v2/animation/motionManifest.json', 'utf8'));
assert.equal(registry.schema, 'territory-v2-motion-1');
const expectedRole = {
  berserker: 'hero', runemage: 'hero', ranger: 'hero',
  guardian: 'companion', warrior: 'companion', healer: 'companion',
  hunter: 'companion', mage: 'companion', warcow: 'companion',
  wolf: 'enemy', goblin: 'enemy', bandit: 'enemy', troll: 'enemy', giant: 'enemy',
  giant_king: 'boss', northern_jarl: 'boss', storm_lord: 'boss', undead_king: 'boss',
  fire_lord: 'boss', barrow_guardian: 'boss', dark_priest: 'boss',
  bandit_chief: 'boss', chaos_shadow: 'boss', abyss_demon: 'boss',
};
assert.deepEqual(Object.keys(registry.actors).sort(), Object.keys(expectedRole).sort());
const states = new Set(['idle', 'run', 'attack', 'skill', 'hit', 'block', 'dodge', 'death', 'victory']);
let acceptedClips = 0;
for (const [id, actor] of Object.entries(registry.actors)) {
  assert.equal(actor.role, expectedRole[id]);
  assert.equal(actor.facing, ['hero', 'companion'].includes(actor.role) ? 'right' : 'left');
  assert.ok(actor.clips && typeof actor.clips === 'object' && !Array.isArray(actor.clips));
  for (const [state, clip] of Object.entries(actor.clips)) {
    acceptedClips++;
    assert.ok(states.has(state), `${id}: unknown motion ${state}`);
    assert.match(clip.src, new RegExp(`^art/motion/${id}/${state}\\.(png|webp)$`));
    assert.ok(Number.isInteger(clip.frames) && clip.frames >= 2 && clip.frames <= 64);
    assert.ok(Number.isInteger(clip.fps) && clip.fps >= 6 && clip.fps <= 30);
    assert.ok(Number.isInteger(clip.width) && clip.width >= 64 && clip.width <= 1024);
    assert.ok(Number.isInteger(clip.height) && clip.height >= 64 && clip.height <= 1024);
    assert.equal(clip.loop, state === 'idle' || state === 'run');
    if (clip.hitFrame !== undefined) {
      assert.ok(['attack', 'skill'].includes(state));
      assert.ok(Number.isInteger(clip.hitFrame) && clip.hitFrame >= 0 && clip.hitFrame < clip.frames);
    }
    // A missing or unreviewed file can never be silently substituted with a blank sheet.
    const file = resolve('public-v2', clip.src);
    assert.ok(file.startsWith(resolve('public-v2', 'art/motion') + '/'));
    assert.ok(existsSync(file), `${id}/${state}: registered atlas is absent: ${file}`);
    const signature = readFileSync(file).subarray(0, 12);
    if (clip.src.endsWith('.png')) {
      assert.ok(signature.subarray(0, 8).equals(Buffer.from([137,80,78,71,13,10,26,10])), `${id}: invalid PNG`);
    } else {
      assert.equal(signature.toString('ascii', 0, 4), 'RIFF');
      assert.equal(signature.toString('ascii', 8, 12), 'WEBP');
    }
  }
}

const atk = { kind: 'attack', target: 'enemy', amount: 10 };
const skill = { ...atk, caption: 'Навык' };
const hit = { kind: 'attack', target: 'hero', amount: 8 };
const follower = { kind: 'follower', target: 'enemy', amount: 5 };
assert.equal(motionForCombatant('hero', null, true, [atk]), 'attack');
assert.equal(motionForCombatant('hero', null, true, [skill]), 'skill');
assert.equal(motionForCombatant('hero', null, true, [hit]), 'hit');
assert.equal(motionForCombatant('hero', null, false, [atk]), 'idle');
assert.equal(motionForCombatant('enemy', null, true, [atk]), 'hit');
assert.equal(motionForCombatant('enemy', null, true, [hit]), 'attack');
assert.equal(motionForCombatant('companion', null, true, [follower]), 'attack');
assert.equal(motionForCombatant('companion', null, true, []), 'run');
assert.equal(motionForCombatant('hero', 'victory', true, []), 'victory');
assert.equal(motionForCombatant('boss', 'victory', true, []), 'death');

const app = readFileSync('src/v2/NextApp.tsx', 'utf8');
const player = readFileSync('src/v2/animation/MotionActor.tsx', 'utf8');
const css = readFileSync('src/v2/animation/motion.css', 'utf8');
assert.match(app, /<MotionActor actorId=\{heroClass\}/);
assert.match(app, /<MotionActor actorId=\{companion\}/);
assert.match(app, /<MotionActor actorId=\{foeId\}/);
assert.match(player, /if \(!clip\) return <img/);
assert.match(player, /steps\(\$\{clip.frames\}, end\)/);
assert.match(css, /\.v2-motion-sheet/);
assert.match(css, /prefers-reduced-motion/);
assert.ok(existsSync('docs/TERRITORY_2_0_MOTION_PIPELINE_RU.md'));

console.log(`OK: 24 V2 motion slots, ${acceptedClips} accepted sheets; safe static fallbacks and combat state wiring.`);
