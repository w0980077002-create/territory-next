-- TERRITORY 2.0: private, first-clear-only campaign progression after server PvE.
-- Code-only migration. Do NOT apply to production V1 or enable payouts.
-- Prerequisites: territory_v2_schema.sql and territory_v2_pve_protocol.sql.
-- GMP-02 / E2E-010..019. Exactly 5 chapters, 20 stages each.
-- This does NOT award XP, currency, items, tickets or real loot.
begin;

create table if not exists territory_v2.pve_stage_clears (
  battle_id uuid primary key references territory_v2.battle_sessions(id) on delete restrict,
  player_id uuid not null references territory_v2.players(id) on delete restrict,
  character_id uuid not null,
  chapter integer not null check (chapter between 1 and 5),
  wave integer not null check (wave between 1 and 20),
  clear_operation_id uuid not null unique references territory_v2.operation_receipts(operation_id),
  next_chapter integer not null check (next_chapter between 1 and 5),
  next_wave integer not null check (next_wave between 1 and 20),
  cleared_at timestamptz not null default now(),
  foreign key(character_id,player_id)
    references territory_v2.characters(id,player_id) on delete restrict,
  unique(player_id,chapter,wave)
);

alter table territory_v2.pve_stage_clears enable row level security;
revoke all on table territory_v2.pve_stage_clears from public,anon,authenticated;
grant select,insert,update,delete on territory_v2.pve_stage_clears to service_role;

create or replace function territory_v2.record_authoritative_stage_clear(
  p_battle_id uuid,
  p_clear_operation_id uuid
) returns jsonb
language plpgsql
security invoker
set search_path=pg_catalog
as $v2$
declare
  v_player_id uuid;
  v_character_id uuid;
  v_character territory_v2.characters%rowtype;
  v_battle territory_v2.battle_sessions%rowtype;
  v_record territory_v2.pve_combat_records%rowtype;
  v_existing territory_v2.pve_stage_clears%rowtype;
  v_receipt territory_v2.operation_receipts%rowtype;
  v_next_chapter integer;
  v_next_wave integer;
  v_campaign_complete boolean;
  v_result jsonb;
