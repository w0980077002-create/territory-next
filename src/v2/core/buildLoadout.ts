/**
 * TERRITORY 2.0 — research-derived LOADOUT STRUCTURE, not combat balance.
 *
 * Evidence: LW-04, LW-06 (official), LW-09, LW-10 (regional guides),
 * COC-04 (official channel archive). See
 * docs/TERRITORY_2_0_REFERENCE_RESEARCH_20261024_RU.md.
 *
 * IMPORTANT: no fabricated drop rates, stat values, prices, cooldowns,
 * unlock levels or rewards. Those MUST come from a separately approved
 * TERRITORY-specific, server-side balance configuration.
 * No saving, no mutating real accounts, no Supabase calls.
 */

export const V2_SKILL_CATEGORIES = [
  'basic', 'core', 'mastery', 'ultimate', 'passive',
] as const;

export type V2SkillCategory = typeof V2_SKILL_CATEGORIES[number];

export type V2SkillDefinition = Readonly<{
  id: string;
  category: V2SkillCategory;
}>;

export type V2RuneDefinition = Readonly<{
  id: string;
  supportedSkillIds: readonly string[];
}>;

export type V2CompanionDefinition = Readonly<{
  id: string;
  canFight: boolean;
  auraKeys: readonly string[];
}>;

export type V2GearDefinition = Readonly<{
  instanceId: string;
  slot: string;
  setId?: string;
}>;

export type V2Loadout = Readonly<{
  skillIds: readonly string[];
  runes: Readonly<Record<string, string>>; // skillId -> runeId
  equipment: Readonly<Record<string, string>>; // slot -> item instanceId
  primaryCompanionId: string | null;
  supportCompanionIds: readonly string[];
}>;

export type V2LoadoutRules = Readonly<{
  // Slot capacities supplied explicitly by confirmed TERRITORY rules.
  skillSlotCaps: Readonly<Partial<Record<V2SkillCategory, number>>>;
  supportCompanionSlots: number;
  equipmentSlotIds: readonly string[];
}>;

export type V2LoadoutLibrary = Readonly<{
  skills: readonly V2SkillDefinition[];
  runes: readonly V2RuneDefinition[];
  companions: readonly V2CompanionDefinition[];
  gear: readonly V2GearDefinition[];
}>;

