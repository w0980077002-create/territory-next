# TERRITORY 2.0 — серверный Telegram API и профиль (24 октября 2026)

## Статус внедрения

**Фактически развёрнуто** в Supabase-проекте `ksikzkrvuuhermhnbycn` (staging) Edge Function `territory-v2-api`, версия 1; `verify_jwt=false` **исключительно потому, что собственная криптографическая авторизация Telegram по RAW initData выполняется в теле функции**. Функция НЕ предоставляет никаких операций со средствами, наградами, вещами или PvE-исходами.

**Готово к использованию только после настройки отдельного нового бота** и явного серверного флага: `TERRITORY_V2_BOT_TOKEN`, `V2_ENABLE_TELEGRAM_GATEWAY=yes`. Никаких бот-токенов/ключей в GitHub не добавлялось. Без обоих условий API отвечает `503 V2_GATEWAY_NOT_CONFIGURED` на защищённые запросы, поэтому реальные игроки, включая первой TERRITORY, не могут регистрироваться случайно. Сейчас флаг **выключен**, что подтверждено внешним HTTPS-тестом.

## Файлы

- `server/telegram/verifyInitData.ts` — собственная серверная проверка HMAC SHA256 из Telegram initData, дата авторизации/TTL, защита от дублированных и поддельных полей, удаление невалидных URL фото.
- `server/api/telegramGateway.ts` — общий HTTP контракт: allowlist Origin, запрет посторонних полей, корректная проверка размера и Content-Type, никаких клиентских playerId / wallet / xp / классов вне разрешённого набора.
- `supabase/functions/territory-v2-api/index.ts` — реальный Deno Edge handler, работает **только** если `SUPABASE_URL=https://ksikzkrvuuhermhnbycn.supabase.co` и включён V2 gateway. Прямое серверное SQL-подключение к закрытой схеме `territory_v2` с параметризованными запросами. Использует отдельный `SUPABASE_DB_URL` платформы, без DB URL в коде. Не подключён к production `wmyrdpbwlkzsktnhookx`.
- `scripts/check-v2-telegram-gateway.mjs` — локальные тесты HTTP-протокола: не доверять Origin/ID, не создавать до подлинной подписи, отключение без секретов, запрещённые классы, CORS, запрет фиктивных сумм.
- `scripts/check-v2-edge-health.mjs` и `.github/workflows/v2-edge-health.yml` — **реальная удалённая проверка опубликованной функции** по HTTPS, без токенов и тестовых записей в БД.

## HTTP контракт

- `GET https://ksikzkrvuuhermhnbycn.supabase.co/functions/v1/territory-v2-api/health` → `{mode:"isolated-v2-staging",enabled:false}` сейчас. Только диагностический статус.
- `POST /functions/v1/territory-v2-api/profile` — тело только `{ "initData": "<raw Telegram WebApp.initData>" }`; HMAC обязателен; read-only snapshot `registered`, свой `player`, свой `hero`, свои `wallets` (минимальные единицы валют представлены строками без потери BIGINT). Не создаёт аккаунт.
- `POST /functions/v1/territory-v2-api/join` — тело только `{ "initData": "...", "classId": "berserker"|"runemage"|"ranger" }`; аутентифицирует Telegram и вызывает существующие private `upsert_verified_telegram_player` + `create_character_once` **в одной транзакции**, возвращает собственный snapshot. Повтор не меняет класс и не создаёт второго персонажа.
- Все чувствительные ответы содержат `Cache-Control: no-store`; CORS разрешён только origin `https://w0980077002-create.github.io`. CORS — доп. ограничение, но **не** замена проверки Telegram-подписи.
- Ни один метод не принимает от клиента Telegram ID в JSON, сумму награды, боевой итог или ссылку на чужой профиль.

## Реальные проверки

[GitHub Actions — HTTPS server smoke success](https://github.com/w0980077002-create/territory-next/actions/runs/40082833305): `enabled=false`, запрос с неподписанными данными возвращает `503`, Origin злоумышленника — `403`. Тест обращения к serverless сделан напрямую с GitHub Actions; наличие успешного деплоя само по себе НЕ считалось доказательством запуска.

[GitHub CI — типы, тесты, демосборка](https://github.com/w0980077002-create/territory-next/actions/runs/40082647714). Авторизация и DAO с реальным Telegram бот-токеном/аккаунтом пока **не проходили end-to-end**, потому что отдельного токена V2 в Supabase нет.

## Что остаётся по Master ТЗ

1. Отдельный V2 Telegram-бот и secret + явная подготовка к включению gateway, затем тест подписанного initData и server query.
2. Надёжный distributed rate limit, защита повторного использования initData в чувствительных потоках и короткоживущие сессии/отзыв для реального релиза.
3. Показ настоящих данных в V2 интерфейсе с безопасным guest/demo режимом, синхронизация прогресса.
4. Связь auth → серверный PvE ruleset → авторитетный бой → однократные receipts для наград в одном транзакционном контуре; никаких серверных побед с браузерного расчёта.
5. Визуальный контракт по `docs/reference/TERRITORY_2_0_APPROVED_2026-10-24.jpg`; **нынешний фон не изменялся** и подготовка 10 разных фонов — более поздний самостоятельный этап.

**Категорически запрещено:** менять GitHub `territory-game-builde` или живой Supabase `wmyrdpbwlkzsktnhookx`, переносить туда проект V2, использовать пароль/токен V1.
