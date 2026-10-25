# TERRITORY 2.0 — единый промпт и стандарт 2D-персонажей

**Версия:** ART-PROMPT-1.0 · 25.10.2026  
**Назначение:** исходные изображения героев, спутников, обычных врагов и боссов для последующей покадровой или костной анимации. Это инструмент художественного производства, а не новая механика игры.

## 1. Источник истины

1. Внешний вид должен соответствовать утверждённому экрану в [SOURCE_OF_TRUTH_RU.md](TERRITORY_2_0_CANON/SOURCE_OF_TRUTH_RU.md) и неизменённому [главному эталону](reference/TERRITORY_2_0_APPROVED_2026-10-24.jpg). Шесть утверждённых экранов важнее любых слов в этом шаблоне.
2. Яркий, насыщенный рисованный мультяшный мир викингов. **Не** Дикий Запад, не реалистичные/3D-персонажи, не мрачный взрослый фэнтези-арт, не детсадовская пластмассовая стилистика.
3. В основной боевой сцене герои и союзные спутники смотрят **вправо**, враги и боссы — **влево**. Это боевые направления, а не разрешение автоматически отражать все текстуры: асимметричные щиты, оружие, украшения и надписи проверять отдельно.
4. Создавать оригинальную графику. Скриншоты других игр используются для сопоставления композиции/стиля, но не как исходники для копирования чужих персонажей или защищённых текстур.
5. Не менять пропорции персонажей на утверждённом экране. Масштаб **внутри сцены** задаётся отдельно от разрешения исходного ассета.

## 2. Как пользоваться

Для каждого персонажа заполнить карточку:

| Поле | Что указать |
|---|---|
| ACTOR_ID | Уникальное короткое имя ассета: например, hero-ginger-axe |
| ROLE | hero / companion / enemy / boss |
| FACING | RIGHT для hero/companion; LEFT для enemy/boss |
| DESIGN | Конкретная индивидуальная внешность из нашего ТЗ или утверждённого описания: голова, броня, цвета, оружие, силуэт |
| EQUIPMENT | Предметы, их количество и к какой руке/кости они относятся; если нет — none |
| SCALE_REFERENCE | Размер в сравнении с утверждённым кадром, не произвольное увеличение |
| APPROVED_REFERENCE | Неизменённое утверждённое изображение, прикреплённое при генерации |

**Один запрос — один персонаж и одна исходная спокойная поза.** Не просить в том же запросе лист из нескольких поз и не генерировать несколько персонажей вместе. После принятия силуэта отдельным запросом готовится лист частей того **же** персонажа по принятому исходнику. На каждом шаге сохранять исходное изображение и текст запроса.

## 3. Готовый базовый промпт для генерации (EN)

Ниже — рабочий шаблон. Заполнить все поля в фигурных скобках; не отправлять в генератор незаполненные поля.

~~~text
Use case: production-ready stylized 2D game character for TERRITORY 2.0.
Asset stage: a SINGLE full-body neutral keyframe intended for a later cut-out skeletal rig.
Reference image: the owner's approved TERRITORY 2.0 Viking battle screenshot, used to match the game's drawn style, palette, readability, proportions and camera angle. Do not trace or duplicate a copyrighted character from a different game.

Create exactly ONE ORIGINAL character.
Actor ID: {ACTOR_ID}.
Role: {ROLE}.
Combat facing: screen {FACING}.
Specific design: {DESIGN}.
Equipment and hand attachment: {EQUIPMENT}.
Relative in-game size: {SCALE_REFERENCE}.

Art direction: bright, saturated hand-painted 2D cartoon Viking fantasy; charming but heroic and combat-ready, bold crisp dark contours with consistent line weight, expressive readable face, polished clean cel shading and restrained highlights. Preserve the approved reference's stylization. Strong silhouette and readable armor, limbs and weapon at mobile gameplay scale. Never photorealistic, never a 3D render, never Wild West.

Composition: isolated full body, single neutral balanced ready stance, no attack in progress. Square 1024 × 1024 source canvas. Center the silhouette; leave breathing room for future run/attack/fall animation. Keep complete headgear, weapon, fingertips, both legs and boots within the canvas. Soles share a stable ground level around 82% of canvas height; bottom-center ground pivot must be reproducible. Fixed near-eye-level three-quarter side-facing game view, with the face and weapon visibly oriented screen {FACING}; do not use isometric or overhead camera. Keep left/right arms, torso, and legs visually separable. Both feet grounded; no baked shadow or perspective floor.

Output: crisp opaque character pixels with a genuinely TRANSPARENT alpha background (PNG); fully transparent pixels everywhere outside the character. No green screen unless native transparency is technically unavailable. No green fringe, matte contamination, ground, contact shadow, scenery, background objects, text, labels, frame, watermark, effects, duplicate pose, detached items, motion blur or sprite-sheet grid.

Anatomy and rig feasibility: exactly two arms and two legs unless {DESIGN} explicitly describes another creature anatomy; complete visible joints. Shoulders, elbows, wrists, pelvis, knees, ankles, hands and weapon grip remain plausible for subsequent articulated animation. Long hair, cloak, wings, tail and equipment attachments must be clear and isolatable. Preserve one coherent design across all future poses and parts.
~~~

