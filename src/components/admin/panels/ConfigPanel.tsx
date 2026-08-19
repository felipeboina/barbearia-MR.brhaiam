"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash2 } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Field } from "@/components/ui/Field";
import { TextInput } from "@/components/ui/TextInput";
import { DAYS_PT } from "@/lib/business/format";
import { addBarber, addService, deleteBarber, deleteService, updateBarber, updateTenantConfig } from "@/lib/actions/admin";
import type { AdminData } from "../AdminApp";
import type { Tenant } from "@/lib/types";

function NumberField({ label, value, onCommit }: { label: string; value: number; onCommit: (v: number) => void }) {
  const [local, setLocal] = useState(String(value));
  return (
    <Field label={label}>
      <TextInput
        type="number"
        value={local}
        onChange={(e) => setLocal(e.target.value)}
        onBlur={() => {
          const n = Number(local);
          if (!Number.isNaN(n)) onCommit(n);
        }}
      />
    </Field>
  );
}

function TextField({ label, value, onCommit, placeholder }: { label: string; value: string; onCommit: (v: string) => void; placeholder?: string }) {
  const [local, setLocal] = useState(value);
  return (
    <Field label={label}>
      <TextInput value={local} placeholder={placeholder} onChange={(e) => setLocal(e.target.value)} onBlur={() => onCommit(local)} />
    </Field>
  );
}

