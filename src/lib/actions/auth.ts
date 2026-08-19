"use server";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export interface LoginState {
  error?: string;
}

export async function signInTenant(_prevState: LoginState, formData: FormData): Promise<LoginState> {
  const email = String(formData.get("email") || "").trim();
  const password = String(formData.get("password") || "");
  if (!email || !password) return { error: "Preencha e-mail e senha." };

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) {
    if (error.message.toLowerCase().includes("email not confirmed")) {
      return { error: "Seu e-mail ainda não foi confirmado. Verifique a caixa de entrada (e o spam) do e-mail que você cadastrou." };
    }
    return { error: "E-mail ou senha incorretos." };
  }
  if (!data.user) return { error: "Não deu pra entrar, tenta de novo." };

  const { data: profile } = await supabase.from("profiles").select("tenant_id").eq("id", data.user.id).maybeSingle();

  if (!profile) {
    await supabase.auth.signOut();
    return { error: "Essa conta não tem uma barbearia configurada." };
  }

  redirect("/admin");
}

export async function signOutTenant() {
  const supabase = await createSupabaseServerClient();
  await supabase.auth.signOut();
  redirect("/admin/login");
}
