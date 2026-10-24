/**
 * TERRITORY 2.0 — future SERVER-SIDE PvE resolution engine.
 * TZ: GMP-02/GMP-03, E2E-010..019, SEC-02.
 *
 * NOT imported from src/v2; the public Pages demo still uses PREVIEW combat.
 * Caller must be a trusted V2 server: verify Telegram identity, load an
 * authorized character/loadout + immutable ruleset from V2 staging and create
 * the seed with a cryptographically secure server generator. Never accept
 * combat stats, ruleset, result, seed or prize from the browser.
 *
 * All combat coefficients are supplied by versioned TERRITORY rulesets.
 * No alleged Lootborn / Call of Odin's hidden damage formulas, and NO
 * reward / ledger / XP writes in this engine.
 */

export interface PveCombatant {
  readonly hp: number;
  readonly attack: number;
  readonly defense: number;
  readonly critBps: number;
  readonly dodgeBps: number;
}

export interface PveRuleset {
  readonly version: string;
  readonly maxTurns: number;
  readonly enemyAttackEvery: number;
  readonly defenseReductionBps: number;
  readonly criticalMultiplierBps: number;
  readonly bossRageThresholdBps: number;
  readonly bossRageMultiplierBps: number;
}

export interface PveEncounter {
  readonly battleId: string;
  readonly stageId: string;
  readonly classId: string;
  readonly isBoss: boolean;
  readonly hero: PveCombatant;
  readonly enemy: PveCombatant;
  readonly seed: number; // secret generated on the server; NEVER picked by player
  readonly rules: PveRuleset;
}

export type PveEventKind = 'hit' | 'critical' | 'dodge' | 'boss_rage' | 'death';
export interface PveEvent {
  readonly turn: number;
  readonly source: 'hero' | 'enemy';
  readonly kind: PveEventKind;
  readonly damage: number;
  readonly heroHp: number;
  readonly enemyHp: number;
}
export interface PveResolution {
  readonly battleId: string;
  readonly stageId: string;
  readonly rulesetVersion: string;
  readonly outcome: 'victory' | 'defeat';
  readonly reason: 'enemy_defeated' | 'hero_defeated' | 'turn_limit';
  readonly turns: number;
  readonly finalHeroHp: number;
  readonly finalEnemyHp: number;
  readonly events: readonly PveEvent[];
}

const isIntegerBetween = (n: number, lo: number, hi: number) =>
  Number.isSafeInteger(n) && n >= lo && n <= hi;

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const ID = /^[a-z0-9][a-z0-9_.:-]{0,79}$/i;

function validateCombatant(value: PveCombatant, who: string): void {
  if (!value || !isIntegerBetween(value.hp, 1, 10_000_000) ||
    !isIntegerBetween(value.attack, 1, 1_000_000) ||
    !isIntegerBetween(value.defense, 0, 1_000_000) ||
    !isIntegerBetween(value.critBps, 0, 10_000) ||
    !isIntegerBetween(value.dodgeBps, 0, 10_000)) {
    throw new RangeError('INVALID_'+who+'_COMBATANT');
  }
}
export function validatePveEncounter(encounter: PveEncounter): void {
  if (!encounter || !UUID.test(encounter.battleId) ||
      !ID.test(encounter.stageId) || !ID.test(encounter.classId) ||
      typeof encounter.isBoss !== 'boolean' ||
      !isIntegerBetween(encounter.seed, 1, 0xffffffff) ||
      !encounter.rules || !ID.test(encounter.rules.version)) {
    throw new RangeError('INVALID_PVE_ENCOUNTER');
  }
  validateCombatant(encounter.hero, 'HERO');
  validateCombatant(encounter.enemy, 'ENEMY');
  const r = encounter.rules;
  if (!isIntegerBetween(r.maxTurns, 1, 2_000) ||
      !isIntegerBetween(r.enemyAttackEvery, 1, 20) ||
      !isIntegerBetween(r.defenseReductionBps, 0, 10_000) ||
      !isIntegerBetween(r.criticalMultiplierBps, 10_000, 50_000) ||
      !isIntegerBetween(r.bossRageThresholdBps, 0, 10_000) ||
      !isIntegerBetween(r.bossRageMultiplierBps, 10_000, 50_000)) {
    throw new RangeError('INVALID_PVE_RULESET');
  }
}

