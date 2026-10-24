-- TERRITORY 2.0 — staging-only, service-role-only atomic economy primitive.
-- Applies ONLY to private schema territory_v2 in approved ref ksikzkrvuuhermhnbycn.
-- NEVER deploy in wmyrdpbwlkzsktnhookx (live TERRITORY 1.0).
-- This is an INTERNAL function, not a player RPC or a reward claim endpoint.
-- A future authenticated server must verify Telegram initData, authorize the
-- reward source, and compute p_delta + p_request_hash independently.
-- Master TZ GMP-02/GMP-12; SEC-02, SEC-05, E2E-012/050/051.

begin;

create or replace function territory_v2.apply_wallet_delta(
  p_player_id uuid,
  p_operation_id uuid,
  p_request_hash text,
  p_currency_code text,
  p_delta_minor bigint,
  p_reason_code text,
  p_ruleset_version text
) returns jsonb
language plpgsql
security invoker
set search_path = pg_catalog
as $v2$
declare
  v_request jsonb;
  v_stored territory_v2.operation_receipts%rowtype;
  v_enabled boolean;
  v_previous bigint;
  v_next numeric;
  v_result jsonb;
begin
  -- Refuse unqualified/unreviewed commands before touching player state.
  if p_player_id is null or p_operation_id is null or
     p_currency_code is null or p_currency_code !~ '^[a-z_]{2,40}$' or
     p_delta_minor is null or p_delta_minor = 0 or
     p_request_hash is null or p_request_hash !~ '^[0-9a-f]{64}$' or
     p_reason_code is null or p_reason_code !~ '^[a-z][a-z0-9_.]{2,63}$' or
     p_ruleset_version is null or length(btrim(p_ruleset_version)) = 0 or
     length(p_ruleset_version) > 80
  then
    raise exception 'INVALID_WALLET_OPERATION' using errcode = '22023';
  end if;

  v_request := jsonb_build_object(
    'playerId', p_player_id,
    'currency', p_currency_code,
    'deltaMinor', p_delta_minor::text,
    'reason', p_reason_code,
    'rulesetVersion', p_ruleset_version
  );

  -- INSERT ... ON CONFLICT locks the conflicting unique index entry until the
  -- first transaction finishes; SELECT FOR UPDATE handles duplicate requests.
  insert into territory_v2.operation_receipts
   (operation_id, player_id, action_code, request_hash, status, ruleset_version, result)
  values
   (p_operation_id, p_player_id, 'wallet.delta', p_request_hash, 'pending',
    p_ruleset_version, jsonb_build_object('request', v_request))
  on conflict (operation_id) do nothing;

  select * into v_stored
  from territory_v2.operation_receipts
  where operation_id = p_operation_id
  for update;

  if not found or v_stored.player_id <> p_player_id or
     v_stored.action_code <> 'wallet.delta' or
     v_stored.request_hash <> p_request_hash or
     v_stored.ruleset_version <> p_ruleset_version or
     (v_stored.result->'request') is distinct from v_request
  then
    raise exception 'IDEMPOTENCY_CONFLICT' using errcode = '23505';
  end if;

  if v_stored.status = 'settled' then
    return v_stored.result->'outcome';
  end if;
  if v_stored.status <> 'pending' then
    raise exception 'OPERATION_NOT_SETTLEABLE' using errcode = '23514';
  end if;

  select enabled into v_enabled
    from territory_v2.currency_definitions where code = p_currency_code;
  if not found or v_enabled is distinct from true then
    raise exception 'CURRENCY_DISABLED' using errcode = '22023';
  end if;

  -- Balance row is explicitly locked even when simultaneous requests arrive
  -- for an existing (player,currency) pair.
  insert into territory_v2.wallet_balances
    (player_id,currency_code,amount_minor)
  values (p_player_id,p_currency_code,0)
  on conflict (player_id,currency_code) do nothing;

  select amount_minor into v_previous
  from territory_v2.wallet_balances
  where player_id=p_player_id and currency_code=p_currency_code
  for update;

  if not found then
    raise exception 'WALLET_NOT_FOUND' using errcode='23503';
  end if;

  -- numeric arithmetic prevents bigint wraparound before constraint checks.
  v_next := v_previous::numeric + p_delta_minor::numeric;
  if v_next < 0 then
    raise exception 'INSUFFICIENT_RESOURCE' using errcode='22003';
  end if;
  if v_next > 9223372036854775807::numeric then
    raise exception 'BALANCE_OVERFLOW' using errcode='22003';
  end if;

  update territory_v2.wallet_balances
  set amount_minor=v_next::bigint, revision=revision+1
  where player_id=p_player_id and currency_code=p_currency_code;

  insert into territory_v2.wallet_ledger
    (operation_id,player_id,currency_code,delta_minor,balance_after_minor,reason_code)
  values (p_operation_id,p_player_id,p_currency_code,p_delta_minor,v_next::bigint,p_reason_code);

  v_result := jsonb_build_object(
    'operationId',p_operation_id,
    'playerId',p_player_id,
    'currency',p_currency_code,
    'deltaMinor',p_delta_minor::text,
    'balanceMinor',v_next::text,
    'rulesetVersion',p_ruleset_version
  );

  update territory_v2.operation_receipts
  set status='settled', completed_at=now(),
      result=jsonb_build_object('request',v_request,'outcome',v_result)
  where operation_id=p_operation_id;

  return v_result;
end;
$v2$;

-- Strictly private: the function is callable ONLY by trusted server jobs.
revoke all on function territory_v2.apply_wallet_delta(
 uuid,uuid,text,text,bigint,text,text
) from public, anon, authenticated;
grant execute on function territory_v2.apply_wallet_delta(
 uuid,uuid,text,text,bigint,text,text
) to service_role;
commit;
