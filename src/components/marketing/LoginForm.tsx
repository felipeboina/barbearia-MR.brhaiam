"use client";

import { useActionState } from "react";
import { Field } from "@/components/ui/Field";
import { TextInput } from "@/components/ui/TextInput";
import { Button } from "@/components/ui/Button";
import { signInTenant, type LoginState } from "@/lib/actions/auth";

const initialState: LoginState = {};

export function LoginForm() {
  const [state, formAction, pending] = useActionState(signInTenant, initialState);

  return (
    <form action={formAction}>
      <Field label="E-mail">
        <TextInput type="email" name="email" placeholder="voce@email.com" required autoFocus />
      </Field>
      <Field label="Senha">
        <TextInput type="password" name="password" placeholder="sua senha" required />
      </Field>
      {state.error && <p className="text-sm text-danger mb-4 font-body">{state.error}</p>}
      <Button type="submit" variant="primary" className="w-full" disabled={pending}>
        {pending ? "Entrando..." : "Entrar"}
      </Button>
    </form>
  );
}
