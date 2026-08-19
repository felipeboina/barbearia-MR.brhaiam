-- ============================================================================
-- Modo sem autenticação (decisão explícita, por enquanto): o painel admin
-- não exige login ainda, então o servidor sempre acessa via service role
-- key (bypassa RLS) e passa o tenant_id explicitamente, resolvido a partir
-- da única barbearia cadastrada. `complete_appointment` usava
-- auth_tenant_id() (que depende de auth.uid(), inexistente sem login) —
-- passa a receber o tenant_id como parâmetro em vez disso.
--
-- RLS continua habilitada em todas as tabelas como defesa em profundidade
-- (bloqueia acesso direto via publishable key, que não tem nenhuma policy
-- de leitura/escrita anônima). Quando autenticação for adicionada de volta,
-- é só recriar esta função apontando para auth_tenant_id() de novo.
-- ============================================================================

create or replace function public.complete_appointment(p_appt_id uuid, p_payment_method text, p_tenant_id uuid)
returns void
language plpgsql
as $$
declare
  v_appt appointments%rowtype;
  v_service services%rowtype;
  v_barber barbers%rowtype;
  v_tenant_id uuid;
  v_referral_discount numeric;
  v_client_exists boolean;
  v_client_visits int;
  v_client_referral_credits int;
  v_is_first_visit boolean;
  v_final_price numeric;
  v_discount_pct numeric;
  v_discount_reason text;
  v_used_referral_credit boolean;
  v_commission numeric;
  v_consumes_plan_cut boolean;
  v_grants_referrer_credit boolean;
  v_item jsonb;
begin
  select * into v_appt from public.appointments where id = p_appt_id and tenant_id = p_tenant_id;
  if not found then
    raise exception 'Agendamento não encontrado.';
  end if;
  if v_appt.status <> 'agendado' then
    raise exception 'Esse agendamento já foi concluído, cancelado ou marcado como falta.';
  end if;

  v_tenant_id := v_appt.tenant_id;

  select * into v_service from public.services where id = v_appt.service_id;
  select * into v_barber from public.barbers where id = v_appt.barber_id;
  select referral_discount into v_referral_discount from public.tenants where id = v_tenant_id;

  select true, visits, referral_credits into v_client_exists, v_client_visits, v_client_referral_credits
    from public.clients where tenant_id = v_tenant_id and phone = v_appt.phone;
  v_is_first_visit := (not coalesce(v_client_exists, false)) or coalesce(v_client_visits, 0) = 0;

  -- computeFinalPrice: (1) boas-vindas por indicação na 1a visita, senão
  -- (2) crédito de indicação acumulado, senão preço cheio. Nunca os dois juntos.
  if v_appt.referred_by_phone is not null and v_is_first_visit then
    v_discount_pct := v_referral_discount;
    v_discount_reason := 'Desconto de boas-vindas (indicação)';
    v_final_price := round(v_service.price * (1 - v_referral_discount / 100.0), 2);
  elsif coalesce(v_client_referral_credits, 0) > 0 then
    v_discount_pct := v_referral_discount;
    v_discount_reason := 'Crédito por ter indicado um amigo';
    v_final_price := round(v_service.price * (1 - v_referral_discount / 100.0), 2);
  else
    v_discount_pct := 0;
    v_discount_reason := null;
    v_final_price := v_service.price;
  end if;

  v_used_referral_credit := (v_discount_reason = 'Crédito por ter indicado um amigo');
  v_commission := round(v_final_price * coalesce(v_barber.commission, 0) / 100.0, 2);

  update public.appointments
    set status = 'concluido', payment_method = p_payment_method,
        discount_pct = nullif(v_discount_pct, 0), discount_reason = v_discount_reason
    where id = p_appt_id;

  insert into public.transactions (tenant_id, date, type, appt_id, barber_id, service_name, client_name, phone, value, commission, payment_method, discount_pct)
  values (v_tenant_id, v_appt.date, 'servico', v_appt.id, v_appt.barber_id, v_service.name, v_appt.client_name, v_appt.phone, v_final_price, v_commission, p_payment_method, nullif(v_discount_pct, 0));

  if jsonb_array_length(coalesce(v_appt.products, '[]'::jsonb)) > 0 then
    for v_item in select * from jsonb_array_elements(v_appt.products) loop
      insert into public.transactions (tenant_id, date, type, category_id, product_id, description, value, commission)
      values (
        v_tenant_id, v_appt.date, 'entrada', 'produto',
        nullif(v_item ->> 'productId', '')::uuid,
        'Venda (agendamento): ' || (v_item ->> 'qty') || 'x ' || (v_item ->> 'name'),
        round(((v_item ->> 'price')::numeric * (v_item ->> 'qty')::numeric), 2),
        0
      );
      update public.products set stock = greatest(0, stock - (v_item ->> 'qty')::int)
        where id = nullif(v_item ->> 'productId', '')::uuid;
    end loop;
  end if;

  if not v_client_exists then
    insert into public.clients (tenant_id, phone, name, birthday, visits, total_spent, last_visit, points)
    values (v_tenant_id, v_appt.phone, v_appt.client_name, v_appt.birthday, 1, v_final_price, v_appt.date, 1);
  else
    select (plan_id is not null and plan_start_date is not null
            and (plan_start_date + (coalesce((select period_days from public.plans where id = c.plan_id), 30) || ' days')::interval)::date >= current_date
            and (coalesce((select cuts_included from public.plans where id = c.plan_id), 0) - coalesce(c.plan_cuts_used, 0)) > 0)
      into v_consumes_plan_cut
      from public.clients c where c.tenant_id = v_tenant_id and c.phone = v_appt.phone;

    update public.clients set
      visits = coalesce(visits, 0) + 1,
      total_spent = coalesce(total_spent, 0) + v_final_price,
      last_visit = v_appt.date,
      points = coalesce(points, 0) + 1,
      referral_credits = case when v_used_referral_credit then greatest(0, coalesce(referral_credits, 0) - 1) else coalesce(referral_credits, 0) end,
      plan_cuts_used = case when v_consumes_plan_cut then coalesce(plan_cuts_used, 0) + 1 else plan_cuts_used end
    where tenant_id = v_tenant_id and phone = v_appt.phone;
  end if;

  v_grants_referrer_credit := v_appt.referred_by_phone is not null and v_is_first_visit
    and exists (select 1 from public.clients where tenant_id = v_tenant_id and phone = v_appt.referred_by_phone);

  if v_grants_referrer_credit then
    update public.clients set
      referral_credits = coalesce(referral_credits, 0) + 1,
      referrals_count = coalesce(referrals_count, 0) + 1
    where tenant_id = v_tenant_id and phone = v_appt.referred_by_phone;
  end if;
end;
$$;

-- Remove a assinatura antiga (2 args, baseada em auth_tenant_id) e mantém só
-- a nova (3 args, com p_tenant_id explícito).
drop function if exists public.complete_appointment(uuid, text);

grant execute on function public.complete_appointment(uuid, text, uuid) to authenticated, service_role;
