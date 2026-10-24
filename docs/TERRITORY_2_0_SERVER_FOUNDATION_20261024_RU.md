# TERRITORY 2.0 — РЕАЛЬНАЯ СЕРВЕРНАЯ ОСНОВА (24.10.2026)

**Только:** `w0980077002-create/territory-next` и staging Supabase project `ksikzkrvuuhermhnbycn`.  
**НЕ ТРОГАТЬ:** рабочую TERRITORY 1.0 (`territory-game-builde` и Supabase `wmyrdpbwlkzsktnhookx`).  
**Дизайн:** [единственный утверждённый скриншот](reference/TERRITORY_2_0_APPROVED_2026-10-24.jpg).

## Что действительно внедрено в staging Supabase

1. Ранее: схема `territory_v2` с **12 приватными таблицами** с RLS. Ни одна из таблиц не видна обычному `anon` или `authenticated`-клиенту; публичные старые таблицы не изменены.
2. **Новая миграция:** [`territory_v2_atomic_wallet.sql`](../server/staging/territory_v2_atomic_wallet.sql) — атомарное внутреннее начисление и списание с `operation_id`, проверкой повторов, уникальным receipt, ledger, безопасной числовой арифметикой и отказом при недостатке валюты. `SECURITY INVOKER`, выполнять может только `service_role`. Функция **не является публичной выдачей награды** и не имеет связи с настоящими игроками.
3. **Новая миграция:** [`territory_v2_verified_player_identity.sql`](../server/staging/territory_v2_verified_player_identity.sql) — серверный поиск/обновление профиля по неизменяемому Telegram user ID и однократное создание персонажа выбранного класса (временный набор ID `berserker/runemage/ranger`). Повторный вход не создаёт второй аккаунт и не меняет класс. Это **действие после авторизации**, не верификация Telegram-токена.
4. **Новый модуль проверки Telegram:** [`server/telegram/verifyInitData.ts`](../server/telegram/verifyInitData.ts) — проверяет HMAC-SHA256 от RAW `initData` по официальной схеме Telegram, срок жизни, подмену ID, дубли полей и подпись неправильного бота. **Не** используется в Vite/браузере и не хранит секретов.
5. Тесты: [экономика](../scripts/check-v2-atomic-wallet.mjs), [идентичность](../scripts/check-v2-verified-player-identity.mjs), [подпись](../scripts/check-v2-telegram-initdata.mjs), [изоляция проектов](../scripts/check-v2-project-isolation.mjs). Включены в `npm run test:v2`, затем `npm run typecheck` и `npm run build`.

## Проверки на настоящем PostgreSQL

- Новые функции успешно мигрированы **только в `ksikzkrvuuhermhnbycn`**. Проверены доступы: `anon=false`, `authenticated=false`, `service_role=true`.
- Для экономики выполнено `BEGIN → тестовые операции → ROLLBACK`: повтор начисления, попытка изменить сумму с тем же `operation_id`, списание, перерасход. После проверено: **0 V2 игроков, 0 V2 ledger записей, 0 V2 receipts**.
- Для личности аналогично проверены повторный Telegram ID, повторный выбор класса и отказ в его неявной замене, затем `ROLLBACK`: новые аккаунты не остались.
- Исходная тестовая запись `public.players` в проекте staging оставлена как была; рабочая база `wmyrdpbwlkzsktnhookx` не участвовала ни в одном выполнении миграции.

## Ключевые границы безопасности и что ещё НЕ выполнено

**Пока отсутствует новый рабочий Telegram bot token, отдельный проверенный Edge API и создание серверной сессии.** SQL-функция `upsert_verified_telegram_player` **сама не аутентифицирует пользователя**; её будущий серверный вызывающий код обязан сначала проверить отдельный секрет бота TERRITORY 2.0 с помощью `verifyV2TelegramInitData`, проверить истечение, rate limits, затем вызвать доступную только серверу БД.

**Фронтенд ещё не подключён к реальному V2 серверу.** Данные в V2 UI остаются демо. Настоящий PvE, проверяемый боевой результат, таблицы дропа, награды, платежи, аукцион, PvP, VIP НЕ выдаются за реализованные только потому, что есть функции сохранения. Никаких Web3-выплат или случайных чисел без согласованного оригинального баланса TERRITORY.

**Никакого ключа бота, `service_role`, DATABASE_URL или секретного токена в GitHub либо клиентском `VITE_*`.** Настоящий запуск игроков и миграция из 1.0 запрещены до отдельного одобрения.

## Очередь разработки

1. Отдельный server-to-server V2 auth endpoint с проверенным `initData`, безопасными секретами и короткоживущей сессией.
2. Подключение настоящего read-only player snapshot к V2 экрану (с включением только для staging); выбор класса на сервере.
3. Серверный PvE-комбат и `battle_session` receipts → легальный лут/предметы через единый wallet ledger; защита от гонок и прерываний.
4. Навыки, руны, спутники и их реальные эффекты; точные значения из утверждённого отдельного баланса, не из догадок о конкуренте.
5. Сверка UI 1:1 с **только утверждённым фото**; полные тесты на телефонах; никакого доступа игроков к V2 до выпуска.

**Источник алгоритма подписи:** [Telegram Mini Apps — Validating data](https://core.telegram.org/bots/webapps#validating-data-received-via-the-mini-app).
