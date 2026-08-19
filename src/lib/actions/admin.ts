"use server";

/**
 * Ações do painel admin. Site ainda sem autenticação (decisão explícita,
 * por enquanto) — usam o client com a service role key (bypassa RLS) e
 * filtram pelo tenant_id da única barbearia cadastrada, resolvida no
 * servidor via getTheTenant(). Nunca aceitam tenant_id vindo do cliente.
 */
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { getTheTenant } from "@/lib/current-tenant";
import { todayStr } from "@/lib/business/format";
import type { AppointmentProductItem, TransactionType } from "@/lib/types";

async function getSessionClientAndTenant() {
  const tenant = await getTheTenant();
  if (!tenant) throw new Error("Barbearia ainda não configurada.");
  return { supabase: createSupabaseAdminClient(), tenantId: tenant.id };
}

// ---------------------------------------------------------------- agenda

export async function completeAppointment(apptId: string, paymentMethod: string) {
  const { supabase, tenantId } = await getSessionClientAndTenant();
  const { error } = await supabase.rpc("complete_appointment", { p_appt_id: apptId, p_payment_method: paymentMethod, p_tenant_id: tenantId });
  if (error) return { ok: false, error: error.message };
  return { ok: true };
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
}

export async function restockProduct(productId: string, qty: number) {
  const { supabase } = await getSessionClientAndTenant();
  const { data: product } = await supabase.from("products").select("stock").eq("id", productId).single();
  if (!product) return;
  await supabase.from("products").update({ stock: product.stock + qty }).eq("id", productId);
}

export async function addProduct(data: { name: string; stock: number; minStock: number; price: number }) {
  const { supabase, tenantId } = await getSessionClientAndTenant();
  await supabase.from("products").insert({ tenant_id: tenantId, name: data.name, stock: data.stock, min_stock: data.minStock, price: data.price });
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

export async function updateBarber(id: string, patch: Partial<{ name: string; commission: number }>) {
  const { supabase } = await getSessionClientAndTenant();
  await supabase.from("barbers").update(patch).eq("id", id);
}

export async function deleteBarber(id: string) {
  const { supabase } = await getSessionClientAndTenant();
  await supabase.from("barbers").delete().eq("id", id);
}

export async function addService(name: string, price: number, duration: number) {
  const { supabase, tenantId } = await getSessionClientAndTenant();
  await supabase.from("services").insert({ tenant_id: tenantId, name, price, duration });
}

export async function updateService(id: string, patch: Partial<{ name: string; price: number; duration: number }>) {
  const { supabase } = await getSessionClientAndTenant();
  await supabase.from("services").update(patch).eq("id", id);
}

export async function deleteService(id: string) {
  const { supabase } = await getSessionClientAndTenant();
  await supabase.from("services").delete().eq("id", id);
}

export type { AppointmentProductItem };
