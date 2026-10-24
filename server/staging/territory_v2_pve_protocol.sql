-- TERRITORY 2.0 — server-only PvE battle state/receipt protocol.
-- Only staging project ksikzkrvuuhermhnbycn. DO NOT apply to V1.
-- Contract: GMP-02, E2E-010..019, SEC-02.
-- This deliberately does NOT issue XP, loot or currencies.
-- A future authenticated V2 server must:
--  1) load authorized hero/rules in Postgres and generate a secret seed;
--  2) run server/combat/resolvePve.ts and hash the trace;
--  3) settle once via a service_role-only function.
-- Never forward browser-supplied result/route/hash into these SQL functions.

begin;
create table if not exists territory_v2.pve_rulebooks (
  version text primary key check (version ~ '^[a-z0-9][a-z0-9_.:-]{0,79}$'),
  config jsonb not null check(jsonb_typeof(config)='object'),
  enabled boolean not null default false,
  created_at timestamptz not null default now()
);
create table if not exists territory_v2.pve_combat_records (
  battle_id uuid primary key references territory_v2.battle_sessions(id) on delete restrict,
  snapshot_sha256 text not null check(snapshot_sha256 ~ '^[0-9a-f]{64}$'),
  trace_sha256 text check(trace_sha256 is null or trace_sha256 ~ '^[0-9a-f]{64}$'),
  reason text check(reason is null or reason in ('enemy_defeated','hero_defeated','turn_limit')),
  turns integer check(turns is null or turns between 1 and 2000),
  created_at timestamptz not null default now(),
  resolved_at timestamptz,
  check ((trace_sha256 is null and reason is null and turns is null and resolved_at is null)
      or (trace_sha256 is not null and reason is not null and turns is not null and resolved_at is not null))
);
-- One active auto-battle per player; race-safe even across devices/tabs.
create unique index if not exists pve_one_active_battle_per_player
  on territory_v2.battle_sessions(player_id)
  where status in ('ready','running','result_pending');

alter table territory_v2.pve_rulebooks enable row level security;
alter table territory_v2.pve_combat_records enable row level security;
revoke all on table territory_v2.pve_rulebooks from public,anon,authenticated;
revoke all on table territory_v2.pve_combat_records from public,anon,authenticated;
grant select,insert,update,delete on territory_v2.pve_rulebooks to service_role;
grant select,insert,update,delete on territory_v2.pve_combat_records to service_role;

create or replace function territory_v2.begin_authoritative_pve(
  p_player_id uuid,
  p_character_id uuid,
  p_battle_id uuid,
  p_rules_version text,
  p_snapshot_sha256 text
) returns uuid
language plpgsql
security invoker
set search_path=pg_catalog
as $v2$
declare
  v_character territory_v2.characters%rowtype;
  v_existing territory_v2.battle_sessions%rowtype;
  v_existing_hash text;
  v_enabled boolean;
begin
  if p_player_id is null or p_character_id is null or p_battle_id is null
    or p_rules_version is null or p_rules_version !~ '^[a-z0-9][a-z0-9_.:-]{0,79}$'
    or p_snapshot_sha256 is null or p_snapshot_sha256 !~ '^[0-9a-f]{64}$'
  then
    raise exception 'INVALID_PVE_START' using errcode='22023';
  end if;

  -- Protect the character and serialize concurrent battle starts.
  select * into v_character
    from territory_v2.characters
    where id=p_character_id and player_id=p_player_id
    for update;
  if not found then
    raise exception 'PVE_CHARACTER_NOT_OWNED' using errcode='23503';
  end if;

  -- Repeat requests for an existing ID are idempotent even after settlement.
  select * into v_existing from territory_v2.battle_sessions
  where id=p_battle_id for update;
  if found then
    select snapshot_sha256 into v_existing_hash
      from territory_v2.pve_combat_records where battle_id=p_battle_id;
    if v_existing.player_id<>p_player_id
      or v_existing.character_id<>p_character_id
      or v_existing.combat_rules_version<>p_rules_version
      or v_existing_hash is distinct from p_snapshot_sha256
    then
      raise exception 'PVE_START_CONFLICT' using errcode='23505';
    end if;
    return v_existing.id;
  end if;

  select enabled into v_enabled from territory_v2.pve_rulebooks
    where version=p_rules_version;
  if not found or v_enabled is distinct from true then
    raise exception 'PVE_RULES_NOT_ENABLED' using errcode='22023';
  end if;

  insert into territory_v2.battle_sessions
    (id,player_id,character_id,stage_chapter,stage_wave,combat_rules_version,status)
  values
    (p_battle_id,p_player_id,p_character_id,
     v_character.stage_chapter,v_character.stage_wave,p_rules_version,'running');
  insert into territory_v2.pve_combat_records(battle_id,snapshot_sha256)
    values (p_battle_id,p_snapshot_sha256);
  return p_battle_id;