begin
  if p_battle_id is null or p_clear_operation_id is null then
    raise exception 'INVALID_PVE_STAGE_CLEAR' using errcode='22023';
  end if;

  -- Read identity, then lock CHARACTER FIRST, as begin_authoritative_pve does.
  -- This serializes multiple devices and prevents stage skips from races.
  select player_id,character_id into v_player_id,v_character_id
    from territory_v2.battle_sessions where id=p_battle_id;
  if not found then
    raise exception 'PVE_STAGE_BATTLE_NOT_FOUND' using errcode='23503';
  end if;
  select * into v_character from territory_v2.characters
    where id=v_character_id and player_id=v_player_id for update;
  if not found then
    raise exception 'PVE_STAGE_CHARACTER_NOT_FOUND' using errcode='23503';
  end if;
  select * into v_battle from territory_v2.battle_sessions
    where id=p_battle_id for update;
  if not found or v_battle.player_id<>v_player_id
      or v_battle.character_id<>v_character_id then
    raise exception 'PVE_STAGE_BATTLE_CHANGED' using errcode='23514';
  end if;

  -- Idempotency MUST be checked before checking current stage: after the
  -- first clear, the character has already moved to the next stage.
  select * into v_existing from territory_v2.pve_stage_clears
    where battle_id=p_battle_id for update;
  if found then
    if v_existing.clear_operation_id<>p_clear_operation_id then
      raise exception 'PVE_STAGE_CLEAR_CONFLICT' using errcode='23505';
    end if;
    select * into v_receipt from territory_v2.operation_receipts
      where operation_id=v_existing.clear_operation_id;
    if not found or v_receipt.status<>'settled'
      or v_receipt.player_id<>v_player_id
      or v_receipt.action_code<>'pve.stage_clear' then
      raise exception 'PVE_STAGE_CLEAR_RECEIPT_CORRUPT' using errcode='23514';
    end if;
    return v_receipt.result;
  end if;

  if v_battle.status<>'settled' or v_battle.outcome<>'victory' then
    raise exception 'PVE_STAGE_REQUIRES_SETTLED_VICTORY' using errcode='23514';
  end if;
  select * into v_record from territory_v2.pve_combat_records
    where battle_id=p_battle_id;
  if not found or v_record.trace_sha256 is null
    or v_record.reason<>'enemy_defeated' or v_record.resolved_at is null then
    raise exception 'PVE_STAGE_RESULT_UNVERIFIED' using errcode='23514';
  end if;
  select * into v_receipt from territory_v2.operation_receipts
    where operation_id=v_battle.receipt_operation_id;
  if not found or v_receipt.status<>'settled'
    or v_receipt.action_code<>'pve.resolve'
    or v_receipt.player_id<>v_player_id
    or v_receipt.request_hash<>v_record.trace_sha256 then
    raise exception 'PVE_STAGE_RESOLUTION_RECEIPT_INVALID' using errcode='23514';
  end if;

  if v_battle.stage_chapter not between 1 and 5
    or v_battle.stage_wave not between 1 and 20 then
    raise exception 'PVE_STAGE_OUTSIDE_CAMPAIGN' using errcode='22023';
  end if;
  if v_character.stage_chapter<>v_battle.stage_chapter
    or v_character.stage_wave<>v_battle.stage_wave then
    raise exception 'PVE_STAGE_OUTDATED' using errcode='23514';
  end if;
  if exists(select 1 from territory_v2.pve_stage_clears
      where player_id=v_player_id and chapter=v_battle.stage_chapter
        and wave=v_battle.stage_wave) then
    raise exception 'PVE_STAGE_ALREADY_CLEARED' using errcode='23505';
  end if;
  if exists(select 1 from territory_v2.operation_receipts
      where operation_id=p_clear_operation_id) then
    raise exception 'PVE_STAGE_RECEIPT_CONFLICT' using errcode='23505';
  end if;

  v_campaign_complete:=v_battle.stage_chapter=5 and v_battle.stage_wave=20;
  if v_campaign_complete then
    v_next_chapter:=5;
    v_next_wave:=20;
  elsif v_battle.stage_wave=20 then
    v_next_chapter:=v_battle.stage_chapter+1;
    v_next_wave:=1;
  else
    v_next_chapter:=v_battle.stage_chapter;
    v_next_wave:=v_battle.stage_wave+1;
  end if;

  v_result:=jsonb_build_object(
    'battleId',p_battle_id,'clearReceiptId',p_clear_operation_id,
    'chapter',v_battle.stage_chapter,'wave',v_battle.stage_wave,
    'nextChapter',v_next_chapter,'nextWave',v_next_wave,
    'campaignCompleted',v_campaign_complete,
    'firstClear',true,'xpGranted',false,'awardsGranted',false
  );
  insert into territory_v2.operation_receipts
    (operation_id,player_id,action_code,request_hash,status,ruleset_version,result,completed_at)
  values
    (p_clear_operation_id,v_player_id,'pve.stage_clear',v_record.trace_sha256,
     'settled',v_battle.combat_rules_version,v_result,now());

  insert into territory_v2.pve_stage_clears
    (battle_id,player_id,character_id,chapter,wave,clear_operation_id,next_chapter,next_wave)
  values
    (p_battle_id,v_player_id,v_character_id,v_battle.stage_chapter,v_battle.stage_wave,
     p_clear_operation_id,v_next_chapter,v_next_wave);

  update territory_v2.characters
    set stage_chapter=v_next_chapter,stage_wave=v_next_wave,
        highest_unlocked_chapter=greatest(highest_unlocked_chapter,v_next_chapter),
        revision=revision+1,updated_at=now()
    where id=v_character_id and player_id=v_player_id;
  return v_result;
end;
$v2$;

revoke all on function territory_v2.record_authoritative_stage_clear(uuid,uuid)
  from public,anon,authenticated;
grant execute on function territory_v2.record_authoritative_stage_clear(uuid,uuid)
  to service_role;
commit;
