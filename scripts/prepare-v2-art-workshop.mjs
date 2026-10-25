import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const projectRoot = resolve(fileURLToPath(new URL('..', import.meta.url)));
const roles = new Set(['hero', 'companion', 'enemy', 'boss']);
const args = process.argv.slice(2);

if (args.includes('--help') || args.length < 2) {
  console.log('Usage: npm run art:workshop:prepare -- <actor-id> <hero|companion|enemy|boss> [--dry-run]');
  process.exit(args.includes('--help') ? 0 : 2);
}

const [id, role] = args;
const dryRun = args.includes('--dry-run');

if (!/^[a-z][a-z0-9_-]{1,48}$/.test(id) || !roles.has(role) || args.some(a => a !== id && a !== role && a !== '--dry-run')) {
  console.error('Invalid actor id/role. Use lowercase Latin slug and an allowed role.');
  process.exit(2);
}

const output = join(projectRoot, '.workshop', 'v2-actors', id);
const filename = join(output, 'BRIEF.md');
const motionFilename = join(output, 'MOTION_PROMPTS.md');
const facing = role === 'hero' || role === 'companion' ? 'вправо' : 'влево';
const facingEn = role === 'hero' || role === 'companion' ? 'RIGHT' : 'LEFT';
const brief = `# TERRITORY 2.0 — 2D-риг ${id}

Роль: ${role}. Боевой взгляд: ${facing}. Эталон: \`docs/TERRITORY_2_0_CANON/SOURCE_OF_TRUTH_RU.md\`, главный образец: \`docs/reference/TERRITORY_2_0_APPROVED_2026-10-24.jpg\`.

## Промпт генерации исходного арта

- Единый промпт для одиночного прозрачного PNG, negative prompt и отдельного листа частей: \`docs/TERRITORY_2_0_CHARACTER_ART_PROMPTS_RU.md\`.
- Заполнить индивидуальный дизайн и направление боя для этого actor ID. Не переносить ковбойский стиль или зелёный фон из присланного примера.

## Стиль и материалы

- Яркий, насыщенный мультяшный викинг из утверждённой игры; чистый силуэт, чёткие контуры, никакого мрачного реализма.
- Прозрачный фон у каждого игрового слоя. Не перерисовывать оригинальные сторонние игровые референсы как наши ассеты.
- Сначала цельный персонаж в A-позе (обе кисти и обе ступни целы), потом лист **тех же** частей: голова, торс/таз, левая и правая руки от плеча через локоть до кисти, обе ноги от бедра через колено до стопы.
- Отдельные подвижные элементы: волосы/плащ, оружие, щит (если есть). Кисть держит оружие за рукоять. Амуниция крепится к конкретным костям; экипировка не должна требовать отдельный код для каждого образа.

## Минимум для живого боя

| Действие | Что меняется на самом деле |
|---|---|
| Idle | дыхание, грудная клетка, руки, взгляд; ступни на месте |
| Run/walk | противоположное движение ног и рук, сгиб коленей и локтей, фаза шага привязана к расстоянию |
| Attack 1 / Attack 2 | замах, контакт лезвия с целью, последующее движение и возвращение в стойку |
| Block / dodge | независимые плечи, локти, ноги и корпус; предмет защиты прикреплён к кисти |
| Hit / stun | реакция корпуса и головы, движение инерционных деталей, сохранение соединения суставов |
| Defeat / victory | читаемая отдельная последовательность, а не только масштабирование всего спрайта |

## Жёсткие критерии принятия

1. Плечо–локоть–кисть, бедро–колено–стопа — соединения сохраняются на **всех** кадрах и в переходах. Ни один элемент не висит отдельно.
2. При опорной фазе стопа не скользит по земле; ноги не проваливаются; колени действительно сгибаются.
3. Оружие всё время в кисти; острие достигает цели **именно в кадре удара**. Плащ/волосы движутся вслед за телом, без мгновенного телепорта.
4. Нельзя выдавать за анимацию перемещение или покачивание единой неподвижной картинки.
5. Проверить покадровую раскладку и измерения в \`.agents/skills/ref2game/scripts/qa.mjs\` на самостоятельном WebGL-прототипе. Тесты React-приложения отдельно.
6. Финальный ассет интегрируется только после сверки с утверждённой стилистикой и корректным управлением универсальной экипировкой.

## Безопасная изоляция

- Прототип держать под \`.workshop/v2-actors/${id}/prototype/\`; **никогда** не запускать setup с корнем TERRITORY 2.0.
- Создание этого брифа не меняет игру, её базу и GitHub Pages.
`;

