import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

/**
 * Client Supabase para uso em Server Components / Server Actions, vinculado
 * à sessão do usuário logado (cookies). Toda query feita com este client
 * respeita as políticas de RLS — nunca enxerga dados de outro tenant.
 */
export async function createSupabaseServerClient() {
  const cookieStore = await cookies();

  return createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
        } catch {
          // chamado a partir de um Server Component (sem permissão de escrever
          // cookies) — o proxy.ts já cuida de renovar a sessão nesse caso.
        }
      },
    },
  });
}
