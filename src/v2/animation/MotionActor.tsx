import type { CSSProperties } from 'react';
import manifest from './motionManifest.json';
import { ONE_SHOT_MOTIONS, type V2Motion } from './motionState';

type MotionClip = Readonly<{
  src: string;
  frames: number;
  fps: number;
  width: number;
  height: number;
  loop: boolean;
  hitFrame?: number;
}>;
type MotionActorEntry = Readonly<{
  role: string;
  facing: 'left' | 'right';
  clips: Partial<Record<V2Motion, MotionClip>>;
}>;
const actors = manifest.actors as unknown as Record<string, MotionActorEntry>;
const base = import.meta.env.BASE_URL;

type Props = Readonly<{
  actorId: string;
  poster: string;
  alt: string;
  motion: V2Motion;
  epoch: number;
  active: boolean;
  speed: 1 | 2;
}>;

/** Plays approved horizontal sprite sheets; the poster remains visible until one exists.
 * Sprite animations have a fixed origin: no mirroring, auto-cropping or moving hitboxes.
 */
export function MotionActor({ actorId, poster, alt, motion, epoch, active, speed }: Props) {
  const entry = actors[actorId];
  const desired = entry?.clips[motion];
  const clip = desired ?? entry?.clips.idle;
  if (!clip) return <img className="v2-motion-poster" src={poster} alt={alt}/>;

  const chosenMotion = desired ? motion : 'idle';
  const oneShot = ONE_SHOT_MOTIONS.includes(chosenMotion);
  const style = {
    aspectRatio: `${clip.width} / ${clip.height}`,
    backgroundImage: `url("${base}${clip.src.replace(/^\//, '')}")`,
    backgroundSize: `${clip.frames * 100}% 100%`,
    animationDuration: `${clip.frames / (clip.fps * speed)}s`,
    animationTimingFunction: `steps(${clip.frames}, end)`,
    animationIterationCount: clip.loop ? 'infinite' : '1',
    animationPlayState: active ? 'running' : 'paused',
  } satisfies CSSProperties;
  const key = `${actorId}:${chosenMotion}:${oneShot ? epoch : 0}`;
  return <span className="v2-motion-viewport" role="img" aria-label={alt}
    data-facing={entry.facing} data-motion={chosenMotion}>
    <span key={key} className="v2-motion-sheet" style={style}/>
  </span>;
}
