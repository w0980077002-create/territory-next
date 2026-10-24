# TERRITORY 2.0 — ТЕХНИЧЕСКАЯ АРХИТЕКТУРА, СХЕМА ДАННЫХ И API v1.0

**Нормативное приложение** к [главному ТЗ](TERRITORY_2_0_MASTER_TZ_RU.md), 24.10.2026.  
**Реализация:** это ПРОЕКТНАЯ схема, а не утверждение, что она уже создана в Supabase. Никаких операций с production.  
**Источники:** [исследование двух игр](TERRITORY_2_0_REFERENCE_RESEARCH_20261024_RU.md), [53 механики](TERRITORY_2_0_EVIDENCE_CATALOG.json), [эталон интерфейса](reference/TERRITORY_2_0_APPROVED_2026-10-24.jpg). Для Telegram API: [официальный Web Apps](https://core.telegram.org/bots/webapps); для доступа Supabase: [RLS](https://supabase.com/docs/guides/database/postgres/row-level-security), [функции БД](https://supabase.com/docs/guides/database/functions).

## A. Четыре изолированных окружения

```text
Telegram Mini App / web client
    React src/v2 + original graphical assets
                  |
         Authenticated HTTPS
                  v
      Independent v2 API / Edge
   ┌────────┬─────────┬──────────┐
   Auth     Combat    Economy   Social/Events
   └────────┴─────────┴──────────┘
                  |
          Postgres STAGING v2
  [ledger, rules, character, loot, receipts,
   chats, challenges, admin action journal]
                  |
           Queue/jobs/outbox
```

| ENV | Клиент | База | Допустимое поведение |
|---|---|---|---|
| `preview` | Отдельный V2, mock сценарии | БЕЗ базы | Показ демо значений, никаких живых начислений |
| `domain-test` | Тесты/фиксированные seed | In-memory/test fixture | Детерминированная симуляция, без игроков |
| `staging` | Отдельный URL, только тестовые аккаунты | НОВЫЙ Supabase project ID | Реальные серверные транзакции и тесты |
| `production-v2` | Отдельное решение владельца | Изолированный production-v2 или официально утверждённая миграция | Только после аудита/бэкапов/разрешения |

**Нельзя:** использовать `VITE_*` для сервиса с секретными ключами; направлять V2 экономику на Supabase TERRITORY 1.0; вызывать старый Telegram-бот через новый build; дублировать начисления из UI, анимации или браузерного `Math.random`; публиковать новую версию без письменного решения владельца.

## B. Разделение модулей и контрактов

| Модуль | Задача, ответственность, I/O |
|---|---|
| `src/v2/ui` | Графика точно по фото, модальные страницы, доступность, локальное состояние интерфейса; не начисляет валюту |
| `src/v2/navigation` | Route registry, backstack, deep links, меню/диалоги/ошибки и переключение вкладок |
| `src/v2/domain` | Общие типы героя, навыков, инвентаря, рун, эффектов, спутников, ограничений |
| `src/v2/client` | Проверяемые API DTO, повтор только идемпотентных запросов, optimistic read, reconciliation |
| `src/v2/core/buildLoadout.ts` | Уже добавленный локальный валидатор совместимости — **не** вычисляет истинную силу/дроп |
| `server/auth` | Верификация raw Telegram initData, проверка auth_date, создание сессии с actor/player ID |
| `server/combat` | Серверно подтверждённая встреча, детерминированные тики/правила, сохранение фазы и результат |
| `server/loot` | Версионированная таблица и строго однократная генерация результата по серверному seed/receipt |
| `server/economy` | Ledger, ограничения, акции/покупки/камни/билеты, антидубли и аудит |
| `server/progression` | XP, уровни, допустимые stage transitions, задания/профессии/спутники |
| `server/social` | PvP, события, письма, чаты, приглашения, кланы, рейтинги |
| `server/admin` | Независимая ролевая проверка, выдачи, журналы, расписания, ручные блокировки |
| `server/jobs` | Обработка outbox и времени сервера, регулярные события, восстановление после сбоя |

**Порядок разработки:** сначала типы/тесты/статусы, затем backend staging, затем подключение V2 UI. Создание заглушки не меняет статус пункта ТЗ на `done`.

## C. Структура SQL-данных (проект для НОВОЙ staging БД)

В каждой таблице: `created_at timestamptz default now()`, где требуется `updated_at`, `ruleset_version`; идентификаторы UUID либо стабильные text IDs (каталоги). При любой правке сохранять точность валюты и не допускать float для кошелька.

### C1 — идентичность и персонаж

| Таблица | Поля | Ключевые ограничения |
|---|---|---|
| `players` | `id UUID PK, telegram_user_id bigint, display_name, avatar_ref, created_at` | UNIQUE(telegram_user_id), нельзя менять ID клиента |
| `sessions` | `id UUID, player_id, nonce_hash, issued_at, expires_at, revoked_at` | TTL, поддержка отзыва и anti-replay |
| `characters` | `id UUID, player_id, class_id, level, xp, revision` | UNIQUE(player_id), checks >=0, серверный update |
| `character_stats` | `character_id, ruleset_version, derived_stats_json, revision` | Derived/cache, не пользовательский источник истины |
| `campaign_progress` | `character_id, chapter_id, stage_id, best_stage, revision` | Условие открытия, никакого принудительного скачка |
| `battle_sessions` | `id, player_id, mode, stage_id, enemy_config_id, ruleset_version, state, seed_ref, started_at, settled_at, receipt_id` | Встреча проводит settle не более 1 раза |
| `battle_events` | `battle_id, seq, tick, source_id, target_id, action_type, payload_json` | UNIQUE(battle_id,seq), неизменяемые |
| `player_settings` | `player_id, bg_home_id, bg_arena_id, effects, sound, graphics, language, reduced_motion` | UI-настройки отдельно от экономики |

### C2 — валюты и экономический ledger

| Таблица | Поля и правила |
|---|---|
| `currency_definitions` | `id PK, precision, enabled, max_balance, ruleset_version`. Валюта в конкретной игре не определяется одним цветом на референсе |
| `wallet_balances` | `player_id, currency_id, balance_minor_units BIGINT, revision, PRIMARY KEY(player_id,currency_id), CHECK(balance_minor_units>=0)` |
| `wallet_ledger` | `tx_id UUID PK, operation_id, player_id, currency_id, delta_minor_units BIGINT, balance_after, reason, ruleset_version, created_at`; append-only |
| `operation_receipts` | `operation_id PK, player_id, action, request_hash, status, response_json, started_at, completed_at`. Повтор с тем же hash возвращает прежний результат, другой hash → конфликт |
| `reward_claims` | `player_id, source_kind, source_id, period_key, receipt_id, claimed_at`; UNIQUE по комбинации/бизнес-правилу |
| `purchase_orders` | `order_id, player_id, product_id, platform, provider_ref, amount, currency, state, verified_at, receipt_id`; webhook signed and idempotent |
| `promo_redemptions` | `promo_id, player_id, receipt_id, claimed_at` UNIQUE(promo_id, player_id) |
| `ad_rewards` | `provider_receipt_hash, player_id, placement_id, policy_period, receipt_id` UNIQUE(provider_receipt_hash) |

**Важно для 0.2 красного алмаза:** `minor units` с явно установленной точностью валюты в отдельном каталоге; **не** бинарный floating-point. Изменение точности через миграцию/проверку, не silent округление.

### C3 — предметы, билды, спутники

| Таблица | Поля / инвариант |
|---|---|
| `gear_definitions` | `item_type_id, slot_id, rarity_id, set_id?, allowed_classes, ruleset_version` |
| `item_instances` | `item_instance_id UUID PK, player_id, item_type_id, level, affixes_json, upgrades, favorite, locked, origin_receipt_id, revision`. FK владельца |
| `equip_assignments` | `character_id, slot_id, item_instance_id, revision`, UNIQUE(character_id,slot_id), UNIQUE(item_instance_id), owner matches character |
| `gear_sets` | `set_id, item_types, thresholds, effects, ruleset_version`, только опубликованные сервером правила |
| `skills` | `skill_id, class_id, category, effect_id, trigger_config, unlock_policy, ruleset_version` |
| `runes` | `rune_id, eligible_skill_ids, effect_modifiers, ruleset_version` |
| `presets` | `id, character_id, name, version, enabled`, ссылки только на вещи того же игрока |
| `preset_slots` | `preset_id, slot_kind, slot_key, ref_id`; UNIQUE(preset_id,slot_kind,slot_key) |
| `companions` | `instance_id, player_id, type_id, level, awakening_rank, talents_json, version` |
| `companion_squad` | `character_id, primary_id?, support_ids[], revision` + серверная проверка уникальности |
| `rune_engravings` | `instance_id, player_id, type, rank, effect_ids, locked, receipt_id` |
| `salvage_events` | `operation_id PK, removed_item_ids[], credited_material_receipts[], created_at`, проверка отсутствия защищённых предметов |

### C4 — социальные и сезонные

`quests + quest_progress + quest_claims`, `season_rules + season_participants + season_rank_snapshots + season_rewards`, `arena_matches + arena_events + arena_rating_changes`, `chat_rooms + chat_messages + chat_moderation_reports`, `referrals + referral_claims`, `mail_messages + mail_recipients + mail_claims`, `clans + clan_members + clan_events`, `raid_runs + raid_participants`, `dungeon_progress + dungeon_runs`, `ships + voyages`, `mining_jobs`, `minigame_runs`, `event_instances + event_attempts + temporary_event_inventory`, `admin_audit_log + admin_outbox + scheduled_mail`.

Для каждой сущности ID, владелец/участник, window/period где применимо, статус, версия правил и operation/receipt reference. Временный событийный инвентарь никогда не смешивается с постоянным `item_instances`, поэтому проигрыш сезонного рейда не может затронуть постоянный кошелёк/инвентарь без **отдельно утверждённого правила**.

## D. Авторизация и политики доступа

- Клиент передаёт **raw** `Telegram.WebApp.initData`; **не** доверять `initDataUnsafe` / username / userId в JSON как доказательству личности. На сервере реализовать проверку HMAC по bot secret либо официальную third-party Ed25519 по bot ID; **не смешивать алгоритмы**; проверить `auth_date` и свой срок годности. <https://core.telegram.org/bots/webapps>.
- Только после проверки привязать `players.telegram_user_id`. Ключи и секреты хранятся в server secrets; никогда в vite-клиенте и логах.
- Если используется Supabase Data API, включить RLS на **всех** exposed таблицах. Сам игрок читает только допустимые строки/поля; критические таблицы экономики **не открывать напрямую для client writes**. Сервисные роли и DB-функции — минимальные права; `SECURITY DEFINER` только при аудите, фиксированном `search_path`, ограниченном `EXECUTE` и не в открытой схеме.
- Разделить `player`, `moderator`, `operator`, `owner` серверными ролями. Скрытый вход в UI не является защитой API. Исключительно owner вручную решает `warn/ban/unban`; никакого автоматического бана по anomaly score.
- Логи обрезают пользовательские токены, персональные данные и секреты. Доступ к данным игроков ограничен ролью и необходимостью.

## E. JSON HTTP контракт (предлагаемая схема собственной игры)

### E1 — стандартный запрос / ответ

Каждый изменяющий запрос: `Idempotency-Key: <UUID>`, `Authorization: Bearer <short-lived server session>`, `X-Client-Version`. GET может отвечать `ETag/state_revision`. Сервер всегда извлекает `playerId` из сессии, **не доверяет полю playerId**.

Успех:
```json
{
  "ok": true,
  "operationId": "uuid",
  "stateRevision": 42,
  "rulesetVersion": "v2-config-001",
  "receiptId": "uuid",
  "data": {}
}
```

Ошибка:
```json
{
  "ok": false,
  "operationId": "uuid",
  "code": "INSUFFICIENT_RESOURCE",
  "messageKey": "economy.insufficient",
  "retryable": false,
  "currentStateRevision": 42
}
```

Ошибка не должна самовольно вычитать валюту или выдавать приз. `409 VERSION_CONFLICT` → перечитать состояние; `409 IDEMPOTENCY_CONFLICT` → тот же key при других args; `401 AUTH_EXPIRED` → повторить handshake; `429 RATE_LIMITED` → сервер сообщает ограничение; `5xx` → можно безопасно повторить только с **тем же idempotency key**.

### E2 — маршруты API v2

| Endpoint / операция | Входные поля | Ожидаемый выход и ограничения |
|---|---|---|
| `POST /v2/auth/telegram` | raw initData | server session, `player snapshot` |
| `GET /v2/bootstrap` | authenticated session | статусы фич, версии контента, интерфейса, персонажа, канала |
| `GET /v2/me` | — | профиль, currency mapping, equipped gear, companions |
| `GET /v2/campaign` | — | глава, этапы, unlock state |
| `POST /v2/battles` | `mode, stageId, loadoutRevision` | `battleId`, seed reference, состояние/цена до старта |
| `GET /v2/battles/:id` | — | авторитетное состояние, события, итоги |
| `POST /v2/battles/:id/actions` | `actionType, expectedTick` | применённое действие или reason rejection |
| `POST /v2/battles/:id/settle` | `battleId` (не `win=true`) | серверный итог, receipt, XP/дроп, новое состояние |
| `GET /v2/inventory` | фильтр, cursor | пагинация, item revisions, ownership |
| `POST /v2/inventory/equip` | `itemInstanceId, slotId, expectedRevision` | новое снаряжение/статы или конфликт |
| `POST /v2/inventory/salvage` | `itemIds[], expectedRevisions[]` | однократное удаление + credited materials |
| `POST /v2/inventory/upgrade` | `itemId, expectedRevision` | проверенный расход/уровень/receipt |
| `GET /v2/builds` | — | навыки, руны, классы, сохранённые пресеты |
| `PUT /v2/builds/:id` | валидный blueprint, revision | атомарная смена сборки |
| `POST /v2/companions/assign` | main/support IDs, revision | состав отряда и расчётные ауры |
| `POST /v2/professions/start` | resource, professionId | заявка на единственную добычу |
| `POST /v2/professions/claim` | miningJobId | единичная выдача |
| `POST /v2/voyages/start` | shipId, routeId | voyageId и серверное returnAt |
| `POST /v2/voyages/claim` | voyageId | результат/receipt |
| `POST /v2/arena/match` | допустимый режим | matchId + проверенные snapshots |
| `POST /v2/arena/matches/:id/settle` | matchId | серверные рейтинг и награды |
| `GET /v2/chat/rooms/:id/messages` | cursor | сообщения по политике доступа |
| `POST /v2/chat/rooms/:id/messages` | body, client nonce | одно сообщение, антиспам |
| `GET /v2/quests` | type | задачи/прогресс/периоды |
| `POST /v2/rewards/claim` | sourceId, periodKey | единичная награда/receipt |
| `POST /v2/shop/checkout` | productId, catalogRevision | server verified checkout order |
| `POST /v2/payments/webhook` | signed provider payload | только server-to-server; одна выплата по validated order |
| `POST /v2/ads/claim` | providerReceiptId | сервер проверяет рекламное подтверждение/лимит |
| `POST /v2/promos/redeem` | code | один claim/код/аккаунт/условие |
| `POST /v2/events/:id/start` | rulesRevision | separate eventAttempt, temporary inventory |
| `POST /v2/events/:id/extract` | attemptId | серверно подтверждённый событийный лут |
| `GET /v2/admin/players` | owner session + filters | только authorized owner |
| `POST /v2/admin/mail/schedule` | recipient selector, up to 3 rewards, sendAt | signed owner action + delivery outbox |

Эти названия — **контракт предложенной реализации TERRITORY**, не подтверждение, что конкуренты имеют такие API. Первая кодовая задача — типизированные DTO + mock handler, затем service endpoints в staging. Любой код считает endpoint `not-implemented`, пока соответствующие тесты не проходят.

## F. Детерминизм боя и жизненные циклы

**Боевая встреча:** `requested → authorized → ready → running → result_pending → settled`; отдельные `cancelled`, `failed`, `expired` с правилами без двойной награды.

- `authorized`: проверены владение героем, режим, требуемые материалы/попытки, период и `build_revision`.
- `running`: authoritative combat service сохраняет version+seed+inputs+команды. Клиент получает события; **не отправляет итоговые значения HP, шанс выпадения или свою версию победы**.
- `result_pending`: server-calculated outcome на базе сохранённых входных; unlock следующего этапа после settle.
- `settled`: существующий receipt неизменен. Повтор запроса `settle` возвращает исходный receipt, а не повторяет выпадение вещей.
- При сетевом разрыве восстановить `battleId`, `lastEventSeq`, `stateRevision` или безопасно сформировать подтверждённый сервером `expired`.

**Расчёт эффекта** для самостоятельного TERRITORY-проекта обязателен как последовательный pure-function pipeline: `snapshot combatants → turn ordering → choose action → preconditions/resources → hit/evade/block → mitigation/elemental/resistance → status application → cleanup/cooldowns/death → next tick`. **Точные коэффициенты, очередность отдельных конфликтующих эффектов и условия открытия TBD** до отдельного утверждения правил. Пайплайн не является приписываемым Lootborn исходником.

**Предмет:** `stored → equipped → unequipped → upgraded/forged`; `salvaged` терминальное состояние, никогда не восстанавливается случайным повтором запроса. Favorite/locked/equipped проверяются в момент commit.

**Ресурсный таймер:** `idle → running → finished → claimed`; одна активная `running` на персонажа для наследованного режима TERRITORY. Нельзя перевести `finished → running` и одновременно выдать два приза.

**Почта/код/задание:** `eligible → claim_pending → claimed`; любой claim идемпотентный и не может быть проведён до `eligible`.

## G. Как избежать ошибок старой экономики

1. Любая начисляющая операция имеет `operation_id`, `idempotency_key`, `player_id`, `ruleset_version`, `response_hash`.
2. Фиксировать ключи уникальности для ledger/receipt/платёжного webhook; демонстрационный клиент **не** вызывает наградные RPC.
3. Активные (двойные) запросы по кнопке вызывают **один commit**; повтор с тем же idempotencyKey возвращает оригинал, с другим не может пройти если требование уже выполнено.
4. В каждой операции блокировать необходимые wallets/items в **одном** предсказуемом порядке; проверять транзакционный конфликт и версионирование, корректно откатывать целиком.
5. Партнёрские рекламные награды и платежи — только подписанный/подтверждённый источник; не доверять `adWatched=true`.
6. Бесконечный клиентский цикл боёв не выдаёт деньги. Клиентские JS-исправления не становятся новым server ruleset.
7. Отдельный флаг остановки рисковых операций при аномалии, но не автоматическая блокировка игрока; события передаются владельцу.
8. Дробные валюты — `minor units` и единая конфигурация точности; арифметика не через `Number` float в финансовых трансакциях.
9. История сохранений/миграций с hash и dry-run; rollback исходной базы 1.0 запрещён без владельца.

## H. Оперативная надёжность, аналитика и observability

Сигналы: `client_boot_ms, scene_ready_ms, long_task_count, frame_drop_ratio, active_player_24h, inactive_reconnect, login_error_rate, battle_settle_latency, inventory_open_latency, write_conflict_rate, duplicate_receipt_prevented, wallet_anomaly_rate`. **Пороговые SLO TBD** — измерить на реальных бюджетных телефонах и согласовать после профилирования, не выдавать рекламную оценку за проверенную скорость.

Логи обязаны включать `requestId, playerId pseudonymous, operationId, featureId, rulesVersion, clientBuild, eventVersion, stateRevision, resultCode` без токенов/секретов; retention policy определить отдельно. Клиентские и серверные ошибки доступны только владельцу/уполномоченным ролям. Админка в разделе «подозрительные» показывает объяснимую причину/действие/транзакцию, но **не банит сама**.

## I. Матрица миграций и версионирования

1. Snapshot `players/characters/wallet/equipment/companions/VIP/referrals`; до миграции — полный backup + manifest (counts, balances, inventories hash).
2. Dry run в отдельной БД; compare неизменяемые ID, валюты, VIP, опыт, надетые вещи, follower IDs.
3. Для каждого legacy слота явно объявить `legacy_slot → v2_slot`; нет mapping → ничего не удалять, в quarantine inventory, требовать ручного решения.
4. Изменение `rules_version` не приводит к тихой потере вещи/ресурса; если рекалькуляция стата изменяет боевую силу, показывать различие и делать отдельный балансовый аудит.
5. Ни один staging запрос/домен/бот не является автоматическим способом перезапуска старой игры.
6. Feature flags: `previewOnly`, `pveEnabled`, `gearWritesEnabled`, `pvpEnabled`, `paymentsEnabled`, `migrationsAuthorized`. Дефолт для новых реальных функций `false` до проверенной миграции.
7. Релиз только после проверок [приёмки](TERRITORY_2_0_ACCEPTANCE_AND_TRACEABILITY_RU.md) и отдельного распоряжения владельца.

## J. Что неизвестно и не может быть «1 в 1» без дополнительного доказательства

Формулы выпадения, RNG и гарант, все серверные уравнения статов и PvP, оригинальная серверная нейросетевая логика, порядок скрытых эффектов, цены, unlock thresholds, текущие API и закрытые видео/сообщества. **Прямое копирование чужих иллюстраций, кода и защищённого оформления не допускается**. По этим вопросам создаются отдельные честные параметры TERRITORY в [реестре неизвестного](TERRITORY_2_0_UNVERIFIED_PARAMETERS_RU.md), а не «точные сведения» без источников.