export function ConfigPanel({ tenant, barbers, services }: AdminData) {
  const router = useRouter();
  const [newBarber, setNewBarber] = useState({ name: "", commission: "40" });
  const [newService, setNewService] = useState({ name: "", price: "", duration: "30" });

  const save = async (patch: Partial<Tenant>) => {
    await updateTenantConfig(patch as Record<string, unknown>);
    router.refresh();
  };

  const toggleWorkDay = (day: number) => {
    const days = tenant.work_days.includes(day) ? tenant.work_days.filter((d) => d !== day) : [...tenant.work_days, day];
    save({ work_days: days });
  };

  return (
    <div className="anim-step max-w-3xl">
      <h1 className="text-2xl mb-6 font-heading text-cream">Configurações</h1>

      <Card className="mb-4">
        <h3 className="text-sm uppercase tracking-wider text-muted mb-3 font-body">Loja</h3>
        <div className="grid grid-cols-2 gap-x-3">
          <TextField label="Nome da loja" value={tenant.shop_name} onCommit={(v) => save({ shop_name: v })} />
          <NumberField label="Horário de abertura" value={tenant.open_hour} onCommit={(v) => save({ open_hour: v })} />
          <NumberField label="Horário de fechamento" value={tenant.close_hour} onCommit={(v) => save({ close_hour: v })} />
          <NumberField label="Duração do slot (min)" value={tenant.slot_min} onCommit={(v) => save({ slot_min: v })} />
        </div>
        <span className="block text-xs uppercase tracking-wider mb-1.5 mt-1 text-muted font-body">Dias de funcionamento</span>
        <div className="flex gap-1.5 mb-2">
          {DAYS_PT.map((label, i) => (
            <button
              key={i}
              onClick={() => toggleWorkDay(i)}
              className="press-scale w-9 h-9 rounded-md text-xs border smooth font-body"
              style={{
                background: tenant.work_days.includes(i) ? "var(--brass)" : "transparent",
                color: tenant.work_days.includes(i) ? "var(--ink)" : "var(--muted)",
                borderColor: "var(--line)",
              }}
            >
              {label}
            </button>
          ))}
        </div>
        <TextField label="Endereço" value={tenant.address} onCommit={(v) => save({ address: v })} placeholder="Rua, número, bairro" />
      </Card>

      <Card className="mb-4">
        <h3 className="text-sm uppercase tracking-wider text-muted mb-3 font-body">PIX e contato</h3>
        <div className="grid grid-cols-2 gap-x-3">
          <TextField label="Chave PIX" value={tenant.pix_key} onCommit={(v) => save({ pix_key: v })} />
          <TextField label="Cidade (PIX)" value={tenant.pix_city} onCommit={(v) => save({ pix_city: v })} />
          <TextField label="WhatsApp da loja" value={tenant.shop_whatsapp} onCommit={(v) => save({ shop_whatsapp: v })} placeholder="(00) 00000-0000" />
        </div>
      </Card>

      <Card className="mb-4">
        <h3 className="text-sm uppercase tracking-wider text-muted mb-3 font-body">Automações e fidelidade</h3>
        <div className="grid grid-cols-2 gap-x-3">
          <NumberField label="Lembrete (horas antes)" value={tenant.reminder_hours} onCommit={(v) => save({ reminder_hours: v })} />
          <NumberField label="Desconto de aniversário (%)" value={tenant.birthday_discount} onCommit={(v) => save({ birthday_discount: v })} />
          <NumberField label="Limite de faltas (aviso)" value={tenant.no_show_threshold} onCommit={(v) => save({ no_show_threshold: v })} />
          <NumberField label="Dias p/ considerar inativo" value={tenant.inactive_days} onCommit={(v) => save({ inactive_days: v })} />
          <NumberField label="Desconto p/ reengajar (%)" value={tenant.inactive_discount} onCommit={(v) => save({ inactive_discount: v })} />
          <NumberField label="Aviso antecipado (dias)" value={tenant.early_reminder_days} onCommit={(v) => save({ early_reminder_days: v })} />
          <NumberField label="Meta de fidelidade (cortes)" value={tenant.loyalty_goal} onCommit={(v) => save({ loyalty_goal: v })} />
          <TextField label="Recompensa de fidelidade" value={tenant.loyalty_reward} onCommit={(v) => save({ loyalty_reward: v })} />
          <NumberField label="Desconto de indicação (%)" value={tenant.referral_discount} onCommit={(v) => save({ referral_discount: v })} />
          <NumberField label="Aviso de vencimento de plano (dias)" value={tenant.plan_expiry_reminder_days} onCommit={(v) => save({ plan_expiry_reminder_days: v })} />
        </div>
      </Card>

      <Card className="mb-4">
        <h3 className="text-sm uppercase tracking-wider text-muted mb-3 font-body">Barbeiros</h3>
        <div className="space-y-2 mb-4">
          {barbers.map((b) => (
            <div key={b.id} className="flex items-center justify-between py-1.5 border-b border-line last:border-0 gap-2 flex-wrap">
              <span className="text-sm text-cream font-body">{b.name}</span>
              <div className="flex items-center gap-3">
                <span className="text-xs text-muted font-mono-receipt">{b.commission}% comissão</span>
                <div className="flex items-center gap-1 text-xs text-muted font-body">
                  <input
                    type="number"
                    defaultValue={b.start_hour ?? ""}
                    placeholder="loja"
                    onBlur={async (e) => {
                      const v = e.target.value === "" ? null : Number(e.target.value);
                      await updateBarber(b.id, { start_hour: v });
                      router.refresh();
                    }}
                    className="w-14 rounded px-1.5 py-1 bg-ink border border-line text-cream text-xs"
                  />
                  <span>–</span>
                  <input
                    type="number"
                    defaultValue={b.end_hour ?? ""}
                    placeholder="loja"
                    onBlur={async (e) => {
                      const v = e.target.value === "" ? null : Number(e.target.value);
                      await updateBarber(b.id, { end_hour: v });
                      router.refresh();
                    }}
                    className="w-14 rounded px-1.5 py-1 bg-ink border border-line text-cream text-xs"
                  />
                  <span>h</span>
                </div>
                <button
                  onClick={async () => {
                    await deleteBarber(b.id);
                    router.refresh();
                  }}
                  className="text-danger press-scale"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>
        <p className="text-xs text-muted mb-4 font-body">Horário individual (opcional) — deixe em branco pra usar o horário geral da loja.</p>
        <div className="flex gap-2">
          <TextInput placeholder="Nome" value={newBarber.name} onChange={(e) => setNewBarber((s) => ({ ...s, name: e.target.value }))} className="flex-1" />
          <TextInput
            type="number"
            placeholder="% comissão"
            value={newBarber.commission}
            onChange={(e) => setNewBarber((s) => ({ ...s, commission: e.target.value }))}
            className="w-28"
          />
          <Button
            variant="brass"
            onClick={async () => {
              if (!newBarber.name.trim()) return;
              await addBarber(newBarber.name.trim(), parseFloat(newBarber.commission) || 0);
              setNewBarber({ name: "", commission: "40" });
              router.refresh();
            }}
          >
            <Plus size={14} />
          </Button>
        </div>
      </Card>

      <Card>
        <h3 className="text-sm uppercase tracking-wider text-muted mb-3 font-body">Serviços</h3>
        <div className="space-y-2 mb-4">
          {services.map((s) => (
            <div key={s.id} className="flex items-center justify-between py-1.5 border-b border-line last:border-0">
              <span className="text-sm text-cream font-body">{s.name}</span>
              <div className="flex items-center gap-3">
                <span className="text-xs text-muted font-mono-receipt">
                  R$ {s.price.toFixed(2)} · {s.duration}min
                </span>
                <button
                  onClick={async () => {
                    await deleteService(s.id);
                    router.refresh();
                  }}
                  className="text-danger press-scale"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>
        <div className="flex gap-2">
          <TextInput placeholder="Nome" value={newService.name} onChange={(e) => setNewService((s) => ({ ...s, name: e.target.value }))} className="flex-1" />
          <TextInput
            type="number"
            placeholder="Preço"
            value={newService.price}
            onChange={(e) => setNewService((s) => ({ ...s, price: e.target.value }))}
            className="w-24"
          />
          <TextInput
            type="number"
            placeholder="Min."
            value={newService.duration}
            onChange={(e) => setNewService((s) => ({ ...s, duration: e.target.value }))}
            className="w-20"
          />
          <Button
            variant="brass"
            onClick={async () => {
              if (!newService.name.trim() || !newService.price) return;
              await addService(newService.name.trim(), parseFloat(newService.price), parseInt(newService.duration) || 30);
              setNewService({ name: "", price: "", duration: "30" });
              router.refresh();
            }}
          >
            <Plus size={14} />
          </Button>
        </div>
      </Card>
    </div>
  );
}
