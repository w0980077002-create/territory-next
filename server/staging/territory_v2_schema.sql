-- TERRITORY 2.0 STAGING-ONLY PRIVATE SCHEMA MIGRATION.
-- Run ONLY in the explicitly approved V2 staging project by verified PROJECT REF.
-- Never run in the live Bolt database; do not modify existing public tables.
-- Uses a non-exposed schema and default-deny row security. Client cannot write.
-- Source: docs/TERRITORY_2_0_TECHNICAL_ARCHITECTURE_RU.md.
begin;

create schema if not exists territory_v2;
revoke all on schema territory_v2 from public, anon, authenticated;
grant usage on schema territory_v2 to service_role;

-- Restrict defaults inside the PRIVATE schema; no unauthenticated table or RPC.
alter default privileges in schema territory_v2 revoke all on tables from public, anon, authenticated;
alter default privileges in schema territory_v2 revoke all on sequences from public, anon, authenticated;
alter default privileges in schema territory_v2 revoke execute on functions from public, anon, authenticated;

create table if not exists territory_v2.players (
  id uuid primary key default gen_random_uuid(),
  telegram_user_id bigint not null unique check (telegram_user_id > 0),
  display_name text not null default '',
  avatar_ref text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists territory_v2.characters (
  id uuid primary key default gen_random_uuid(),
  player_id uuid not null unique references territory_v2.players(id) on delete restrict,
  class_id text not null,
  level integer not null default 1 check (level >= 1),
  xp bigint not null default 0 check (xp >= 0),
  stage_chapter integer not null default 1 check (stage_chapter >= 1),
  stage_wave integer not null default 1 check (stage_wave >= 1),
  highest_unlocked_chapter integer not null default 1 check (highest_unlocked_chapter >= stage_chapter),
  revision bigint not null default 0 check (revision >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(id,player_id)
);

create table if not exists territory_v2.currency_definitions (
  code text primary key check (code ~ '^[a-z_]{2,40}$'),
  decimals integer not null check (decimals between 0 and 8),
  enabled boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists territory_v2.wallet_balances (
  player_id uuid not null references territory_v2.players(id) on delete restrict,
  currency_code text not null references territory_v2.currency_definitions(code),
  amount_minor bigint not null default 0 check (amount_minor >= 0),
  revision bigint not null default 0 check (revision >= 0),
  primary key(player_id,currency_code)
);

create table if not exists territory_v2.operation_receipts (
  operation_id uuid primary key,
  player_id uuid not null references territory_v2.players(id) on delete restrict,
  action_code text not null,
  request_hash text not null check (length(request_hash) >= 32),
  status text not null check (status in ('pending','settled','rejected')),
  ruleset_version text not null,
  result jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  completed_at timestamptz,
  check (status = 'pending' or completed_at is not null)
);

create table if not exists territory_v2.wallet_ledger (
  id uuid primary key default gen_random_uuid(),
  operation_id uuid not null references territory_v2.operation_receipts(operation_id),
  player_id uuid not null references territory_v2.players(id),
  currency_code text not null references territory_v2.currency_definitions(code),
  delta_minor bigint not null check (delta_minor <> 0),
  balance_after_minor bigint not null check (balance_after_minor >= 0),
  reason_code text not null,
  created_at timestamptz not null default now(),
  unique(operation_id,player_id,currency_code)
);

create table if not exists territory_v2.reward_claims (
  id uuid primary key default gen_random_uuid(),
  player_id uuid not null references territory_v2.players(id),
  source_kind text not null,
  source_id text not null,
  period_key text not null default 'once',
  operation_id uuid not null unique references territory_v2.operation_receipts(operation_id),
  claimed_at timestamptz not null default now(),
  unique(player_id,source_kind,source_id,period_key)
);

create table if not exists territory_v2.item_instances (
  id uuid primary key default gen_random_uuid(),
  player_id uuid not null references territory_v2.players(id) on delete restrict,
  item_type text not null,
  slot_type text not null,
  rarity text not null,
  item_level integer not null check (item_level >= 1),
  upgrade_level integer not null default 0 check (upgrade_level >= 0),
  affixes jsonb not null default '{}'::jsonb,
  locked boolean not null default false,
  favorite boolean not null default false,
  origin_operation_id uuid references territory_v2.operation_receipts(operation_id),
  revision bigint not null default 0 check (revision >= 0),
  created_at timestamptz not null default now(),
  unique(player_id,id)
);

create table if not exists territory_v2.equipment (
  character_id uuid not null,
  player_id uuid not null,
  slot_code text not null,
  item_id uuid not null unique,
  foreign key(character_id,player_id) references territory_v2.characters(id,player_id) on delete cascade,
  foreign key(player_id,item_id) references territory_v2.item_instances(player_id,id) on delete restrict,
  primary key(character_id,slot_code)
);

create table if not exists territory_v2.battle_sessions (
  id uuid primary key default gen_random_uuid(),
  player_id uuid not null references territory_v2.players(id) on delete restrict,
  character_id uuid not null,
  foreign key(character_id,player_id) references territory_v2.characters(id,player_id) on delete restrict,
  stage_chapter integer not null check (stage_chapter >= 1),
  stage_wave integer not null check (stage_wave >= 1),
  combat_rules_version text not null,
  status text not null check (status in ('ready','running','result_pending','settled','expired','cancelled')),
  outcome text check (outcome is null or outcome in ('victory','defeat')),
  started_at timestamptz not null default now(),
  settled_at timestamptz,
  receipt_operation_id uuid unique references territory_v2.operation_receipts(operation_id),
  check (status <> 'settled' or (settled_at is not null and receipt_operation_id is not null))
);

create table if not exists territory_v2.mining_jobs (
  id uuid primary key default gen_random_uuid(),
  player_id uuid not null references territory_v2.players(id),
  resource_code text not null,
  status text not null check (status in ('running','finished','claimed','cancelled')),
  started_at timestamptz not null default now(),
  finished_at timestamptz not null,
  claimed_operation_id uuid unique references territory_v2.operation_receipts(operation_id),
  check (finished_at > started_at)
);
-- Exactly one active V2 port resource collection per player, enforced by the DB.
create unique index if not exists one_running_mining_job_per_player
  on territory_v2.mining_jobs(player_id) where status='running';

create table if not exists territory_v2.admin_audit_log (
  id uuid primary key default gen_random_uuid(),
  operator_player_id uuid references territory_v2.players(id),
  action_code text not null,
  target_player_id uuid references territory_v2.players(id),
  reason text,
  operation_id uuid,
  created_at timestamptz not null default now()
);

-- Every private table explicitly locked down. NO client policies until a
-- verified Telegram auth flow and a staging-specific access model exist.
do $$
declare tbl record;
begin
  for tbl in select tablename from pg_tables where schemaname='territory_v2' loop
    execute format('alter table territory_v2.%I enable row level security',tbl.tablename);
    execute format('revoke all on table territory_v2.%I from public, anon, authenticated',tbl.tablename);
  end loop;
end $$;

-- Explicit privileges only for backend service role; do NOT expose this schema
-- in Supabase Data API configuration. Never put service role key in the client.
grant select,insert,update,delete on all tables in schema territory_v2 to service_role;
alter default privileges in schema territory_v2
  grant select,insert,update,delete on tables to service_role;
-- No functions with SECURITY DEFINER or public EXECUTE are defined here.
commit;