### Negative prompt (если генератор поддерживает)

~~~text
cowboy, Wild West, revolver, sheriff, realistic, photorealistic, 3D, CGI, gritty dark realism, plastic toy, childlike baby proportions, isometric, top-down, perspective floor, landscape, horizon, shadows, gradients in background, green chroma background, duplicate character, multiple poses, sprite sheet, overlapping characters, floating feet, cropped head, missing hand, extra limb, extra finger, detached weapon, unreadable small details, text, logo, watermark, motion streak, particles, glow baked into background
~~~

Не применять слова из negative prompt механически, если они противоречат конкретной утверждённой анатомии существа (например, дополнительные лапы или крылья настоящего спутника).

## 4. Второй запрос — лист частей для анимации

Только после принятия исходного ключевого кадра прикрепить именно его в качестве reference, а не повторно генерировать нового персонажа:

~~~text
Using the APPROVED image of {ACTOR_ID} as an exact identity reference, create a clean 2D cut-out rig parts sheet of this SAME character, with transparent background. Do not redesign the face, costume, palette, proportions or equipment. Separate and clearly label in the file manifest (not on the image): head, hair or helmet, torso, pelvis, upper arms, forearms, hands, thighs, shins, feet, weapon, shield and every movable secondary part actually present in this design. Include generous opaque overlap under each joint to avoid seams while rotating. Maintain consistent scale, direction, artwork and light source. No missing pieces, duplicate limbs, composite full-character pose, labels or text on the image. Isolated parts must not touch or overlap each other in the sheet. Deliver a companion manifest of part names, anchor points and draw order.
~~~

- Проверить, что генератор **не придумал** детали с обратной стороны. Для невидимых зон использовать отдельное уточнение и ручную проверку.
- Лист частей не равен полноценному ригу: привязки к костям, IK, циклы, оружие и кадры ударов собираются и тестируются отдельно.
- Отдельные состояния: idle, walk/run, attack-1, attack-2, hit/stun, block/dodge (если применимо), victory и defeat. Для четырёхлапых/летающих спутников — собственные правдоподобные циклы, не имитация человеческих ног.
- Пыль, ударные вспышки, урон, ауры, полосы HP и другие эффекты добавляются игровым движком, а не запекаются в персонаж.

## 5. Образы, уже видимые в утверждённом главном кадре

Это **ориентиры для отдельных заданий**, не разрешение автоматически выпускать новую коллекцию без сверки с изображением.

| Роль | Достоверный образ | Боевая сторона |
|---|---|---|
| hero | Рыжебородый бронированный викинг, щит, светящийся голубой топор | RIGHT |
| companion | Светлое вьючное животное со снаряжением | RIGHT |
| companion | Небольшой тёмный летающий спутник с фиолетовыми деталями | RIGHT |
| enemy | Небольшой гоблин со щитом | LEFT |
| boss | Крупный орк с тяжёлой палицей | LEFT |

Остальные герои, спутники, враги и боссы получают собственную карточку DESIGN; не выдумывать их как будто они уже утверждены. Старые ассеты TERRITORY 1.0 запрещены в V2.

## 6. Приёмка до интеграции

- **Идентичность:** ключевой кадр и части действительно один и тот же персонаж; цветовая палитра, линии, лицо и броня не меняются между кадрами.
- **Чистый PNG:** реальный альфа-канал, без зелёных ореолов и теней на фоне; закрытые контуры, нет случайных прозрачных дыр в теле.
- **Геометрия:** ничего не обрезано, оружие держится в кисти, суставы закрываются при повороте, ноги стоят на одной земле.
- **Ракурс и размер:** правильная сторона боя и масштаб по нашему эталону; на телефонах 320 и 390 px силуэт читается.
- **Анимация:** не целиком двигающаяся картинка; сгибание конечностей, неподвижная опорная стопа, реальная точка контакта оружия в кадре атаки. Проверить покадровый лист и переходы.
- **Происхождение:** сохранены ID, текст промпта, утверждённый референс, генерация, вручную принятый результат и права на использованные внешние материалы.
- **Изоляция:** до приёмки всё в .workshop/v2-actors/; не заливать промежуточный арт в публикуемый игровой пакет, не трогать V1/Supabase.

## 7. Подключение к имеющейся мастерской

~~~bash
npm run art:workshop:prepare -- hero-ginger-axe hero
npm run art:workshop:prepare -- goblin-shield enemy
npm run art:workshop:check
~~~

Полученный BRIEF.md подсказывает сторону, а этот файл — художественный промпт. Риг и покадровую проверку собирать через отдельную мастерскую .agents/skills/ref2game/; если источник — реально анимированная 3D-модель, использовать автономный tools/3d-to-2d/. Это **не** переключатели или новые зависимости готовой игры.

### Почему не использовали исходный ковбойский файл без изменений

Исходный image_prompt.txt описывает конкретного ковбоя с револьвером, Wild West, зелёный хромакей и 2D-билборд для 3D. От него сохранены полезные принципы: один герой на холст, стабильный ракурс, читаемый силуэт, отделимость частей и чистое поле кадра. Жанр, камера и фон адаптированы под наше утверждённое 2D-направление.
