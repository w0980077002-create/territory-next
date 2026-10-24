-- V2: server-only registration after verification of Telegram initData.
-- DANGER: these functions DO NOT verify Telegram identity themselves.
-- Only a trusted Edge handler may call them after validating Telegram's HMAC.
-- No public/anon/authenticated grants, no use of V1 public.players.
-- Approved staging project: ksikzkrvuuhermhnbycn. Production V1 is off limits.

begin;
create or replace function territory_v2.upsert_verified_telegram_player(
  p_telegram_user_id bigint,
  p_display_name text,
  p_avatar_ref text default null
) returns uuid
language plpgsql
security invoker
set search_path = pg_catalog
as $v2$
declare
  v_player_id uuid;
begin
  if p_telegram_user_id is null or p_telegram_user_id <= 0
     or p_display_name is null
     or length(btrim(p_display_name)) = 0
     or length(p_display_name) > 64
     or (p_avatar_ref is not null and
       (length(p_avatar_ref)>2048 or p_avatar_ref !~ '^https://'))
  then
    raise exception 'INVALID_VERIFIED_TELEGRAM_PROFILE' using errcode = '22023';
  end if;

  insert into territory_v2.players(telegram_user_id,display_name,avatar_ref)
  values (p_telegram_user_id,btrim(p_display_name),p_avatar_ref)
  on conflict (telegram_user_id) do update
    set display_name = excluded.display_name,
        avatar_ref = coalesce(excluded.avatar_ref,territory_v2.players.avatar_ref),
        updated_at = now()
  returning id into v_player_id;

  return v_player_id;
end;
$v2$;

-- First character selection is immutable until a separate class-change
-- operation and policy are designed and approved. No starter wallet award.
create or replace function territory_v2.create_character_once(
  p_player_id uuid,
  p_class_id text
) returns uuid
language plpgsql
security invoker
set search_path = pg_catalog
as $v2$
declare
  v_character_id uuid;
  v_current_class text;
begin
  -- These are our V2 demo class IDs, NOT a claim about regional class names.
  if p_player_id is null or p_class_id is null or
     p_class_id not in ('berserker','runemage','ranger')
  then
    raise exception 'INVALID_V2_CLASS_SELECTION' using errcode = '22023';
  end if;

  insert into territory_v2.characters(player_id,class_id)
  values (p_player_id,p_class_id)
  on conflict (player_id) do nothing;

  select id,class_id into v_character_id,v_current_class
  from territory_v2.characters
  where player_id=p_player_id;

  if not found then
    raise exception 'CHARACTER_CREATION_FAILED' using errcode='23503';
  end if;
  if v_current_class<>p_class_id then
    raise exception 'CHARACTER_ALREADY_CREATED_DIFFERENT_CLASS'
      using errcode='23514';
  end if;
  return v_character_id;
end;
$v2$;

revoke all on function territory_v2.upsert_verified_telegram_player(
 bigint,text,text
) from public, anon, authenticated;
revoke all on function territory_v2.create_character_once(
 uuid,text
) from public, anon, authenticated;
grant execute on function territory_v2.upsert_verified_telegram_player(
 bigint,text,text
) to service_role;
grant execute on function territory_v2.create_character_once(
 uuid,text
) to service_role;
commit;
