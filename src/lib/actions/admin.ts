"use server";

/**
 * Ações do painel admin (autenticado). Todas usam o client Supabase
 * vinculado à sessão (RLS aplicado automaticamente por tenant_id =
 * auth_tenant_id()) — nunca aceitam tenant_id vindo do cliente.
 */
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { normalizePhone, todayStr } from "@/lib/business/format";
import type { AppointmentProductItem, TransactionType } from "@/lib/types";

async function getSessionClientAndTenant() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Não autenticado.");
  const { data: profile } = await supabase.from("profiles").select("tenant_id").eq("id", user.id).single();
  if (!profile) throw new Error("Tenant não encontrado.");
  return { supabase, tenantId: profile.tenant_id as string };
}

// ---------------------------------------------------------------- agenda

export async function completeAppointment(apptId: string, paymentMethod: string): Promise<{ ok: true } | { ok: false; error: string }> {
  // Nunca deixa essa action lançar — se sessão/tenant falhar (ex: token
  // expirado no meio do uso), o botão no client ficaria girando pra sempre
  // esperando um await que nunca resolve, em vez de mostrar um erro.
  try {
    const { supabase } = await getSessionClientAndTenant();
    const { error } = await supabase.rpc("complete_appointment", { p_appt_id: apptId, p_payment_method: paymentMethod });
    if (error) return { ok: false, error: error.message };
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Não deu pra concluir o atendimento, tenta de novo." };
  }
}

export async function cancelAppointment(apptId: string) {
  const { supabase } = await getSessionClientAndTenant();
  await supabase.from("appointments").update({ status: "cancelado" }).eq("id", apptId);
}

export async function markNoShow(apptId: string) {
  const { supabase, tenantId } = await getSessionClientAndTenant();
  const { data: appt } = await supabase.from("appointments").select("phone, client_name").eq("id", apptId).single();
  await supabase.from("appointments").update({ status: "falta" }).eq("id", apptId);
  if (!appt) return;

  const { data: client } = await supabase.from("clients").select("id, no_shows").eq("tenant_id", tenantId).eq("phone", appt.phone).maybeSingle();
  if (client) {
    await supabase.from("clients").update({ no_shows: (client.no_shows || 0) + 1 }).eq("id", client.id);
  } else {
    await supabase.from("clients").insert({ tenant_id: tenantId, phone: appt.phone, name: appt.client_name, no_shows: 1 });
  }
}

export async function confirmAppointmentAdmin(apptId: string) {
  const { supabase } = await getSessionClientAndTenant();
  await supabase.from("appointments").update({ confirmed: true }).eq("id", apptId);
}

// ---------------------------------------------------------------- bloqueios

export interface BlockInput {
  barberId: string | null;
  date: string;
  allDay: boolean;
  startTime: string | null;
  endTime: string | null;
  reasonId: string;
  reasonLabel: string;
  note: string;
}

export async function addBlocks(blocks: BlockInput[]) {
  const { supabase, tenantId } = await getSessionClientAndTenant();
  await supabase.from("blocks").insert(
    blocks.map((b) => ({
      tenant_id: tenantId,
      barber_id: b.barberId,
      date: b.date,
      all_day: b.allDay,
      start_time: b.startTime,
      end_time: b.endTime,
      reason_id: b.reasonId,
      reason_label: b.reasonLabel,
      note: b.note,
    }))
  );
}

export async function deleteBlock(id: string) {
  const { supabase } = await getSessionClientAndTenant();
  await supabase.from("blocks").delete().eq("id", id);
}

// ---------------------------------------------------------------- financeiro

export async function addManualEntry(entry: { type: Extract<TransactionType, "entrada" | "despesa">; categoryId: string; description: string; value: number }) {
  const { supabase, tenantId } = await getSessionClientAndTenant();
  await supabase.from("transactions").insert({
    tenant_id: tenantId,
    date: todayStr(),
    type: entry.type,
    category_id: entry.categoryId,
    description: entry.description,
    value: entry.value,
    commission: 0,
  });
}

// ---------------------------------------------------------------- estoque

