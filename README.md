# TERRITORY 2.0

> **🔒 ВИЗУАЛЬНЫЙ ДИЗАЙН ЗАФИКСИРОВАН ВЛАДЕЛЬЦЕМ 24.10.2026.**
>
> **Единственный утверждённый референс — скриншот TERRITORY 2.0 от владельца, присланный 24 октября 2026 года:** яркий мультяшный викингский автобой в заснеженной долине, боковые иконки, две сферы HP/энергии, компактная двухрядная экипировка и пять нижних кнопок «Порт / Навыки / Бой / Приключение / Магазин». **Не использовать прежние фото, старые визуальные концепты TERRITORY 1.0 или другие варианты.** Любые визуальные изменения — только в рамках этого эталона, без смены стиля и композиции.
>
> **🖼️ [ОРИГИНАЛ УТВЕРЖДЁННОГО ФОТО ЭТАЛОНА](docs/reference/TERRITORY_2_0_APPROVED_2026-10-24.jpg)** — файл владельца в исходном разрешении 864×1536, сохранён байт-в-байт.
>
> **📌 [ОФИЦИАЛЬНЫЙ ЗАКРЕПЛЁННЫЙ СТАНДАРТ TERRITORY 2.0](docs/TERRITORY_2_0_APPROVED_UI_LOCK_RU.md)** — обязателен для дизайна, генерации иллюстраций и изменений интерфейса. Там зафиксированы подробное описание *конкретного* скриншота и контрольная сумма оригинала.

Independent source repository. Based on approved development branch from TERRITORY 1.0.

## Подтверждённые референсы игровых механик (24.10.2026)

**Обязательное исследование перед любыми доработками игры:**
- [Исследование Lootborn Warriors / 英雄没有闪 и Call of Odin's Chosen: факты, версии, каналы, YouTube и оговорки](docs/TERRITORY_2_0_REFERENCE_RESEARCH_20261024_RU.md)
- [Проверяемый план внедрения игровых систем](docs/TERRITORY_2_0_SOURCE_BASED_BACKLOG_RU.md)
- [Машинный каталог из 53 связанные с источниками механики](docs/TERRITORY_2_0_EVIDENCE_CATALOG.json)
- [Окончательно утверждённое изображение UI](docs/reference/TERRITORY_2_0_APPROVED_2026-10-24.jpg)

**Правило «без догадок»:** наличие механики подтверждается источником, но все отсутствующие в достоверных данных проценты, формулы, цены, таймеры и шансы считаются `TBD`, а не выдумываются. Это техническая спецификация дальнейшего направления, **не подтверждение готовности игры**. Call of Odin's Chosen закрыта с 29.09.2026, Web3/денежные обещания автоматически не переносим. Дизайн только с утверждённой картинки, никакой чужой графики. Старую TERRITORY 1.0 не трогать.

## Status
This is **development code**, not a live game and not safe to connect to the
existing production Supabase project. The `main` branch here must not be
deployed to players until complete testing, staging backend and migration.

## UI prototype
Open `public/v2-preview.html` via a static web server (or its built copy).
The preview simulates combat and screens offline with no player credentials.

**Note:** Existing code, staging preview or legacy assets are NOT proof of visual approval. Compare every V2 screen against the locked owner screenshot and the official reference standard above; correct discrepancies toward that standard, never by reverting to older designs.

## Build
`npm ci` then `npm run typecheck`, `npm run test:v2`, `npm run build`.

## Approved UI
Only the owner-approved 2026-10-24 screenshot is the visual source of truth.
Bright illustrated Viking fantasy; bottom Порт / Навыки / raised central Бой /
Приключение / Магазин; Arena button above blue energy orb; HP and
two-row equipment grid remain visible. All previous UI concepts are superseded.
Preserve legacy players and admin systems. **TERRITORY 1.0 remains separate and untouched.**
