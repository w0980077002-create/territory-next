/**
 * TERRITORY 2.0 — isolated preview chapter progression.
 * A working navigation rule, NOT a copied competitor unlock formula.
 * Server-authoritative chapter access is required before live release.
 *
 * The demo uses five existing waves/chapter. These are explicitly fixture
 * values from the earlier offline simulator, not an alleged Lootborn rule.
 * Reference: Master TZ GMP-02, SCR-01, SCR-09; E2E-010, E2E-017.
 */
export type V2ChapterRoute = Readonly<{ chapter:number; wave:number }>;
export const DEMO_WAVES_PER_CHAPTER = 5;
export const DEMO_START_CHAPTER = 6;

export function chapterIsUnlocked(chapter:number, highestUnlockedChapter:number):boolean {
  return Number.isSafeInteger(chapter) && chapter>=1 &&
    Number.isSafeInteger(highestUnlockedChapter) &&
    highestUnlockedChapter>=1 && chapter<=highestUnlockedChapter;
}

export function canEnterDemoRoute(
  route: V2ChapterRoute, highestUnlockedChapter:number,
): boolean {
  return chapterIsUnlocked(route.chapter,highestUnlockedChapter) &&
    Number.isSafeInteger(route.wave) && route.wave>=1 &&
    route.wave<=DEMO_WAVES_PER_CHAPTER;
}

export type V2ChapterVictory = Readonly<{
  nextRoute:V2ChapterRoute;
  highestUnlockedChapter:number;
  bossCleared:boolean;
}>;

export function nextDemoChapterVictory(
  current:V2ChapterRoute,
  highestUnlockedChapter:number,
):V2ChapterVictory {
  if(!canEnterDemoRoute(current,highestUnlockedChapter)) {
    throw new RangeError('Attempted victory on inaccessible demo chapter');
  }
  const bossCleared=current.wave===DEMO_WAVES_PER_CHAPTER;
  const nextRoute=bossCleared
    ? {chapter:current.chapter+1,wave:1}
    : {chapter:current.chapter,wave:current.wave+1};
  return {
    nextRoute,
    highestUnlockedChapter:bossCleared
      ? Math.max(highestUnlockedChapter,nextRoute.chapter)
      : highestUnlockedChapter,
    bossCleared,
  };
}

export function chooseDemoChapter(
  chapter:number,highestUnlockedChapter:number,
):V2ChapterRoute|null {
  return chapterIsUnlocked(chapter,highestUnlockedChapter)
    ? {chapter,wave:1} : null;
}

/** Returns one deterministic visual-only random sample in [0, 1).
 * Never use this predictable generator for a real drop/award/loot roll.
 */
export function demoCombatSample(encounterId:number,tick:number):number {
  const id=Math.max(0,Math.trunc(encounterId));
  const time=Math.max(0,Math.trunc(tick));
  let x=(((id*2654435761) ^ (time*2246822519))>>>0);
  x^=x>>>16;
  x=Math.imul(x,0x7feb352d);
  x^=x>>>15;
  x=Math.imul(x,0x846ca68b);
  x^=x>>>16;
  return (x>>>0)/4294967296;
}
