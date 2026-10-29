# TERRITORY 2.0 — 29.10.2026: PvE session lifecycle, time policy and recovery

**Repository:** `w0980077002-create/territory-next`, branch `main`. **Scope:** isolated V2 code and CI only. **No deployment of the new migration**, no public PvE endpoint, no live rewards or purchases.

## Implemented

1. `server/staging/territory_v2_pve_lifecycle.sql` adds a private **fail-closed** `pve_session_policy`: no policy row exists by default, so new sessions cannot begin after this migration until V2 operators explicitly configure minimum and maximum server-side durations. There are no guessed live durations. Database constraints require 1–3600 seconds minimum and a larger 2–86400 seconds maximum. Values in tests are **fixtures only**.
2. The `battle_sessions` trigger rejects early and late settlement based on **PostgreSQL server time**, not browser clocks. The existing resolution receipt and stage clear roll back together if settlement is too early or expired. It also rejects attempts to reopen a settled, expired or cancelled session.
3. When a new server-authorized battle begins, the trigger expires only that same player's stale active sessions **in the same SQL transaction**, allowing recovery from interrupted clients without weakening the existing one-active-battle unique index. Each expiration is recorded once in a private `pve_session_expirations` audit table.
4. `read_pve_lifecycle(verified_telegram_id,battle_id)` returns **only** battle ID and safe lifecycle status. An old running battle is reported as expired after the deadline even before the next start commits cleanup; another player cannot read it. `inspectServerPveLifecycle` in `server/combat/runAuthoritativePve.ts` is the server-only TypeScript adapter. Neither endpoint exposes a seed, private snapshot, hero stats or the time policy.
5. `scripts/check-v2-pve-lifecycle.mjs` runs a PostgreSQL/PGlite integration scenario covering fail-closed configuration, invalid policy, early finish/atomic rollback, valid finish, idempotent retry, terminal-state protection, stale-session cleanup, other-player isolation, status read, RLS, high-level `begin_pve_execution`, no ledger, no XP and no item grants. Registered in `npm run test:v2` and the existing main CI workflow.

## Security and deployment boundary

- Migration is **source code only**; not applied to Supabase or any Telegram bot. Existing V2 staging and all V1 services remain untouched.
- **Important migration order:** `territory_v2_schema.sql` → `territory_v2_pve_protocol.sql` → `territory_v2_pve_stage_progress.sql` → `territory_v2_pve_execution.sql` → `territory_v2_pve_lifecycle.sql`.
- Do not deploy or expose a public start/finish endpoint until V2-only Telegram HMAC, authenticated identity binding, rate limits, approved game balance, session policy and reward settlement have been separately reviewed. The policy is intentionally empty.
- The approved UI screenshot, `docs/reference`, all background images, 10-future-background plan, current V2 demo and V1 game are unchanged.
- This phase does **not** solve actual battle duration simulation, game balance, anti-bot detection or server XP/loot settlement. It closes the specific stale-session and immediate-result loopholes in the private SQL lifecycle.

## CI acceptance

`npm run test:v2` includes `node scripts/check-v2-pve-lifecycle.mjs`. GitHub Actions runs TypeScript, the full isolated test suite and an offline-only build. See latest `main` Actions run; if failed, fix code rather than disabling tests.