export function validateV2Loadout(
  loadout: V2Loadout,
  rules: V2LoadoutRules,
  library: V2LoadoutLibrary,
): readonly string[] {
  const errors: string[] = [];
  const skillMap = new Map(library.skills.map(s => [s.id,s] as const));
  const runeMap = new Map(library.runes.map(r => [r.id,r] as const));
  const companionMap = new Map(library.companions.map(c => [c.id,c] as const));
  const gearMap = new Map(library.gear.map(g => [g.instanceId,g] as const));
  const slotSet = new Set(rules.equipmentSlotIds);

  // The library is the caller's source of truth. Conflicting definitions
  // are rejected rather than choosing an arbitrary winner.
  for (const [name,ids] of [
    ['skills', library.skills.map(x=>x.id)],
    ['runes', library.runes.map(x=>x.id)],
    ['companions', library.companions.map(x=>x.id)],
    ['gear', library.gear.map(x=>x.instanceId)],
    ['equipment slot rules', rules.equipmentSlotIds],
  ] as const) {
    if (new Set(ids).size !== ids.length) errors.push('duplicate definition: ' + name);
    if (ids.some(id=>!id.trim())) errors.push('empty identifier: '+name);
  }

  for (const category of V2_SKILL_CATEGORIES) {
    const cap = rules.skillSlotCaps[category];
    if (cap !== undefined && (!Number.isSafeInteger(cap) || cap < 0)) {
      errors.push('invalid skill capacity: '+category);
    }
  }
  if (!Number.isSafeInteger(rules.supportCompanionSlots) || rules.supportCompanionSlots < 0) {
    errors.push('invalid support companion capacity');
  }

  const skillCount = new Map<V2SkillCategory,number>();
  const selectedSkills = new Set<string>();
  for (const skillId of loadout.skillIds) {
    const skill = skillMap.get(skillId);
    if (!skill) { errors.push('unknown skill: '+skillId); continue; }
    if (selectedSkills.has(skillId)) errors.push('duplicate selected skill: '+skillId);
    selectedSkills.add(skillId);
    skillCount.set(skill.category,(skillCount.get(skill.category)??0)+1);
  }
  for (const [category,count] of skillCount.entries()) {
    const cap = rules.skillSlotCaps[category];
    // An unconfigured category cannot be silently treated as unlimited.
    if (cap === undefined) errors.push('missing capacity for category: '+category);
    else if (count > cap) errors.push('too many skills: '+category);
  }

  for (const [skillId,runeId] of Object.entries(loadout.runes)) {
    if (!selectedSkills.has(skillId)) errors.push('rune on unequipped skill: '+skillId);
    const rune = runeMap.get(runeId);
    if (!rune) { errors.push('unknown rune: '+runeId); continue; }
    if (!rune.supportedSkillIds.includes(skillId)) errors.push('incompatible rune: '+runeId);
  }

  const selectedGear = new Set<string>();
  for (const [slot,itemId] of Object.entries(loadout.equipment)) {
    if (!slotSet.has(slot)) errors.push('unknown equipment slot: '+slot);
    const item = gearMap.get(itemId);
    if (!item) { errors.push('unknown gear: '+itemId); continue; }
    if (item.slot !== slot) errors.push('gear in wrong slot: '+itemId);
    if (selectedGear.has(itemId)) errors.push('gear duplicated in slots: '+itemId);
    selectedGear.add(itemId);
  }

  const mainId = loadout.primaryCompanionId;
  if (mainId !== null) {
    const main = companionMap.get(mainId);
    if (!main) errors.push('unknown main companion: '+mainId);
    else if (!main.canFight) errors.push('non-combat primary companion: '+mainId);
  }
  if (loadout.supportCompanionIds.length > rules.supportCompanionSlots) {
    errors.push('too many support companions');
  }
  if (new Set(loadout.supportCompanionIds).size !== loadout.supportCompanionIds.length) {
    errors.push('duplicate support companion');
  }
  for (const id of loadout.supportCompanionIds) {
    if (!companionMap.has(id)) errors.push('unknown support companion: '+id);
    if (id === mainId) errors.push('main companion also assigned as support: '+id);
  }
  return errors;
}

/**
 * Counts verified equipped items by set. The effect and required count are
 * intentionally NOT hard-coded. They must be supplied by server rules.
 */
export function countEquippedSetPieces(
  equipment: V2Loadout['equipment'],
  gear: V2LoadoutLibrary['gear'],
): Readonly<Record<string,number>> {
  const definitions = new Map(gear.map(item=>[item.instanceId,item] as const));
  const result: Record<string,number> = Object.create(null);
  const seen = new Set<string>();
  for (const [slot,itemId] of Object.entries(equipment)) {
    if (seen.has(itemId)) continue;
    seen.add(itemId);
    const item = definitions.get(itemId);
    if (!item || item.slot !== slot || !item.setId) continue;
    result[item.setId] = (result[item.setId]??0)+1;
  }
  return result;
}

/** Returns effect identifiers, not invented numerical aura bonuses. */
export function activeSupportAuraKeys(
  loadout: V2Loadout,
  companions: V2LoadoutLibrary['companions'],
): readonly string[] {
  const lookup = new Map(companions.map(c=>[c.id,c] as const));
  const keys = new Set<string>();
  for (const id of loadout.supportCompanionIds) {
    for (const aura of lookup.get(id)?.auraKeys ?? []) keys.add(aura);
  }
  return [...keys];
}
