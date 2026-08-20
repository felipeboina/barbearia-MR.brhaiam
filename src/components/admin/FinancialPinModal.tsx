"use client";

import { useState } from "react";
import { Lock, X } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Field } from "@/components/ui/Field";
import { TextInput } from "@/components/ui/TextInput";
import { checkFinancialPin } from "@/lib/actions/admin";

export function FinancialPinModal({ onSuccess, onCancel }: { onSuccess: () => void; onCancel: () => void }) {
  const [pin, setPin] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [checking, setChecking] = useState(false);

  const submit = async () => {
    if (!pin || checking) return;
    setChecking(true);
    setError(null);
    const ok = await checkFinancialPin(pin);
    setChecking(false);
    if (ok) onSuccess();
    else {
      setError("Senha incorreta.");
      setPin("");
    }
  };

  return (
    <div className="fixed inset-0 bg-black/70 z-[60] flex items-center justify-center px-4" onClick={onCancel}>
      <Card className="max-w-xs w-full anim-pop" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-cream font-body flex items-center gap-1.5">
            <Lock size={14} className="text-brass" /> Área protegida
          </h3>
          <button onClick={onCancel} className="text-muted press-scale" aria-label="Fechar">
            <X size={16} />
          </button>
        </div>
        <p className="text-xs text-muted mb-3 font-body">Digite a senha do Financeiro pra continuar.</p>
        <Field label="Senha">
          <TextInput
            type="password"
            value={pin}
            onChange={(e) => setPin(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && submit()}
            autoFocus
          />
        </Field>
        {error && <p className="text-xs text-danger mb-3 font-body">{error}</p>}
        <Button variant="primary" className="w-full" disabled={checking || !pin} onClick={submit}>
          {checking ? "Verificando..." : "Entrar"}
        </Button>
      </Card>
    </div>
  );
}
