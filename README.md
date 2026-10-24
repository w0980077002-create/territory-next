# TERRITORY 2.0

> **🔒 ВИЗУАЛЬНЫЙ ДИЗАЙН ЗАФИКСИРОВАН ВЛАДЕЛЬЦЕМ 24.10.2026.**
>
> **Единственный утверждённый референс — скриншот TERRITORY 2.0 от владельца, присланный 24 октября 2026 года:** яркий мультяшный викингский автобой в заснеженной долине, боковые иконки, две сферы HP/энергии, компактная двухрядная экипировка и пять нижних кнопок «Порт / Навыки / Бой / Приключение / Магазин». **Не использовать прежние фото, старые визуальные концепты TERRITORY 1.0 или другие варианты.** Любые визуальные изменения — только в рамках этого эталона, без смены стиля и композиции.
>
> **📌 [ОФИЦИАЛЬНЫЙ ЗАКРЕПЛЁННЫЙ СТАНДАРТ TERRITORY 2.0](docs/TERRITORY_2_0_APPROVED_UI_LOCK_RU.md)** — обязателен для дизайна, генерации иллюстраций и изменений интерфейса. Там зафиксированы подробное описание *конкретного* скриншота и контрольная сумма оригинала.

Independent source repository. Based on approved development branch from TERRITORY 1.0.

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
