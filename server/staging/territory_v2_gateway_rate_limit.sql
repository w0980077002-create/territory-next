-- TERRITORY 2.0 PRIVATE staging-only Telegram gateway budget.
-- Approved project ref: ksikzkrvuuhermhnbycn; never use live V1.
-- The caller identity comes ONLY from server-verified Telegram initData.
-- Distributed PostgreSQL uniqueness and conditional UPSERT prevent concurrent
-- bypass across Edge instances; this is not a client-visible RPC.
begin;

create table if not exists territory_v2.gateway_rate_limits (
  telegram_user_id bigint not null check (telegram_user_id > 0),
  route text not null check (route in ('profile','join')),
  window_started_at timestamptz not null,
  request_count integer not null check (request_count between 1 and 10000),
  primary key (telegram_user_id,route,window_started_at)
);

alter table territory_v2.gateway_rate_limits enable row level security;
revoke all on territory_v2.gateway_rate_limits from public,anon,authenticated;
grant select,insert,update,delete on territory_v2.gateway_rate_limits to service_role;

create or replace function territory_v2.try_gateway_rate_limit(
  p_telegram_user_id bigint,
  p_route text,
  p_max_requests integer,
  p_window_seconds integer
) returns boolean
language plpgsql
security invoker
set search_path = pg_catalog
as $v2$
declare
  v_start timestamptz;
  v_allowed boolean;
begin
  if p_telegram_user_id is null or p_telegram_user_id < 1 or
     p_route is null or p_route not in ('profile','join') or
     p_max_requests is null or p_max_requests < 1 or p_max_requests > 1000 or
     p_window_seconds is null or p_window_seconds < 60 or
     p_window_seconds > 86400
  then
    raise exception 'INVALID_V2_RATE_LIMIT_REQUEST' using errcode = '22023';
  end if;

  v_start:=to_timestamp(
    floor(extract(epoch from now()) / p_window_seconds) * p_window_seconds
  );

  insert into territory_v2.gateway_rate_limits
    (telegram_user_id,route,window_started_at,request_count)
  values (p_telegram_user_id,p_route,v_start,1)
  on conflict (telegram_user_id,route,window_started_at)
  do update set request_count=territory_v2.gateway_rate_limits.request_count+1
  where territory_v2.gateway_rate_limits.request_count < p_max_requests
  returning true into v_allowed;

  -- Previous windows for this user are no longer relevant after 2 days.
  -- Scoped cleanup never deletes another player's throttle history.
  delete from territory_v2.gateway_rate_limits
  where telegram_user_id=p_telegram_user_id
    and window_started_at < now() - interval '2 days';

  return coalesce(v_allowed,false);
end;
$v2$;

revoke all on function territory_v2.try_gateway_rate_limit(bigint,text,integer,integer)
  from public,anon,authenticated;
grant execute on function territory_v2.try_gateway_rate_limit(bigint,text,integer,integer)
  to service_role;
commit;