export async function sellProduct(productId: string, qty: number) {
  const { supabase, tenantId } = await getSessionClientAndTenant();
  const { data: product } = await supabase.from("products").select("*").eq("id", productId).single();
  if (!product) return;
  const sellQty = Math.min(qty, product.stock);
  if (sellQty <= 0) return;
  await supabase.from("products").update({ stock: product.stock - sellQty }).eq("id", productId);
  await supabase.from("transactions").insert({
    tenant_id: tenantId,
    date: todayStr(),
    type: "entrada",
    category_id: "produto",
    product_id: productId,
    description: `Venda: ${sellQty}x ${product.name}`,
    value: +(product.price * sellQty).toFixed(2),
    commission: 0,
  });
  if (product.cost > 0) {
    await supabase.from("transactions").insert({
      tenant_id: tenantId,
      date: todayStr(),
      type: "despesa",
      category_id: "custo_produto",
      product_id: productId,
      description: `Custo: ${sellQty}x ${product.name}`,
      value: +(product.cost * sellQty).toFixed(2),
      commission: 0,
    });
  }
}

export async function restockProduct(productId: string, qty: number) {
  const { supabase } = await getSessionClientAndTenant();
  const { data: product } = await supabase.from("products").select("stock").eq("id", productId).single();
  if (!product) return;
  await supabase.from("products").update({ stock: product.stock + qty }).eq("id", productId);
}

export async function addProduct(data: { name: string; stock: number; minStock: number; price: number; cost: number }) {
  const { supabase, tenantId } = await getSessionClientAndTenant();
  await supabase.from("products").insert({ tenant_id: tenantId, name: data.name, stock: data.stock, min_stock: data.minStock, price: data.price, cost: data.cost });
}

export async function deleteProduct(id: string) {
  const { supabase } = await getSessionClientAndTenant();
  await supabase.from("products").delete().eq("id", id);
}

/** Mostra/esconde o produto na etapa "Adicionar produtos" do agendamento público (não afeta o Estoque nem o Atendimento Avulso). */
export async function setProductShowInBooking(id: string, showInBooking: boolean) {
  const { supabase } = await getSessionClientAndTenant();
  await supabase.from("products").update({ show_in_booking: showInBooking }).eq("id", id);
}

// ---------------------------------------------------------------- planos

export async function addPlan(data: { name: string; price: number; period: string; periodDays: number; cutsIncluded: number; benefits: string[] }) {
  const { supabase, tenantId } = await getSessionClientAndTenant();
  await supabase.from("plans").insert({
    tenant_id: tenantId,
    name: data.name,
    price: data.price,
    period: data.period,
    period_days: data.periodDays,
    cuts_included: data.cutsIncluded,
    benefits: data.benefits,
    active: true,
  });
}

export async function updatePlan(id: string, patch: Partial<{ name: string; price: number; active: boolean }>) {
  const { supabase } = await getSessionClientAndTenant();
  await supabase.from("plans").update(patch).eq("id", id);
}

export async function deletePlan(id: string) {
  const { supabase } = await getSessionClientAndTenant();
  await supabase.from("plans").delete().eq("id", id);
}

export async function assignPlan(phone: string, planId: string) {
  const { supabase, tenantId } = await getSessionClientAndTenant();
  await supabase
    .from("clients")
    .update({ plan_id: planId, plan_start_date: todayStr(), plan_cuts_used: 0 })
    .eq("tenant_id", tenantId)
    .eq("phone", phone);
}

export async function renewPlan(phone: string) {
  const { supabase, tenantId } = await getSessionClientAndTenant();
  await supabase
    .from("clients")
    .update({ plan_start_date: todayStr(), plan_cuts_used: 0 })
    .eq("tenant_id", tenantId)
    .eq("phone", phone)
    .not("plan_id", "is", null);
}

export async function cancelClientPlan(phone: string) {
  const { supabase, tenantId } = await getSessionClientAndTenant();
  await supabase.from("clients").update({ plan_id: null, plan_start_date: null, plan_cuts_used: 0 }).eq("tenant_id", tenantId).eq("phone", phone);
}

export async function approveSignup(signupId: string, phone: string, planId: string) {
  const { supabase } = await getSessionClientAndTenant();
  await assignPlan(phone, planId);
  await supabase.from("plan_signups").update({ status: "aprovado" }).eq("id", signupId);
}

export async function dismissSignup(signupId: string) {
  const { supabase } = await getSessionClientAndTenant();
  await supabase.from("plan_signups").update({ status: "descartado" }).eq("id", signupId);
}

// ---------------------------------------------------------------- fidelidade / dedup de notificações

