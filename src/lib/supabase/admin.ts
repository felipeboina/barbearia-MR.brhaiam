import { createClient } from "@supabase/supabase-js";

/**
 * Client Supabase com a service role key — bypassa RLS. Uso EXCLUSIVO no
 * servidor (Server Actions/Route Handlers), nunca importado por código que
 * roda no browser. Usado nos fluxos públicos/anônimos (agendamento,
 * self-checkin, assinatura de plano, signup de tenant), onde o tenant é
 * sempre resolvido a partir do subdomínio no servidor e usado para filtrar
 * explicitamente cada query (isolamento garantido em código, não por RLS,
 * já que aqui não existe usuário autenticado).
 */
export function createSupabaseAdminClient() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
