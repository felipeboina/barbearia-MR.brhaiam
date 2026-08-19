"use client";

import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Field } from "@/components/ui/Field";
import { TextInput } from "@/components/ui/TextInput";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { setupTenant, type SetupState } from "@/lib/actions/setup";

const initialState: SetupState = {};

export function SetupForm() {
  const [state, formAction, pending] = useActionState(setupTenant, initialState);
  const router = useRouter();

  useEffect(() => {
    if (state.success) router.push("/admin");
  }, [state.success, router]);

  return (
    <Card className="max-w-md mx-auto">
      <form action={formAction}>
        <Field label="Nome da barbearia">
          <TextInput name="shopName" placeholder="Barbearia do João" required minLength={2} autoFocus />
        </Field>

        {state.error && <p className="text-sm text-danger mb-4 font-body">{state.error}</p>}

        <Button type="submit" variant="primary" className="w-full" disabled={pending}>
          {pending ? "Criando..." : "Configurar minha barbearia"}
        </Button>
      </form>
    </Card>
  );
}