export async function redeemLoyalty(phone: string) {
  const { supabase, tenantId } = await getSessionClientAndTenant();
  const [{ data: tenant }, { data: client }] = await Promise.all([
    supabase.from("tenants").select("loyalty_goal").eq("id", tenantId).single(),
    supabase.from("clients").select("id, points, redemptions_count").eq("tenant_id", tenantId).eq("phone", phone).maybeSingle(),
  ]);
  if (!tenant || !client) return;
  await supabase
    .from("clients")
    .update({ points: Math.max(0, (client.points || 0) - tenant.loyalty_goal), redemptions_count: (client.redemptions_count || 0) + 1 })
    .eq("id", client.id);
}

export async function markEarlyNudgeSent(phone: string, lastVisit: string) {
  const { supabase, tenantId } = await getSessionClientAndTenant();
  await supabase.from("clients").update({ early_nudge_sent_for: lastVisit }).eq("tenant_id", tenantId).eq("phone", phone);
}

export async function markWinbackContacted(phone: string, lastVisit: string) {
  const { supabase, tenantId } = await getSessionClientAndTenant();
  await supabase.from("clients").update({ winback_sent_for: lastVisit }).eq("tenant_id", tenantId).eq("phone", phone);
}

export async function markBirthdaySent(phone: string, year: number) {
  const { supabase, tenantId } = await getSessionClientAndTenant();
  await supabase.from("clients").update({ birthday_msg_year: year }).eq("tenant_id", tenantId).eq("phone", phone);
}

// ---------------------------------------------------------------- configurações / barbeiros / serviços

export async function updateTenantConfig(patch: Record<string, unknown>) {
  const { supabase, tenantId } = await getSessionClientAndTenant();
  await supabase.from("tenants").update(patch).eq("id", tenantId);
}

export async function addBarber(name: string, commission: number) {
  const { supabase, tenantId } = await getSessionClientAndTenant();
  await supabase.from("barbers").insert({ tenant_id: tenantId, name, commission });
}

export async function updateBarber(id: string, patch: Partial<{ name: string; commission: number; start_hour: number | null; end_hour: number | null }>) {
  const { supabase } = await getSessionClientAndTenant();
  await supabase.from("barbers").update(patch).eq("id", id);
}

export async function deleteBarber(id: string) {
  const { supabase } = await getSessionClientAndTenant();
  await supabase.from("barbers").delete().eq("id", id);
}

export async function addService(name: string, price: number, duration: number) {
  const { supabase, tenantId } = await getSessionClientAndTenant();
  const { data: last } = await supabase
    .from("services")
    .select("sort_order")
    .eq("tenant_id", tenantId)
    .order("sort_order", { ascending: false })
    .limit(1)
    .maybeSingle();
  const nextOrder = (last?.sort_order ?? -1) + 1;
  await supabase.from("services").insert({ tenant_id: tenantId, name, price, duration, sort_order: nextOrder });
}

export async function updateService(
  id: string,
  patch: Partial<{ name: string; price: number; duration: number; start_hour: number | null; end_hour: number | null }>
) {
  const { supabase } = await getSessionClientAndTenant();
  await supabase.from("services").update(patch).eq("id", id);
}

export async function deleteService(id: string) {
  const { supabase } = await getSessionClientAndTenant();
  await supabase.from("services").delete().eq("id", id);
}

/** Salva a nova ordem de exibição dos serviços (agendamento público + Configurações). */
export async function reorderServices(orderedIds: string[]) {
  const { supabase } = await getSessionClientAndTenant();
  await Promise.all(orderedIds.map((id, index) => supabase.from("services").update({ sort_order: index }).eq("id", id)));
}

// ---------------------------------------------------------------- atendimento avulso

export interface RegisterWalkInInput {
  clientName: string;
  phone: string;
  birthday: string | null;
  serviceIds: string[];
  productItems: { productId: string; qty: number }[];
  barberId: string;
  paymentMethod: string;
}

/**
 * Registra um corte feito na hora, sem ter passado por agendamento prévio —
 * já cria o atendimento como "concluido" e lança a transação financeira na
 * hora. Não passa pelo desconto de indicação (é um atendimento avulso, sem
 * o contexto de agendamento público). Preço/nome/custo de serviços e
 * produtos sempre vêm do banco (nunca do que o navegador mandou), mesma
 * lógica de venda usada em `sellProduct`.
 */
