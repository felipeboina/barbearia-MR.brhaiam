"use client";

import { useState } from "react";
import { ArrowLeft, Check, Copy } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { TextInput } from "@/components/ui/TextInput";
import { Field } from "@/components/ui/Field";
import { PixQrCode } from "@/components/ui/PixQrCode";
import { fmtMoney } from "@/lib/business/format";
import { buildPixPayload } from "@/lib/business/pix";
import { waLink } from "@/lib/business/messages";
import { PAYMENT_METHODS, type Plan, type Tenant } from "@/lib/types";
import { signupPlanRequest } from "@/lib/actions/public";

export function PlanSignupForm({ plan, tenant, onBack }: { plan: Plan; tenant: Tenant; onBack: () => void }) {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [pixCopied, setPixCopied] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const canSubmit = name.trim().length >= 2 && phone.trim().length >= 8 && paymentMethod;
  const pixPayload =
    tenant.pix_key && paymentMethod === "pix"
      ? buildPixPayload({ pixKey: tenant.pix_key, merchantName: tenant.shop_name, merchantCity: tenant.pix_city, amount: plan.price })
      : null;
  const sendReceiptLink = tenant.shop_whatsapp
    ? waLink(tenant.shop_whatsapp, `Olá! Aqui está o comprovante do PIX da minha assinatura do ${plan.name} (${fmtMoney(plan.price)}/${plan.period})${name.trim() ? ` — ${name.trim()}` : ""}. Segue em anexo!`)
    : null;

  const submit = async () => {
    if (!canSubmit) return;
    setSubmitting(true);
    await signupPlanRequest({ planId: plan.id, clientName: name, phone, paymentMethod: paymentMethod! });
    setSubmitting(false);
    setDone(true);
  };

  if (done) {
    return (
      <div className="max-w-md mx-auto px-4 pb-16 pt-10 text-center anim-step">
        <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-5 bg-brass">
          <Check size={30} className="text-ink" />
        </div>
        <h2 className="text-xl mb-2 font-heading text-cream">Interesse registrado!</h2>
        <p className="text-sm text-muted font-body">A barbearia vai confirmar sua assinatura do {plan.name} em breve.</p>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto px-4 pb-16 pt-6 anim-step">
      <button onClick={onBack} className="flex items-center gap-1 text-sm mb-6 smooth text-muted font-body">
        <ArrowLeft size={16} /> Voltar
      </button>
      <h2 className="text-xl mb-1 font-heading text-cream">Assinar {plan.name}</h2>
      <p className="text-sm mb-6 text-brass font-mono-receipt">
        {fmtMoney(plan.price)}/{plan.period}
      </p>

      <Field label="Nome completo">
        <TextInput value={name} onChange={(e) => setName(e.target.value)} placeholder="Seu nome" />
      </Field>
      <Field label="Telefone / WhatsApp">
        <TextInput value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="(00) 00000-0000" />
      </Field>

      <span className="block text-xs uppercase tracking-wider mb-1.5 text-muted font-body">Forma de pagamento</span>
      <div className="flex gap-2 mb-4">
        {PAYMENT_METHODS.map((m) => (
          <button
            key={m.id}
            onClick={() => setPaymentMethod(m.id)}
            className="flex-1 press-scale rounded-md py-2.5 text-sm font-body border smooth"
            style={{ borderColor: paymentMethod === m.id ? "var(--brass)" : "var(--line)", color: "var(--cream)" }}
          >
            {m.label}
          </button>
        ))}
      </div>

      {paymentMethod === "pix" && pixPayload && (
        <Card className="mb-4 text-center">
          <div className="flex justify-center mb-3">
            <PixQrCode value={pixPayload} size={150} />
          </div>
          <Button
            variant="ghost"
            className="w-full mb-2 flex items-center justify-center gap-2"
            onClick={() => {
              navigator.clipboard?.writeText(tenant.pix_key).then(() => {
                setPixCopied(true);
                setTimeout(() => setPixCopied(false), 2000);
              });
            }}
          >
            {pixCopied ? <Check size={14} /> : <Copy size={14} />} {pixCopied ? "Chave copiada!" : "Copiar chave PIX"}
          </Button>
          {sendReceiptLink && (
            <a href={sendReceiptLink} target="_blank" rel="noopener noreferrer" className="text-xs text-whatsapp font-body underline">
              Enviar comprovante pelo WhatsApp
            </a>
          )}
        </Card>
      )}

      <Button variant="primary" className="w-full" disabled={!canSubmit || submitting} onClick={submit}>
        {submitting ? "Enviando..." : "Confirmar interesse"}
      </Button>
    </div>
  );
}
