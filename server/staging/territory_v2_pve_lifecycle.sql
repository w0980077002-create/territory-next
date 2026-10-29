-- TERRITORY 2.0 ONLY: fail-closed server PvE lifecycle and stale-session recovery.
-- Staging CODE ONLY. Prerequisites: territory_v2_schema.sql,
-- territory_v2_pve_protocol.sql, territory_v2_pve_stage_progress.sql,
-- territory_v2_pve_execution.sql. Never apply to TERRITORY 1.0.
-- Deliberately no real balance, loot, XP, payments or enabled defaults.
begin;

-- Explicit V2 operator configuration. Without this row NO new PvE can start
-- after this migration is installed. Durations are server time, not browser time.
create table if not exists territory_v2.pve_session_policy (
  singleton boolean primary key default true check(singleton),
  min_duration_seconds integer not null check(min_duration_seconds between 1 and 3600),
  max_duration_seconds integer not null check(max_duration_seconds between 2 and 86400),
  check(max_duration_seconds>min_duration_seconds),
  updated_at timestamptz not null default now()
);
create table if not exists territory_v2.pve_session_expirations (
  battle_id uuid primary key references territory_v2.battle_sessions(id) on delete restrict,
  player_id uuid not null references territory_v2.players(id) on delete restrict,
  expired_at timestamptz not null default now(),
  reason text not null check(reason='session_timeout')
);
alter table territory_v2.pve_session_policy enable row level security;
alter table territory_v2.pve_session_expirations enable row level security;
revoke all on territory_v2.pve_session_policy from public,anon,authenticated;
revoke all on territory_v2.pve_session_expirations from public,anon,authenticated;
grant select,insert,update,delete on territory_v2.pve_session_policy to service_role;
grant select,insert on territory_v2.pve_session_expirations to service_role;

-- A BEFORE INSERT trigger runs inside the SAME transaction and after the
-- begin_authoritative_pve character lock. Expired battles are closed before
-- the existing unique index tests for one active session per player.
create or replace function territory_v2.enforce_pve_session_lifecycle()
returns trigger language plpgsql security invoker set search_path=pg_catalog as $v2$
declare
  v_policy territory_v2.pve_session_policy%rowtype;
  v_now timestamptz;
begin
  if tg_op='INSERT' then
    if new.status not in ('ready','running','result_pending') then
      return new;
    end if;
    select * into v_policy from territory_v2.pve_session_policy where singleton=true;
    if not found then
      raise exception 'PVE_SESSION_POLICY_NOT_CONFIGURED' using errcode='22023';
    end if;
    v_now:=clock_timestamp();
    -- No global cleanup: ONLY this player's stale sessions are changed.
    update territory_v2.battle_sessions b
       set status='expired'
     where b.player_id=new.player_id
       and b.status in ('ready','running','result_pending')
       and b.started_at + make_interval(secs=>v_policy.max_duration_seconds)<=v_now;
    return new;
  end if;

  if tg_op='UPDATE' then
    if old.status in ('settled','expired','cancelled') and new.status<>old.status then
      raise exception 'PVE_SESSION_TERMINAL' using errcode='23514';
    end if;
    if new.status='settled' and old.status<>'settled' then
      select * into v_policy from territory_v2.pve_session_policy where singleton=true;
      if not found then
        raise exception 'PVE_SESSION_POLICY_NOT_CONFIGURED' using errcode='22023';
      end if;
      v_now:=clock_timestamp();
      if v_now<old.started_at+make_interval(secs=>v_policy.min_duration_seconds) then
        raise exception 'PVE_SESSION_TOO_EARLY' using errcode='23514';
      end if;
      if v_now>=old.started_at+make_interval(secs=>v_policy.max_duration_seconds) then
        raise exception 'PVE_SESSION_EXPIRED' using errcode='23514';
      end if;
    end if;
    return new;
  end if;
  return new;
end;
$v2$;

create or replace function territory_v2.audit_pve_session_expiration()
returns trigger language plpgsql security invoker set search_path=pg_catalog as $v2$
begin
  if old.status<>'expired' and new.status='expired' then
    insert into territory_v2.pve_session_expirations(battle_id,player_id,reason)
    values(new.id,new.player_id,'session_timeout')
    on conflict(battle_id) do nothing;
  end if;
  return null;
end;
$v2$;

drop trigger if exists v2_pve_lifecycle_before_insert on territory_v2.battle_sessions;
create trigger v2_pve_lifecycle_before_insert
before insert on territory_v2.battle_sessions
for each row execute function territory_v2.enforce_pve_session_lifecycle();
drop trigger if exists v2_pve_lifecycle_before_update on territory_v2.battle_sessions;
create trigger v2_pve_lifecycle_before_update
before update on territory_v2.battle_sessions
for each row execute function territory_v2.enforce_pve_session_lifecycle();
drop trigger if exists v2_pve_expiration_audit on territory_v2.battle_sessions;
create trigger v2_pve_expiration_audit
after update on territory_v2.battle_sessions
for each row execute function territory_v2.audit_pve_session_expiration();

-- Private read-only status for a verified Telegram identity. Does NOT expose
-- snapshot, seed, stats or server policy. Stale running sessions are reported
-- as expired even before the next start performs transactional cleanup.
create or replace function territory_v2.read_pve_lifecycle(
  p_telegram_user_id bigint,p_battle_id uuid
) returns jsonb language plpgsql volatile security invoker
set search_path=pg_catalog as $v2$
declare
  v_battle territory_v2.battle_sessions%rowtype;
  v_policy territory_v2.pve_session_policy%rowtype;
  v_status text;
begin
  if p_telegram_user_id is null or p_telegram_user_id<=0 or p_battle_id is null then
    return null;
  end if;
  select b.* into v_battle
    from territory_v2.battle_sessions b
    join territory_v2.players p on p.id=b.player_id
    where b.id=p_battle_id and p.telegram_user_id=p_telegram_user_id;
  if not found then return null; end if;
  v_status:=v_battle.status;
  if v_status in ('ready','running','result_pending') then
    select * into v_policy from territory_v2.pve_session_policy where singleton=true;
    if not found then
      return jsonb_build_object('battleId',v_battle.id,'status','unavailable');
    end if;
    if v_battle.started_at+make_interval(secs=>v_policy.max_duration_seconds)
       <=clock_timestamp() then
      v_status:='expired';
    end if;
  end if;
  return jsonb_build_object('battleId',v_battle.id,'status',v_status);
end;
$v2$;

revoke all on function territory_v2.enforce_pve_session_lifecycle() from public,anon,authenticated;
revoke all on function territory_v2.audit_pve_session_expiration() from public,anon,authenticated;
revoke all on function territory_v2.read_pve_lifecycle(bigint,uuid) from public,anon,authenticated;
grant execute on function territory_v2.enforce_pve_session_lifecycle() to service_role;
grant execute on function territory_v2.audit_pve_session_expiration() to service_role;
grant execute on function territory_v2.read_pve_lifecycle(bigint,uuid) to service_role;
commit;