exception
  when unique_violation then
    raise exception 'PVE_ACTIVE_BATTLE_EXISTS' using errcode='23505';
end;
$v2$;

create or replace function territory_v2.record_authoritative_pve_result(
  p_battle_id uuid,
  p_receipt_id uuid,
  p_trace_sha256 text,
  p_outcome text,
  p_reason text,
  p_turns integer
) returns jsonb
language plpgsql
security invoker
set search_path=pg_catalog
as $v2$
declare
  v_battle territory_v2.battle_sessions%rowtype;
  v_record territory_v2.pve_combat_records%rowtype;
  v_receipt territory_v2.operation_receipts%rowtype;
  v_result jsonb;
begin
  if p_battle_id is null or p_receipt_id is null
    or p_trace_sha256 is null or p_trace_sha256 !~ '^[0-9a-f]{64}$'
    or p_outcome is null or p_outcome not in ('victory','defeat')
    or p_reason is null or p_reason not in ('enemy_defeated','hero_defeated','turn_limit')
    or p_turns is null or p_turns not between 1 and 2000
    or (p_outcome='victory' and p_reason<>'enemy_defeated')
    or (p_outcome='defeat' and p_reason='enemy_defeated')
  then
    raise exception 'INVALID_PVE_RESULT' using errcode='22023';
  end if;

  select * into v_battle from territory_v2.battle_sessions
  where id=p_battle_id for update;
  if not found then
    raise exception 'PVE_BATTLE_NOT_FOUND' using errcode='23503';
  end if;
  select * into v_record from territory_v2.pve_combat_records
  where battle_id=p_battle_id for update;
  if not found then
    raise exception 'PVE_SNAPSHOT_NOT_FOUND' using errcode='23503';
  end if;

  if v_battle.status='settled' then
    if v_battle.receipt_operation_id is distinct from p_receipt_id
      or v_battle.outcome is distinct from p_outcome
      or v_record.trace_sha256 is distinct from p_trace_sha256
      or v_record.reason is distinct from p_reason
      or v_record.turns is distinct from p_turns
    then
      raise exception 'PVE_RESULT_CONFLICT' using errcode='23505';
    end if;
    select * into v_receipt from territory_v2.operation_receipts
      where operation_id=p_receipt_id;
    return v_receipt.result;
  end if;
  if v_battle.status not in ('running','result_pending') or v_record.trace_sha256 is not null then
    raise exception 'PVE_NOT_SETTLEABLE' using errcode='23514';
  end if;

  v_result:=jsonb_build_object(
    'battleId',p_battle_id,'receiptId',p_receipt_id,
    'outcome',p_outcome,'reason',p_reason,'turns',p_turns,
    'traceSha256',p_trace_sha256,'rulesetVersion',v_battle.combat_rules_version,
    'awardsGranted',false
  );
  insert into territory_v2.operation_receipts
    (operation_id,player_id,action_code,request_hash,status,ruleset_version,result,completed_at)
  values
    (p_receipt_id,v_battle.player_id,'pve.resolve',p_trace_sha256,
     'settled',v_battle.combat_rules_version,v_result,now());

  update territory_v2.pve_combat_records
    set trace_sha256=p_trace_sha256,reason=p_reason,turns=p_turns,resolved_at=now()
    where battle_id=p_battle_id;
  update territory_v2.battle_sessions
    set status='settled',outcome=p_outcome,settled_at=now(),
        receipt_operation_id=p_receipt_id
    where id=p_battle_id;
  return v_result;
end;
$v2$;

-- Function owners must not accidentally expose these to Data API.
revoke all on function territory_v2.begin_authoritative_pve(uuid,uuid,uuid,text,text)
  from public,anon,authenticated;
grant execute on function territory_v2.begin_authoritative_pve(uuid,uuid,uuid,text,text)
  to service_role;
revoke all on function territory_v2.record_authoritative_pve_result(uuid,uuid,text,text,text,integer)
  from public,anon,authenticated;
grant execute on function territory_v2.record_authoritative_pve_result(uuid,uuid,text,text,text,integer)
  to service_role;
commit;
