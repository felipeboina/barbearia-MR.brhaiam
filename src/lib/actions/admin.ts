"use server";

/**
 * Ações do painel admin (autenticado). Todas usam o client Supabase
 * vinculado à sessão (RLS aplicado automaticamente por tenant_id =
 * auth_tenant_id()) — nunca aceitam tenant_id vindo do cliente.
 */
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { normalizePhone, todayStr } from "@/lib/business/format";
import type { TransactionType } from "@/lib/types";

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
  serviceId: string;
  barberId: string;
  paymentMethod: string;
}

/**
 * Registra um corte feito na hora, sem ter passado por agendamento prévio —
 * já cria o atendimento como "concluido" e lança a transação financeira na
 * hora. Não passa pelo desconto de indicação (é um atendimento avulso, sem
 * o contexto de agendamento público).
 */
export async function registerWalkIn(input: RegisterWalkInInput): Promise<{ ok: true } | { ok: false; error: string }> {
  const { supabase, tenantId } = await getSessionClientAndTenant();
  const clientName = input.clientName.trim();
  if (clientName.length < 2) return { ok: false, error: "Digite o nome do cliente." };

  const [{ data: service }, { data: barber }] = await Promise.all([
    supabase.from("services").select("*").eq("id", input.serviceId).single(),
    supabase.from("barbers").select("*").eq("id", input.barberId).single(),
  ]);
  if (!service || !barber) return { ok: false, error: "Serviço ou barbeiro inválido." };

  const phone = normalizePhone(input.phone);
  const date = todayStr();
  const now = new Date();
  const time = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
  const commission = +(((service.price || 0) * (barber.commission || 0)) / 100).toFixed(2);

  const { data: appt, error: apptError } = await supabase
    .from("appointments")
    .insert({
      tenant_id: tenantId,
      client_name: clientName,
      phone,
      barber_id: barber.id,
      service_id: service.id,
      date,
      time,
      duration_min: service.duration,
      status: "concluido",
      payment_method: input.paymentMethod,
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
    service_name: service.name,
    client_name: clientName,
    phone: phone || null,
    value: service.price,
    commission,
    payment_method: input.paymentMethod,
  });

  if (phone.length >= 8) {
    const { data: existing } = await supabase.from("clients").select("*").eq("tenant_id", tenantId).eq("phone", phone).maybeSingle();
    if (existing) {
      await supabase
        .from("clients")
        .update({ visits: (existing.visits || 0) + 1, total_spent: (existing.total_spent || 0) + service.price, last_visit: date })
        .eq("id", existing.id);
    } else {
      await supabase.from("clients").insert({ tenant_id: tenantId, phone, name: clientName, visits: 1, total_spent: service.price, last_visit: date });
    }
  }

  return { ok: true };
}

export interface RegisterClientInput {
  name: string;
  phone: string;
  birthday: string | null;
}

/** Cadastra um cliente direto, sem vincular a nenhum atendimento. */
export async function registerClient(input: RegisterClientInput): Promise<{ ok: true } | { ok: false; error: string }> {
  const { supabase, tenantId } = await getSessionClientAndTenant();
  const name = input.name.trim();
  const phone = normalizePhone(input.phone);
  if (name.length < 2 || phone.length < 8) return { ok: false, error: "Preencha nome e telefone válidos." };

  const { data: existing } = await supabase.from("clients").select("id").eq("tenant_id", tenantId).eq("phone", phone).maybeSingle();
  if (existing) {
    await supabase.from("clients").update({ name, birthday: input.birthday }).eq("id", existing.id);
  } else {
    await supabase.from("clients").insert({ tenant_id: tenantId, phone, name, birthday: input.birthday, visits: 0, total_spent: 0, last_visit: null });
  }
  return { ok: true };
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
