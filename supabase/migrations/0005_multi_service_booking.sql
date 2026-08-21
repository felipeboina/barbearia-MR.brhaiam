-- ============================================================================
-- Permite selecionar mais de um serviço no mesmo agendamento público
-- (ex: "Corte Masculino" + "Sobrancelha" na mesma marcação). `service_id`
-- continua sendo o serviço "principal" (primeiro escolhido); os demais vão
-- em `extra_service_ids`. Duração e valor total já são somados no cliente
-- (BookingWizard) e gravados em duration_min/total_value como antes — só a
-- lista de serviços extras é nova.
-- ============================================================================

alter table public.appointments
  add column if not exists extra_service_ids uuid[] not null default '{}';

-- ----------------------------------------------------------------------------
-- complete_appointment: agora soma o preço de todos os serviços do
-- agendamento (principal + extras) em vez de olhar só `service_id`, e grava
-- o nome combinado (ex: "Corte Masculino + Sobrancelha") na transação.
-- Resto da lógica (desconto de indicação, comissão, COGS de produtos,
-- fidelidade) é idêntico ao da migration anterior.
-- ----------------------------------------------------------------------------
create or replace function public.complete_appointment(p_appt_id uuid, p_payment_method text)
returns void
language plpgsql
as $$
declare
  v_appt appointments%rowtype;
  v_barber barbers%rowtype;
  v_tenant_id uuid;
  v_referral_discount numeric;
  v_loyalty_enabled boolean;
  v_base_price numeric;
  v_service_names text;
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
  v_product_cost numeric;
begin
  select * into v_appt from public.appointments where id = p_appt_id and tenant_id = public.auth_tenant_id();
  if not found then
    raise exception 'Agendamento não encontrado.';
  end if;
  if v_appt.status <> 'agendado' then
    raise exception 'Esse agendamento já foi concluído, cancelado ou marcado como falta.';
  end if;

  v_tenant_id := v_appt.tenant_id;

  select coalesce(sum(price), 0), string_agg(name, ' + ' order by name)
    into v_base_price, v_service_names
    from public.services
    where id = v_appt.service_id or id = any(coalesce(v_appt.extra_service_ids, '{}'));

  select * into v_barber from public.barbers where id = v_appt.barber_id;
  select referral_discount, loyalty_enabled into v_referral_discount, v_loyalty_enabled from public.tenants where id = v_tenant_id;

  select true, visits, referral_credits into v_client_exists, v_client_visits, v_client_referral_credits
    from public.clients where tenant_id = v_tenant_id and phone = v_appt.phone;
  v_is_first_visit := (not coalesce(v_client_exists, false)) or coalesce(v_client_visits, 0) = 0;

  -- computeFinalPrice: (1) boas-vindas por indicação na 1a visita, senão
  -- (2) crédito de indicação acumulado, senão preço cheio. Nunca os dois juntos.
  -- Desconto agora aplica sobre a soma de todos os serviços do agendamento.
  if v_appt.referred_by_phone is not null and v_is_first_visit then
    v_discount_pct := v_referral_discount;
    v_discount_reason := 'Desconto de boas-vindas (indicação)';
    v_final_price := round(v_base_price * (1 - v_referral_discount / 100.0), 2);
  elsif coalesce(v_client_referral_credits, 0) > 0 then
    v_discount_pct := v_referral_discount;
    v_discount_reason := 'Crédito por ter indicado um amigo';
    v_final_price := round(v_base_price * (1 - v_referral_discount / 100.0), 2);
  else
    v_discount_pct := 0;
    v_discount_reason := null;
    v_final_price := v_base_price;
  end if;

  v_used_referral_credit := (v_discount_reason = 'Crédito por ter indicado um amigo');
  v_commission := round(v_final_price * coalesce(v_barber.commission, 0) / 100.0, 2);

  update public.appointments
    set status = 'concluido', payment_method = p_payment_method,
        discount_pct = nullif(v_discount_pct, 0), discount_reason = v_discount_reason
    where id = p_appt_id;

  insert into public.transactions (tenant_id, date, type, appt_id, barber_id, service_name, client_name, phone, value, commission, payment_method, discount_pct)
  values (v_tenant_id, v_appt.date, 'servico', v_appt.id, v_appt.barber_id, v_service_names, v_appt.client_name, v_appt.phone, v_final_price, v_commission, p_payment_method, nullif(v_discount_pct, 0));

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

      select cost into v_product_cost from public.products where id = nullif(v_item ->> 'productId', '')::uuid;
      if coalesce(v_product_cost, 0) > 0 then
        insert into public.transactions (tenant_id, date, type, category_id, product_id, description, value, commission)
        values (
          v_tenant_id, v_appt.date, 'despesa', 'custo_produto',
          nullif(v_item ->> 'productId', '')::uuid,
          'Custo: ' || (v_item ->> 'qty') || 'x ' || (v_item ->> 'name'),
          round((v_product_cost * (v_item ->> 'qty')::numeric), 2),
          0
        );
      end if;
    end loop;
  end if;

  if not v_client_exists then
    insert into public.clients (tenant_id, phone, name, birthday, visits, total_spent, last_visit, points)
    values (v_tenant_id, v_appt.phone, v_appt.client_name, v_appt.birthday, 1, v_final_price, v_appt.date, case when v_loyalty_enabled then 1 else 0 end);
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
      points = coalesce(points, 0) + case when v_loyalty_enabled then 1 else 0 end,
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

grant execute on function public.complete_appointment(uuid, text) to authenticated;
