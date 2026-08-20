"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { RotateCcw } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Field } from "@/components/ui/Field";
import { TextInput, TextArea } from "@/components/ui/TextInput";
import { DEFAULT_TEMPLATES, TEMPLATE_INFO } from "@/lib/business/messages";
import { updateTenantConfig } from "@/lib/actions/admin";
import type { AdminData } from "../AdminApp";

export function MensagensPanel({ tenant }: AdminData) {
  const router = useRouter();
  const [senderNumber, setSenderNumber] = useState(tenant.message_sender_number);
  const [drafts, setDrafts] = useState<Record<string, string>>({});

  const valueFor = (key: string) => drafts[key] ?? tenant.templates?.[key as keyof typeof tenant.templates] ?? DEFAULT_TEMPLATES[key as keyof typeof DEFAULT_TEMPLATES];

  const saveTemplate = async (key: string, text: string) => {
    await updateTenantConfig({ templates: { ...tenant.templates, [key]: text } });
    router.refresh();
  };

  const resetTemplate = async (key: string) => {
    const next = { ...tenant.templates };
    delete next[key as keyof typeof next];
    await updateTenantConfig({ templates: next });
    setDrafts((d) => {
      const copy = { ...d };
      delete copy[key];
      return copy;
    });
    router.refresh();
  };

  return (
    <div className="anim-step max-w-3xl mx-auto">
      <h1 className="text-2xl mb-6 font-heading text-cream">Mensagens</h1>

      <Card className="mb-6">
        <Field label="Número que envia as mensagens (informativo)">
          <TextInput
            value={senderNumber}
            onChange={(e) => setSenderNumber(e.target.value)}
            onBlur={async () => {
              await updateTenantConfig({ message_sender_number: senderNumber });
              router.refresh();
            }}
            placeholder="(00) 00000-0000"
          />
        </Field>
        <p className="text-xs text-muted font-body">
          As mensagens saem por link do WhatsApp (wa.me) — esse número é só pra você lembrar qual celular usar, não envia nada automaticamente.
        </p>
      </Card>

      <div className="space-y-4">
        {TEMPLATE_INFO.map((info) => {
          const value = valueFor(info.key);
          const isDefault = !tenant.templates?.[info.key];
          return (
            <Card key={info.key}>
              <div className="flex items-start justify-between gap-3 mb-2">
                <div>
                  <h3 className="text-sm font-semibold text-cream font-body">{info.label}</h3>
                  <p className="text-xs text-muted font-body">{info.description}</p>
                </div>
                {!isDefault && (
                  <button
                    onClick={() => resetTemplate(info.key)}
                    className="text-xs text-muted flex items-center gap-1 press-scale shrink-0 font-body"
                    title="Restaurar padrão"
                  >
                    <RotateCcw size={12} /> Restaurar
                  </button>
                )}
              </div>
              <TextArea
                rows={3}
                value={value}
                onChange={(e) => setDrafts((d) => ({ ...d, [info.key]: e.target.value }))}
                onBlur={(e) => saveTemplate(info.key, e.target.value)}
              />
              <p className="text-[11px] text-muted mt-1.5 font-body">Placeholders: {info.placeholders.map((p) => `{{${p}}}`).join(", ")}</p>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