/** Stable seeded generator for replay: does NOT generate rewards or currency.
 * The seed MUST be generated and kept exclusively on the trusted server.
 * Do not use a predictable seed for any prize-bearing random draw.
 */
function nextRoll(state: number): number {
  let x = state >>> 0;
  x ^= x << 13; x ^= x >>> 17; x ^= x << 5;
  return x >>> 0;
}

function damageFrom(
  source: PveCombatant, target: PveCombatant, multiplierBps: number,
  reductionBps: number,
): number {
  const base = Math.max(1,source.attack - Math.floor(target.defense * reductionBps / 10_000));
  return Math.max(1, Math.floor(base * multiplierBps / 10_000));
}

export function resolvePveEncounter(encounter: PveEncounter): PveResolution {
  validatePveEncounter(encounter);
  let heroHp = encounter.hero.hp;
  let enemyHp = encounter.enemy.hp;
  let rng = encounter.seed >>> 0;
  let enraged = false;
  const events: PveEvent[] = [];
  let turns = 0;
  let reason: PveResolution['reason'] = 'turn_limit';

  // A bound on both turns and events prevents unbounded replay logs.
  for (let turn=1; turn<=encounter.rules.maxTurns; turn++) {
    turns = turn;
    rng = nextRoll(rng);
    const dodgesHero = rng % 10_000 < encounter.enemy.dodgeBps;
    if (dodgesHero) {
      events.push({turn,source:'hero',kind:'dodge',damage:0,heroHp,enemyHp});
    } else {
      rng = nextRoll(rng);
      const critical = rng % 10_000 < encounter.hero.critBps;
      const amount = Math.min(enemyHp, damageFrom(encounter.hero,encounter.enemy,
        critical?encounter.rules.criticalMultiplierBps:10_000,
        encounter.rules.defenseReductionBps));
      enemyHp -= amount;
      events.push({turn,source:'hero',kind:critical?'critical':'hit',damage:amount,heroHp,enemyHp});
    }
    if (enemyHp === 0) { reason='enemy_defeated'; break; }

    if (encounter.isBoss && !enraged &&
        enemyHp * 10_000 <= encounter.enemy.hp * encounter.rules.bossRageThresholdBps) {
      enraged = true;
      events.push({turn,source:'enemy',kind:'boss_rage',damage:0,heroHp,enemyHp});
    }

    if (turn % encounter.rules.enemyAttackEvery !== 0) continue;
    rng = nextRoll(rng);
    if (rng % 10_000 < encounter.hero.dodgeBps) {
      events.push({turn,source:'enemy',kind:'dodge',damage:0,heroHp,enemyHp});
    } else {
      rng = nextRoll(rng);
      const critical = rng % 10_000 < encounter.enemy.critBps;
      const bonus = enraged ? encounter.rules.bossRageMultiplierBps : 10_000;
      const critMultiplier = critical ? encounter.rules.criticalMultiplierBps : 10_000;
      const multiplierBps = Math.floor(bonus * critMultiplier / 10_000);
      const amount = Math.min(heroHp,damageFrom(encounter.enemy,encounter.hero,
        multiplierBps,encounter.rules.defenseReductionBps));
      heroHp -= amount;
      events.push({turn,source:'enemy',kind:critical?'critical':'hit',damage:amount,heroHp,enemyHp});
    }
    if (heroHp === 0) { reason='hero_defeated'; break; }
  }

  if (heroHp === 0 || enemyHp === 0) {
    events.push({turn:turns,source:enemyHp===0?'enemy':'hero',
      kind:'death',damage:0,heroHp,enemyHp});
  }
  return {
    battleId:encounter.battleId,stageId:encounter.stageId,
    rulesetVersion:encounter.rules.version,
    outcome:enemyHp===0?'victory':'defeat',
    reason,turns,finalHeroHp:heroHp,finalEnemyHp:enemyHp,
    events,
  };
}
