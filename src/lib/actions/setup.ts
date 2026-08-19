"use server";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getRootDomain } from "@/lib/subdomain";
import { getTheTenant } from "@/lib/current-tenant";
import { headers } from "next/headers";

/**
 * Slug interno fixo — o banco continua sendo multi-tenant por baixo (coluna
 * tenant_id + RLS em tudo), mas o app só cria e usa uma única linha em
 * `tenants`. O slug nunca aparece pro usuário (não há mais subdomínio).
 */
const INTERNAL_SLUG = "main";

export interface SetupState {
  error?: string;
  success?: { needsEmailConfirmation: boolean };
}

export async function setupTenant(_prevState: SetupState, formData: FormData): Promise<SetupState> {
  const existing = await getTheTenant();
  if (existing) return { error: "Essa barbearia já foi configurada. Faça login." };

  const shopName = String(formData.get("shopName") || "").trim();
  const email = String(formData.get("email") || "").trim();
  const password = String(formData.get("password") || "");

  if (shopName.length < 2) return { error: "Digite o nome da sua barbearia." };
  if (!email.includes("@")) return { error: "Digite um e-mail válido." };
  if (password.length < 6) return { error: "A senha precisa ter pelo menos 6 caracteres." };

  const requestHeaders = await headers();
  const protocol = requestHeaders.get("x-forwarded-proto") || "https";
  const root = getRootDomain();
  const emailRedirectTo = `${protocol}://${root}/setup/confirmado`;

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo,
      data: { shop_name: shopName, subdomain: INTERNAL_SLUG },
    },
  });

  if (error) {
    if (error.message.toLowerCase().includes("already registered")) {
      return { error: "Já existe uma conta com esse e-mail." };
    }
    return { error: `Não deu pra criar sua conta: ${error.message}` };
  }
  if (!data.user) return { error: "Não deu pra criar sua conta, tenta de novo." };

  return { success: { needsEmailConfirmation: !data.session } };
}
