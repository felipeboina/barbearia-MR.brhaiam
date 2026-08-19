"use client";

import { useActionState } from "react";
import { Check } from "lucide-react";
import { Field } from "@/components/ui/Field";
import { TextInput } from "@/components/ui/TextInput";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { setupTenant, type SetupState } from "@/lib/actions/setup";

const initialState: SetupState = {};

export function SetupForm() {
  const [state, formAction, pending] = useActionState(setupTenant, initialState);

  if (state.success) {
    return (
      <Card className="max-w-md mx-auto text-center anim-pop">
        <div className="w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-4 bg-brass">
          <Check size={26} className="text-ink" />
        </div>
        <h2 className="text-xl mb-2 font-heading text-cream">Sua barbearia foi criada!</h2>
        {state.success.needsEmailConfirmation ? (
          <p className="text-sm text-muted mb-6 font-body">Te enviamos um e-mail de confirmação. Depois de confirmar, entre com o e-mail e senha que você criou.</p>
        ) : (
          <p className="text-sm text-muted mb-6 font-body">Agora é só entrar com o e-mail e senha que você criou.</p>
        )}
        <a href="/admin/login">
          <Button variant="brass">Ir para o login</Button>
        </a>
      </Card>
    );
  }

  return (
    <Card className="max-w-md mx-auto">
      <form action={formAction}>
        <Field label="Nome da barbearia">
          <TextInput name="shopName" placeholder="Barbearia do João" required minLength={2} />
        </Field>

        <Field label="Seu e-mail">
          <TextInput type="email" name="email" placeholder="voce@email.com" required />
        </Field>

        <Field label="Senha">
          <TextInput type="password" name="password" placeholder="mínimo 6 caracteres" required minLength={6} />
        </Field>

        {state.error && <p className="text-sm text-danger mb-4 font-body">{state.error}</p>}

        <Button type="submit" variant="primary" className="w-full" disabled={pending}>
          {pending ? "Criando..." : "Configurar minha barbearia"}
        </Button>
      </form>
    </Card>
  );
}