const motionPrompts = `# TERRITORY 2.0 — движение ${id}

Role: ${role}; combat facing: ${facingEn}; approved original idle reference: REQUIRED before generation.
See \`docs/TERRITORY_2_0_MOTION_PIPELINE_RU.md\` and the owner's approved Viking visual reference.
Replace [ACTOR_DESIGN], [EQUIPMENT_AND_HAND], [APPROVED_IDLE_IMAGE] with validated details of THIS actor.

## Общая неизменяемая часть для каждого image-to-video запроса

~~~text
Use the attached [APPROVED_IDLE_IMAGE] as the exact character-identity and first-pose reference.
Only ONE original TERRITORY 2.0 character, ID ${id}, role ${role}, facing screen ${facingEn} in locked three-quarter view.
Design: [ACTOR_DESIGN]. Weapon, shield, and attachment hand: [EQUIPMENT_AND_HAND].
Match the accepted bright, saturated hand-painted cartoon Viking style and every approved visual detail; no cowboy or Wild West elements.
Locked camera, fixed bottom-center foot/root anchor, original canvas, scale and margins. No camera translation, pan, tilt, zoom, crop, resizing, mirror or change of handedness.
Animate articulated limbs, joints, torso and attached gear — never translate or rock the entire still cutout as a substitute for animation. Preserve joints and readable weapon/foot contacts.
Transparent alpha background preferred. If video model only supports chroma green, keep a completely uniform green field solely as temporary keying material; preserve clean silhouette edges and remove all green spill for final PNG/WebP frames.
No environment, floor, shadow, text, logos, extra people, effects, particles, motion blur, flicker, floating props, duplicate anatomy, unmotivated changes of face, hairstyle or outfit.
Clean continuous action, consistent 24 fps source timing. One action per clip. Export lossless frames for a later equal-size horizontal sprite atlas.
DO NOT generate music, speech or audio into the gameplay atlas. Independent footsteps, impacts, cloth and armor foley are added in-engine to verified frame events.
~~~

## Отдельные запросы: добавлять к общей части только один блок

### idle — 2 секунды, бесшовный цикл
~~~text
Breathing/guard stance. Small chest, elbow, hair and attached cloak response. Both boots planted. First and final motion phase are identical, no frozen lead-in or crossfade. Keep the weapon ready and attached.
~~~

### run — 4 секунды, примерно 5 полных циклов
~~~text
Energetic RUN-IN-PLACE toward screen ${facingEn}. Opposite arm/leg phase, distinguishable alternation, knee flexion and planted-foot push-off. Small follow-through in cloak, hair and loose gear. No horizontal root translation. Aim for five evenly timed gait cycles in four seconds, with the first and final pose/phase loop-compatible. The weapon stays securely in its assigned hand and never fires or detaches. Four-legged/flying anatomy requires its own valid gait, not human legs.
~~~

### attack — 1 секунда, одно действие
~~~text
Anticipation 0-25%, forward weapon swing 25-55%, visually readable impact/contact at about 55%, follow-through 55-80%, stable guard recovery 80-100%. No automatic projectiles or glowing effects baked into the character.
~~~

### skill — 1.5 секунды, одно действие
~~~text
Distinct character-led skill windup, readable cast/contact pose, attached weapon/hand alignment and smooth recovery. Spell, damage number and particles remain separate runtime effects.
~~~

### hit — 0.5 секунды, одно действие
~~~text
Visible head, shoulders and torso recoil on impact, flexed knees and slight gear inertia, followed by recovery without root drift. No detached accessories or extra injuries.
~~~

### block — 0.7 секунды, одно действие
~~~text
Raise existing shield or weapon with its attached hand into the incoming attack path; clear defended pose and stable recovery. Do not add a shield if this actor has none.
~~~

### dodge — 0.7 секунды, одно действие
~~~text
Readable bend, weight transfer and evasive movement of limbs/torso while the sprite's root anchor remains stable. Boots and joints stay connected and the actor returns to ready stance.
~~~

### death — 1.2 секунды, одно действие
~~~text
Clearly readable defeated reaction with attached gear, anatomically coherent fall and stable final pose. No looping rise, camera change or particle effects.
~~~

### victory — 1.5 секунды, одно действие
~~~text
Short confident Viking celebration, attached weapon or shield gesture, balanced planted stance and clear finished pose. No text or extra props.
~~~

## Приёмка перед установкой в игру

- Контактный лист из каждого клипа; стабильность стоп, суставов, оружия, лица, силуэта и первого/последнего кадров.
- Извлечённые кадры с прозрачностью; одинаковая геометрия кадра; нет зелёных пикселей на краях.
- Имена и размеры листов — по \`docs/TERRITORY_2_0_MOTION_PIPELINE_RU.md\`; запись в \`src/v2/animation/motionManifest.json\` только после проверки.
- Никаких реальных начислений, Supabase и исходников TERRITORY 1.0.
`;

if (dryRun) {
  console.log(JSON.stringify({ id, role, facing, output, willOverwrite: existsSync(filename), motionWillOverwrite: existsSync(motionFilename) }, null, 2));
  process.exit(0);
}

mkdirSync(output, { recursive: true });
try {
  writeFileSync(filename, brief, { encoding: 'utf8', flag: 'wx' });
  console.log(`Создан бриф: ${filename}`);
} catch (error) {
  if (error?.code === 'EEXIST') {
    console.log(`Бриф уже существует, оставлен без изменений: ${filename}`);
  } else {
    throw error;
  }
}
try {
  writeFileSync(motionFilename, motionPrompts, { encoding: 'utf8', flag: 'wx' });
  console.log(`Созданы промпты движения: ${motionFilename}`);
} catch (error) {
  if (error?.code === 'EEXIST') {
    console.log(`Промпты движения уже существуют, оставлены без изменений: ${motionFilename}`);
  } else {
    throw error;
  }
}