export async function registerWalkIn(input: RegisterWalkInInput): Promise<{ ok: true } | { ok: false; error: string }> {
  const { supabase, tenantId } = await getSessionClientAndTenant();
  const clientName = input.clientName.trim();
  if (clientName.length < 2) return { ok: false, error: "Digite o nome do cliente." };
  if (input.serviceIds.length === 0) return { ok: false, error: "Escolha ao menos um serviço." };

  const productIds = input.productItems.map((p) => p.productId);
  const [{ data: selectedServices }, { data: barber }, { data: productRows }] = await Promise.all([
    supabase.from("services").select("*").in("id", input.serviceIds),
    supabase.from("barbers").select("*").eq("id", input.barberId).single(),
    productIds.length > 0 ? supabase.from("products").select("*").in("id", productIds) : Promise.resolve({ data: [] }),
  ]);
  if (!selectedServices || selectedServices.length === 0 || !barber) return { ok: false, error: "Serviço ou barbeiro inválido." };

  const [primaryServiceId, ...extraServiceIds] = input.serviceIds;
  const totalServicePrice = selectedServices.reduce((s, it) => s + (it.price || 0), 0);
  const totalDuration = selectedServices.reduce((s, it) => s + (it.duration || 0), 0);
  const serviceNames = [...selectedServices]
    .map((s) => s.name)
    .sort()
    .join(" + ");

  const productById = new Map((productRows || []).map((p) => [p.id as string, p]));
  const productItems: AppointmentProductItem[] = input.productItems
    .map((it) => {
      const p = productById.get(it.productId);
      if (!p || it.qty <= 0) return null;
      const qty = Math.min(it.qty, p.stock);
      if (qty <= 0) return null;
      return { productId: p.id, name: p.name, price: p.price, qty };
    })
    .filter((x): x is AppointmentProductItem => x !== null);
  const addonsTotal = +productItems.reduce((s, it) => s + it.price * it.qty, 0).toFixed(2);
  const totalValue = +(totalServicePrice + addonsTotal).toFixed(2);

  const phone = normalizePhone(input.phone);
  const date = todayStr();
  const now = new Date();
  const time = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
  const commission = +(((totalServicePrice || 0) * (barber.commission || 0)) / 100).toFixed(2);

  const { data: appt, error: apptError } = await supabase
    .from("appointments")
    .insert({
      tenant_id: tenantId,
      client_name: clientName,
      phone,
      barber_id: barber.id,
      service_id: primaryServiceId,
      extra_service_ids: extraServiceIds,
      date,
      time,
      duration_min: totalDuration,
      status: "concluido",
      payment_method: input.paymentMethod,
      products: productItems,
      addons_total: addonsTotal,
      total_value: totalValue,
    })
    .select()
    .single();
  if (apptError || !appt) return { ok: false, error: "Não deu pra registrar o atendimento." };

  await supabase.from("transactions").insert({
    tenant_id: tenantId,
    date,
    type: "servico",
    appt_id: appt.id,
    barber_id: barber.id,
    service_name: serviceNames,
    client_name: clientName,
    phone: phone || null,
    value: totalServicePrice,
    commission,
    payment_method: input.paymentMethod,
  });

  for (const item of productItems) {
    await supabase.from("transactions").insert({
      tenant_id: tenantId,
      date,
      type: "entrada",
      category_id: "produto",
      product_id: item.productId,
      description: `Venda (avulso): ${item.qty}x ${item.name}`,
      value: +(item.price * item.qty).toFixed(2),
      commission: 0,
    });
    const product = productById.get(item.productId);
    await supabase
      .from("products")
      .update({ stock: Math.max(0, (product?.stock || 0) - item.qty) })
      .eq("id", item.productId);
    if (product && product.cost > 0) {
      await supabase.from("transactions").insert({
        tenant_id: tenantId,
        date,
        type: "despesa",
        category_id: "custo_produto",
        product_id: item.productId,
        description: `Custo: ${item.qty}x ${item.name}`,
        value: +(product.cost * item.qty).toFixed(2),
        commission: 0,
      });
    }
  }

  const birthday = input.birthday || null;
  if (phone.length >= 8) {
    const { data: existing } = await supabase.from("clients").select("*").eq("tenant_id", tenantId).eq("phone", phone).maybeSingle();
    if (existing) {
      await supabase
        .from("clients")
        .update({
          visits: (existing.visits || 0) + 1,
          total_spent: (existing.total_spent || 0) + totalServicePrice,
          last_visit: date,
          ...(birthday ? { birthday } : {}),
        })
        .eq("id", existing.id);
    } else {
      await supabase
        .from("clients")
        .insert({ tenant_id: tenantId, phone, name: clientName, birthday, visits: 1, total_spent: totalServicePrice, last_visit: date });
    }
  }

  return { ok: true };
}

