import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import type { Tenant } from "@/lib/types";

/**
 * Site single-tenant: existe no máximo uma linha em `tenants` (criada uma
 * única vez pelo fluxo em `/setup`). Busca essa linha em vez de resolver por
 * subdomínio.
 */
export async function getTheTenant(): Promise<Tenant | null> {
  // Sem credenciais do Supabase configuradas ainda (.env.local vazio), não
  // derruba a página com 500 — deixa ela tratar como "ainda não configurado".
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) return null;

  const supabase = createSupabaseAdminClient();
  const { data } = await supabase.from("tenants").select("*").limit(1).maybeSingle();
  if (!data) return null;
  // financial_pin nunca deve chegar num componente client — removido aqui,
  // no único ponto de onde o tenant é lido pro resto do app. As actions que
  // precisam checar/definir a senha (src/lib/actions/admin.ts) fazem sua
  // própria query direta nessa coluna e só devolvem boolean/void.
  const safe = { ...(data as Tenant & { financial_pin: string | null }) };
  delete (safe as { financial_pin?: string | null }).financial_pin;
  return safe;
}

/**
 * Garante que existe um usuário logado e que a barbearia já foi configurada.
 * Redireciona pro login (ou pro setup, se ainda não existe tenant) caso
 * contrário.
 */
export async function requireTenantSession(): Promise<{ tenant: Tenant; userId: string }> {
  const tenant = await getTheTenant();
  if (!tenant) redirect("/setup");

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/admin/login");

  const { data: profile } = await supabase.from("profiles").select("tenant_id").eq("id", user.id).maybeSingle();

  if (!profile || profile.tenant_id !== tenant!.id) {
    await supabase.auth.signOut();
    redirect("/admin/login");
  }

  return { tenant: tenant as Tenant, userId: user.id };
}
