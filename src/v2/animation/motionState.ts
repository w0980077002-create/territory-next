/** Visual animation only. Never drives damage, rewards or server state. */
export type V2Motion = 'idle' | 'run' | 'attack' | 'skill' | 'hit' | 'block' | 'dodge' | 'death' | 'victory';
export type V2MotionRole = 'hero' | 'companion' | 'enemy' | 'boss';
export type V2MotionEvent = Readonly<{
  kind: string;
  target: 'hero' | 'enemy';
  amount: number;
  caption?: string;
}>;

export function motionForCombatant(
  role: V2MotionRole,
  battleFinished: 'victory' | 'defeat' | null,
  active: boolean,
  events: readonly V2MotionEvent[],
): V2Motion {
  if (battleFinished) {
    const winning = battleFinished === 'victory';
    return role === 'hero' || role === 'companion'
      ? (winning ? 'victory' : 'death')
      : (winning ? 'death' : 'victory');
  }
  if (!active) return 'idle';
  if (role === 'companion') {
    return events.some(event => event.kind === 'follower') ? 'attack' : 'run';
  }
  if (role === 'hero') {
    if (events.some(event => event.target === 'hero' && event.amount > 0)) return 'hit';
    if (events.some(event => event.target === 'enemy' && event.kind === 'dodge')) return 'attack';
    if (events.some(event => event.target === 'enemy' && ['attack', 'crit'].includes(event.kind))) {
      return events.some(event => event.caption === 'Навык') ? 'skill' : 'attack';
    }
    return 'run';
  }
  if (events.some(event => event.target === 'enemy' && event.amount > 0)) return 'hit';
  if (events.some(event => event.target === 'hero' && ['attack', 'crit'].includes(event.kind))) return 'attack';
  if (events.some(event => event.target === 'hero' && event.kind === 'dodge')) return 'dodge';
  return 'run';
}

export const ONE_SHOT_MOTIONS: readonly V2Motion[] = ['attack', 'skill', 'hit', 'block', 'dodge', 'death', 'victory'];
