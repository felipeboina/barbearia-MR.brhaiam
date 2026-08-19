import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

/**
 * Renova a sessão do Supabase Auth em toda requisição (necessário pra Server
 * Components conseguirem ler um usuário logado sem token expirado). Site é
 * single-tenant — não há mais reescrita de rota por subdomínio.
 */
export async function proxy(request: NextRequest) {
  const response = NextResponse.next({ request });

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  // Sem credenciais do Supabase configuradas (.env.local ainda vazio), pula a
  // renovação de sessão em vez de derrubar toda rota com 500 — permite ver as
  // páginas que não dependem de dados antes de conectar o banco.
  if (supabaseUrl && supabaseAnonKey) {
    const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
        },
      },
    });

    // getUser() (não getSession()) valida o token contra o servidor Supabase
    // e renova automaticamente se estiver expirado, persistindo o novo cookie
    // na `response` construída acima.
    await supabase.auth.getUser();
  }

  return response;
}

export const config = {
  matcher: [
    /*
     * Roda em tudo, exceto assets estáticos internos do Next e arquivos
     * públicos comuns (favicon, imagens etc.).
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