// ---------------------------------------------------------------- clientes

export interface UpdateClientInput {
  name: string;
  phone: string;
  birthday: string | null;
}

/**
 * Edita os dados de um cliente já cadastrado. Se o telefone mudar, também
 * atualiza o telefone nos agendamentos e transações já existentes — essas
 * tabelas guardam o telefone direto (não têm client_id), então sem isso o
 * histórico do cliente "sumiria" da ficha dele só por ter trocado de
 * número. O nome antigo em registros passados fica como estava (é um
 * retrato de como se chamava naquele momento, não precisa reescrever).
 */
export async function updateClient(id: string, input: UpdateClientInput): Promise<{ ok: true } | { ok: false; error: string }> {
  const { supabase, tenantId } = await getSessionClientAndTenant();
  const name = input.name.trim();
  const phone = normalizePhone(input.phone);
  if (name.length < 2 || phone.length < 8) return { ok: false, error: "Preencha nome e telefone válidos." };

  const { data: current } = await supabase.from("clients").select("phone").eq("id", id).eq("tenant_id", tenantId).single();
  if (!current) return { ok: false, error: "Cliente não encontrado." };

  if (phone !== current.phone) {
    const { data: conflict } = await supabase
      .from("clients")
      .select("id")
      .eq("tenant_id", tenantId)
      .eq("phone", phone)
      .neq("id", id)
      .maybeSingle();
    if (conflict) return { ok: false, error: "Já existe outro cliente cadastrado com esse telefone." };
  }

  await supabase.from("clients").update({ name, phone, birthday: input.birthday }).eq("id", id);

  if (phone !== current.phone) {
    await Promise.all([
      supabase.from("appointments").update({ phone }).eq("tenant_id", tenantId).eq("phone", current.phone),
      supabase.from("transactions").update({ phone }).eq("tenant_id", tenantId).eq("phone", current.phone),
    ]);
  }

  return { ok: true };
}

/**
 * Apaga o cadastro do cliente (nome, aniversário, pontos de fidelidade,
 * créditos de indicação, contagem de faltas). NÃO apaga o histórico de
 * agendamentos/transações já realizados — isso é registro financeiro,
 * continua existindo mesmo sem a "ficha" do cliente. Se esse telefone
 * agendar de novo depois, um cadastro novo é criado do zero.
 */
export async function deleteClient(id: string) {
  const { supabase } = await getSessionClientAndTenant();
  await supabase.from("clients").delete().eq("id", id);
}

// ---------------------------------------------------------------- senha do financeiro

/**
 * Senha extra (opcional) só pra aba Financeiro & Gráficos — separada do
 * login principal, pra quando outras pessoas usam o painel no dia a dia
 * mas não devem ver números financeiros. O valor da senha nunca sai do
 * servidor: essas três funções fazem sua própria query direta na coluna
 * `financial_pin` e só devolvem boolean/void, nunca o texto da senha.
 */
export async function hasFinancialPin(): Promise<boolean> {
  const { supabase, tenantId } = await getSessionClientAndTenant();
  const { data } = await supabase.from("tenants").select("financial_pin").eq("id", tenantId).maybeSingle();
  return !!data?.financial_pin;
}

export async function checkFinancialPin(pin: string): Promise<boolean> {
  const { supabase, tenantId } = await getSessionClientAndTenant();
  const { data } = await supabase.from("tenants").select("financial_pin").eq("id", tenantId).maybeSingle();
  if (!data?.financial_pin) return true;
  return data.financial_pin === pin;
}

export async function setFinancialPin(pin: string | null): Promise<void> {
  const { supabase, tenantId } = await getSessionClientAndTenant();
  await supabase
    .from("tenants")
    .update({ financial_pin: pin && pin.trim().length > 0 ? pin.trim() : null })
    .eq("id", tenantId);
}
