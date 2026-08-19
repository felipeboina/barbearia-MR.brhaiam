import { redirect } from "next/navigation";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import type { Tenant } from "@/lib/types";

/**
 * Site single-tenant: existe no máximo uma linha em `tenants` (criada uma
 * única vez pelo fluxo em `/setup`). Busca essa linha em vez de resolver por
 * subdomínio ou usuário logado.
 */
export async function getTheTenant(): Promise<Tenant | null> {
  // Sem credenciais do Supabase configuradas ainda (.env.local vazio), não
  // derruba a página com 500 — deixa ela tratar como "ainda não configurado".
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) return null;

  const supabase = createSupabaseAdminClient();
  const { data } = await supabase.from("tenants").select("*").limit(1).maybeSingle();
  return data as Tenant | null;
}

/**
 * Garante que a barbearia já foi configurada. Sem autenticação por enquanto
 * (decisão explícita — ver AGENTS.md/histórico do projeto): o painel /admin
 * fica acessível pra quem tiver o link, sem senha, até uma etapa futura
 * adicionar login de verdade.
 */
export async function requireTenant(): Promise<Tenant> {
  const tenant = await getTheTenant();
  if (!tenant) redirect("/setup");
  return tenant;
}
