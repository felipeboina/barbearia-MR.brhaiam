import { requireTenantSession } from "@/lib/current-tenant";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { AdminApp } from "@/components/admin/AdminApp";
import type { Appointment, Barber, Block, Client, Plan, PlanSignup, Product, Service, Transaction } from "@/lib/types";

export default async function AdminPage() {
  const { tenant } = await requireTenantSession();

  const supabase = await createSupabaseServerClient();
  const [
    { data: barbers },
    { data: services },
    { data: products },
    { data: clients },
    { data: appointments },
    { data: transactions },
    { data: blocks },
    { data: plans },
    { data: planSignups },
  ] = await Promise.all([
    supabase.from("barbers").select("*").eq("tenant_id", tenant.id).order("name"),
    supabase.from("services").select("*").eq("tenant_id", tenant.id).order("name"),
    supabase.from("products").select("*").eq("tenant_id", tenant.id).order("name"),
    supabase.from("clients").select("*").eq("tenant_id", tenant.id),
    supabase.from("appointments").select("*").eq("tenant_id", tenant.id).order("date", { ascending: false }).order("time"),
    supabase.from("transactions").select("*").eq("tenant_id", tenant.id).order("date", { ascending: false }),
    supabase.from("blocks").select("*").eq("tenant_id", tenant.id).order("date"),
    supabase.from("plans").select("*").eq("tenant_id", tenant.id).order("price"),
    supabase.from("plan_signups").select("*").eq("tenant_id", tenant.id).eq("status", "pendente"),
  ]);

  return (
    <AdminApp
      tenant={tenant}
      barbers={(barbers as Barber[]) || []}
      services={(services as Service[]) || []}
      products={(products as Product[]) || []}
      clients={(clients as Client[]) || []}
      appointments={(appointments as Appointment[]) || []}
      transactions={(transactions as Transaction[]) || []}
      blocks={(blocks as Block[]) || []}
      plans={(plans as Plan[]) || []}
      planSignups={(planSignups as PlanSignup[]) || []}
    />
  );
}
