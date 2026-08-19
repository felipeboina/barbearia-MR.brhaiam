import Link from "next/link";
import { Scissors } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { PoleStripe } from "@/components/ui/PoleStripe";
import { getTheTenant } from "@/lib/current-tenant";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { PublicBookingApp } from "@/components/booking/PublicBookingApp";
import type { Barber, Plan, Product, Service } from "@/lib/types";

// Sempre renderizada por requisição — nunca pode ser servida como HTML
// estático congelado do momento do build (agenda/serviços mudam o tempo todo).
export const dynamic = "force-dynamic";

export default async function HomePage() {
  const tenant = await getTheTenant();

  if (!tenant) {
    return (
      <div className="flex-1 flex flex-col">
        <PoleStripe />
        <div className="flex-1 flex flex-col items-center justify-center px-4 text-center py-20">
          <div className="w-16 h-16 rounded-full flex items-center justify-center mb-6 bg-barber-red">
            <Scissors size={28} className="text-cream" />
          </div>
          <h1 className="text-3xl mb-4 font-heading text-cream">Sua barbearia ainda não foi configurada</h1>
          <p className="max-w-lg text-muted mb-8 font-body">Configure sua barbearia uma única vez — nome, e-mail e senha do painel do barbeiro.</p>
          <Link href="/setup">
            <Button variant="primary">Configurar minha barbearia</Button>
          </Link>
        </div>
      </div>
    );
  }

  const supabase = createSupabaseAdminClient();
  const [{ data: barbers }, { data: services }, { data: products }, { data: plans }] = await Promise.all([
    supabase.from("barbers").select("*").eq("tenant_id", tenant.id).order("name"),
    supabase.from("services").select("*").eq("tenant_id", tenant.id).order("name"),
    supabase.from("products").select("*").eq("tenant_id", tenant.id).order("name"),
    supabase.from("plans").select("*").eq("tenant_id", tenant.id).eq("active", true).order("price"),
  ]);

  return (
    <PublicBookingApp
      tenant={tenant}
      barbers={(barbers as Barber[]) || []}
      services={(services as Service[]) || []}
      products={(products as Product[]) || []}
      plans={(plans as Plan[]) || []}
    />
  );
}
