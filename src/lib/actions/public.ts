"use server";

/**
 * Ações da área pública (anônima) — booking, self-checkin, assinatura de
 * plano. Sempre usam o service-role client (bypassa RLS) porque não existe
 * usuário autenticado aqui. Site é single-tenant: toda query é filtrada pelo
 * tenant_id da única barbearia cadastrada.
 */
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { getTheTenant } from "@/lib/current-tenant";
import { computeAvailableSlots, type AvailableSlot } from "@/lib/business/availability";
import { normalizePhone, todayStr } from "@/lib/business/format";
import type { AppointmentProductItem, Tenant } from "@/lib/types";

async function resolveTenant(): Promise<Tenant> {
  const tenant = await getTheTenant();
  if (!tenant) throw new Error("Barbearia ainda não configurada.");
  return tenant;
}

export async function getSlots(
  barberId: string,
  date: string,
  serviceDuration: number
): Promise<{ slots: AvailableSlot[]; isFullyBlocked: boolean; fullDayBlockLabel: string | null }> {
  const tenant = await resolveTenant();
  const supabase = createSupabaseAdminClient();

  const [{ data: appointments }, { data: blocks }, { data: barber }] = await Promise.all([
    supabase
      .from("appointments")
      .select("*")
      .eq("tenant_id", tenant.id)
      .eq("barber_id", barberId)
      .eq("date", date)
      .neq("status", "cancelado"),
    supabase.from("blocks").select("*").eq("tenant_id", tenant.id).eq("date", date),
    supabase.from("barbers").select("start_hour, end_hour").eq("id", barberId).maybeSingle(),
  ]);

  return computeAvailableSlots({
    barberId,
    barberHours: barber,
    date,
    appointments: (appointments as never[]) || [],
    blocks: (blocks as never[]) || [],
    config: tenant,
    serviceDuration,
  });
}

export interface BookAppointmentInput {
  clientName: string;
  phone: string;
  birthday: string | null;
  barberId: string;
  serviceId: string;
  extraServiceIds: string[];
  date: string;
  time: string;
  duration: number;
  products: AppointmentProductItem[];
  addonsTotal: number;
  totalValue: number;
  paymentPreference: "pix" | "local" | null;
  clientClaimsPaid: boolean;
  referredByPhone: string | null;
}

export async function bookAppointment(input: BookAppointmentInput): Promise<{ ok: true } | { ok: false; error: string }> {
  const tenant = await resolveTenant();
  const supabase = createSupabaseAdminClient();

  const clientName = input.clientName.trim();
  const phone = normalizePhone(input.phone);
  if (clientName.length < 2 || phone.length < 8) return { ok: false, error: "Dados inválidos." };

  // revalida a indicação no servidor (nunca confia só no que o front mandou):
  // o indicador precisa existir de fato como cliente cadastrado, e não pode
  // ser a própria pessoa se indicando.
  let referredByPhone: string | null = null;
  const referredByDigits = normalizePhone(input.referredByPhone);
  if (referredByDigits && referredByDigits !== phone) {
    const { data: referrer } = await supabase.from("clients").select("phone").eq("tenant_id", tenant.id).eq("phone", referredByDigits).maybeSingle();
    if (referrer) referredByPhone = referredByDigits;
  }

  const { data: existingClient } = await supabase.from("clients").select("*").eq("tenant_id", tenant.id).eq("phone", phone).maybeSingle();

  if (existingClient) {
    await supabase
      .from("clients")
      .update({ name: clientName, birthday: input.birthday || existingClient.birthday })
      .eq("id", existingClient.id);
  } else {
    await supabase.from("clients").insert({
      tenant_id: tenant.id,
      phone,
      name: clientName,
      birthday: input.birthday,
      visits: 0,
      total_spent: 0,
      last_visit: null,
    });
  }

  const { error } = await supabase.from("appointments").insert({
    tenant_id: tenant.id,
    client_name: clientName,
    phone,
    birthday: input.birthday,
    barber_id: input.barberId,
    service_id: input.serviceId,
    extra_service_ids: input.extraServiceIds,
    date: input.date,
    time: input.time,
    duration_min: input.duration,
    status: "agendado",
    products: input.products,
    addons_total: input.addonsTotal,
    total_value: input.totalValue,
    payment_preference: input.paymentPreference,
    client_claims_paid: input.clientClaimsPaid,
    referred_by_phone: referredByPhone,
  });

  if (error) return { ok: false, error: "Não deu pra criar o agendamento, tenta de novo." };
  return { ok: true };
}

