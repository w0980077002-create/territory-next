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

## Главное ТЗ TERRITORY 2.0 — разработка строго по документам

**Каноническая последовательность до любого изменения игрового кода:**
1. [Master ТЗ 1.0 — все 34 экрана, 13 систем игрового цикла и принципы 1:1](docs/TERRITORY_2_0_MASTER_TZ_RU.md).
2. [Техническая архитектура, схема БД, API, идемпотентность и безопасность](docs/TERRITORY_2_0_TECHNICAL_ARCHITECTURE_RU.md).
3. [Матрица приёмки 1:1 и 55 сквозных тест-кейсов](docs/TERRITORY_2_0_ACCEPTANCE_AND_TRACEABILITY_RU.md).
   - [Атлас UI/UX: 34 экрана, каждое действие, ошибки и состояния](docs/TERRITORY_2_0_SCREEN_BY_SCREEN_CONTRACT_RU.md).
4. [Реестр 36 неизвестных величин — не выдумывать](docs/TERRITORY_2_0_UNVERIFIED_PARAMETERS_RU.md).
5. [Машинная трассировка всех 53 доказательных записей к требованиям и тестам](docs/TERRITORY_2_0_IMPLEMENTATION_TRACE.json).
6. [Единственное финальное фото от владельца](docs/reference/TERRITORY_2_0_APPROVED_2026-10-24.jpg).

`npm run test:master-spec` проверяет полноту документации и SHA-256 владельческого эталона. **Документы не равны готовой игре.** Экраны, источники и зафиксированные механики должны проходить E2E и серверные тесты перед публикацией. Не подключать production первой TERRITORY.


## Проверенный серверный Telegram API (staging)

**Новый:** [Telegram gateway, защищённое создание игрока/героя и HTTPS-проверка](docs/TERRITORY_2_0_TELEGRAM_GATEWAY_20261024_RU.md). Edge Function `territory-v2-api` развёрнута только в V2 Supabase `ksikzkrvuuhermhnbycn`; **выключена для реальных игроков до подключения нового Telegram бота**, frontend Pages остаётся демоверсией. Фон не меняли.

## Серверный PvE согласно ТЗ — 24.10.2026

[Серверный расчёт боя, защита от двойных активных боёв и однократная запись результата в отдельном Supabase](docs/TERRITORY_2_0_SERVER_PVE_MILESTONE_RU.md). **SQL внедрён и проверен на staging; реальный PvE API для игроков и выдача наград ещё не включены.** Фон и визуальные файлы не менялись.

## Защищённая серверная основа V2

[Серверные миграции, проверка Telegram initData, тесты и ограничения реального запуска](docs/TERRITORY_2_0_SERVER_FOUNDATION_20261024_RU.md) — внедрены в отдельное staging без игроков и платежей. Экран V2 пока работает в изолированном демонстрационном режиме; реальная авторизация ещё не включена.

## Текущая реализация TERRITORY 2.0

[Первый работающий пакет: интерфейс по эталону, этапы, навыки/сборки, тесты и приватная staging SQL-заготовка](docs/TERRITORY_2_0_IMPLEMENTATION_20261024_RU.md). Реальный сервер, сохранения игроков и платежи **не подключены**; код является изолированным preview, без публикации.

## Раздельные базы: проверено 24.10.2026

- **TERRITORY 1.0 — production:** `wmyrdpbwlkzsktnhookx` (`bolt-native-database-71669285`). Не изменять, не вызывать V2 API на этом проекте.
- **TERRITORY 2.0 — staging:** `ksikzkrvuuhermhnbycn`, приватная схема `territory_v2`. В проекте создано 12 таблиц с включённым RLS, без клиентских SELECT/WRITE прав. **Действующие игроки 1.0 не мигрировали и не подключались.**
- Клиент `index.html` запускает отдельный `src/v2/main.tsx`, не наследованный `src/main.tsx`.
- [Подтверждённые ID и ограничения](server/staging/approved-project.json) · [аудит и история миграции](docs/TERRITORY_2_0_SUPABASE_REAL_PROJECT_AUDIT_20261024_RU.md).
- Запускать `npm run test:project-isolation`. Одна организация или доступ администратора к двум проектам **не означает** общую базу или один игровой ключ.

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
