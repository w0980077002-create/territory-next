/**
 * Offline, visually testable TERRITORY 2.0 build presets.
 * No storage, network or permanent currency. Slot count is a DEMO fixture,
 * not an assertion about Lootborn Warriors' hidden slot limits.
 * Research: LW-03, LW-04, LW-06; TZ GMP-03 / E2E-023.
 */
import type { HeroClass,RuneKind,CompanionKind } from './autoBattle';

export type DemoBattleBuild = Readonly<{
  heroClass:HeroClass;
  rune:RuneKind;
  companion:CompanionKind;
}>;

export type DemoBuildSlot = Readonly<{
  slot:number;
  build:DemoBattleBuild|null;
}>;

const validClass=new Set<HeroClass>(['berserker','runemage','ranger']);
const validRune=new Set<RuneKind>(['flame','frost','thunder','guardian']);
const validCompanion=new Set<CompanionKind>(['guardian','warrior','healer','hunter','mage','warcow']);

export function createDemoBuildSlots(count:number):readonly DemoBuildSlot[]{
  if(!Number.isSafeInteger(count)||count<1||count>10) throw new RangeError('Invalid demo slot count');
  return Array.from({length:count},(_,slot)=>({slot:slot+1,build:null}));
}

export function validDemoBuild(build:DemoBattleBuild):boolean{
  return validClass.has(build.heroClass) && validRune.has(build.rune) &&
    validCompanion.has(build.companion);
}

export function saveDemoBuildSlot(
  slots:readonly DemoBuildSlot[],index:number,build:DemoBattleBuild,
):readonly DemoBuildSlot[] {
  if(!Number.isSafeInteger(index)||index<1||index>slots.length||
    !validDemoBuild(build)) return slots;
  return slots.map(slot=>slot.slot===index?
    {slot:slot.slot,build:{...build}}:slot);
}

export function loadDemoBuildSlot(
  slots:readonly DemoBuildSlot[],index:number,
):DemoBattleBuild|null {
  const selected=slots.find(slot=>slot.slot===index);
  return selected?.build && validDemoBuild(selected.build)
    ? {...selected.build}:null;
}