export async function findClientNoShows(phone: string): Promise<number> {
  const tenant = await resolveTenant();
  const supabase = createSupabaseAdminClient();
  const digits = normalizePhone(phone);
  if (digits.length < 8) return 0;
  const { data } = await supabase.from("clients").select("no_shows").eq("tenant_id", tenant.id).eq("phone", digits).maybeSingle();
  return data?.no_shows || 0;
}

export async function findReferrerName(referralPhone: string, ownPhone: string): Promise<string | null> {
  const tenant = await resolveTenant();
  const supabase = createSupabaseAdminClient();
  const digits = normalizePhone(referralPhone);
  const own = normalizePhone(ownPhone);
  if (digits.length < 8 || digits === own) return null;
  const { data } = await supabase.from("clients").select("name").eq("tenant_id", tenant.id).eq("phone", digits).maybeSingle();
  return data?.name || null;
}

export interface SelfCheckinAppt {
  id: string;
  date: string;
  time: string;
  serviceName: string | null;
  barberName: string | null;
}

export async function searchAppointmentsByPhone(phone: string): Promise<SelfCheckinAppt[]> {
  const tenant = await resolveTenant();
  const supabase = createSupabaseAdminClient();
  const digits = normalizePhone(phone);

  const { data } = await supabase
    .from("appointments")
    .select("id, date, time, service:services(name), barber:barbers(name)")
    .eq("tenant_id", tenant.id)
    .eq("phone", digits)
    .eq("status", "agendado")
    .gte("date", todayStr())
    .order("date")
    .order("time");

  return ((data as unknown as { id: string; date: string; time: string; service: { name: string } | null; barber: { name: string } | null }[]) || []).map((a) => ({
    id: a.id,
    date: a.date,
    time: a.time,
    serviceName: a.service?.name ?? null,
    barberName: a.barber?.name ?? null,
  }));
}

async function assertOwnedByPhone(tenantId: string, apptId: string, phone: string) {
  const supabase = createSupabaseAdminClient();
  const digits = normalizePhone(phone);
  const { data } = await supabase.from("appointments").select("id").eq("id", apptId).eq("tenant_id", tenantId).eq("phone", digits).maybeSingle();
  return !!data;
}

export async function confirmAppointmentSelf(apptId: string, phone: string): Promise<boolean> {
  const tenant = await resolveTenant();
  if (!(await assertOwnedByPhone(tenant.id, apptId, phone))) return false;
  const supabase = createSupabaseAdminClient();
  await supabase.from("appointments").update({ confirmed: true }).eq("id", apptId);
  return true;
}

export async function cancelAppointmentSelf(apptId: string, phone: string): Promise<boolean> {
  const tenant = await resolveTenant();
  if (!(await assertOwnedByPhone(tenant.id, apptId, phone))) return false;
  const supabase = createSupabaseAdminClient();
  await supabase.from("appointments").update({ status: "cancelado" }).eq("id", apptId);
  return true;
}

export interface PlanSignupInput {
  planId: string;
  clientName: string;
  phone: string;
  paymentMethod: string;
}

export async function signupPlanRequest(input: PlanSignupInput): Promise<{ ok: boolean }> {
  const tenant = await resolveTenant();
  const supabase = createSupabaseAdminClient();
  const clientName = input.clientName.trim();
  const phone = normalizePhone(input.phone);

  const { data: existingClient } = await supabase.from("clients").select("id").eq("tenant_id", tenant.id).eq("phone", phone).maybeSingle();
  if (existingClient) {
    await supabase.from("clients").update({ name: clientName }).eq("id", existingClient.id);
  } else {
    await supabase.from("clients").insert({ tenant_id: tenant.id, phone, name: clientName, visits: 0, total_spent: 0, last_visit: null });
  }

  const { error } = await supabase.from("plan_signups").insert({
    tenant_id: tenant.id,
    plan_id: input.planId,
    client_name: clientName,
    phone,
    payment_method: input.paymentMethod,
    status: "pendente",
  });

  return { ok: !error };
}
