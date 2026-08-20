import type { CookieOptions } from "@supabase/ssr";

/**
 * @supabase/ssr sempre grava o cookie de sessão com maxAge de 400 dias (o
 * teto que os navegadores aceitam) — ver applyServerStorage no pacote
 * @supabase/ssr, dentro de cookies.js, que ignora qualquer maxAge
 * passado em `cookieOptions` na hora de escrever e força
 * `maxAge: DEFAULT_COOKIE_OPTIONS.maxAge`. Por decisão do dono da barbearia,
 * o login não deve persistir entre sessões do navegador: fechando o
 * navegador (não só a aba) e voltando depois, precisa pedir e-mail/senha de
 * novo. Como a lib não expõe uma forma de configurar isso, removemos
 * maxAge/expires aqui na escrita do cookie, na nossa própria implementação
 * de `setAll` — isso vira um cookie de sessão de verdade (nasce e morre com
 * o processo do navegador). `maxAge: 0` (usado pra apagar o cookie no
 * logout) é preservado, senão sign-out pararia de funcionar.
 */
export function toSessionCookieOptions(options: CookieOptions): CookieOptions {
  if (options.maxAge === 0) return options;
  const rest = { ...options };
  delete rest.maxAge;
  delete rest.expires;
  return rest;
}
