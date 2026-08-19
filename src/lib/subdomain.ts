/**
 * Domínio raiz onde o site roda — usado só para montar links absolutos
 * (ex: redirect de confirmação de e-mail do Supabase Auth).
 * Em desenvolvimento local: "localhost:3000". Em produção: o domínio real
 * (ex: "minhabarbearia.com.br" ou o *.vercel.app do deploy).
 */
export function getRootDomain() {
  return process.env.NEXT_PUBLIC_ROOT_DOMAIN || "localhost:3000";
}
