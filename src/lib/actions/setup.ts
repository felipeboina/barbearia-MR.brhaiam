"use server";

import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { getTheTenant } from "@/lib/current-tenant";

/**
 * Slug interno fixo — o banco continua sendo multi-tenant por baixo (coluna
 * tenant_id + RLS em tudo), mas o app só cria e usa uma única linha em
 * `tenants`. O slug nunca aparece pro usuário (não há subdomínio nem login).
 */
const INTERNAL_SLUG = "main";

export interface SetupState {
  error?: string;
  success?: boolean;
}

export async function setupTenant(_prevState: SetupState, formData: FormData): Promise<SetupState> {
  const existing = await getTheTenant();
  if (existing) return { error: "Essa barbearia já foi configurada." };

  const shopName = String(formData.get("shopName") || "").trim();
  if (shopName.length < 2) return { error: "Digite o nome da sua barbearia." };

  const supabase = createSupabaseAdminClient();

  const { data: tenant, error } = await supabase.from("tenants").insert({ slug: INTERNAL_SLUG, shop_name: shopName }).select().single();
  if (error || !tenant) return { error: "Não deu pra criar sua barbearia, tenta de novo." };

  // Barbeiro e serviços de exemplo, pra já abrir o painel com algo pra editar
  // (mesma lista que o gatilho de onboarding multi-tenant criava antes).
  await supabase.from("barbers").insert({ tenant_id: tenant.id, name: "Barbeiro 1", commission: 40 });
  await supabase.from("services").insert([
    { tenant_id: tenant.id, name: "Corte Masculino", price: 45, duration: 30 },
    { tenant_id: tenant.id, name: "Barba", price: 30, duration: 20 },
    { tenant_id: tenant.id, name: "Corte + Barba", price: 65, duration: 50 },
    { tenant_id: tenant.id, name: "Sobrancelha", price: 15, duration: 10 },
  ]);

  return { success: true };
}
