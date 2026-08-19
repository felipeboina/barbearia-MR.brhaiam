"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Crown, MessageCircle, Trash2 } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Field } from "@/components/ui/Field";
import { TextInput, TextArea } from "@/components/ui/TextInput";
import { Toggle } from "@/components/ui/Toggle";
import { fmtMoney } from "@/lib/business/format";
import { getPlanStatus } from "@/lib/business/plans";
import { planReminderMessage, waLink } from "@/lib/business/messages";
import {
  addPlan,
  approveSignup,
  assignPlan,
  cancelClientPlan,
  deletePlan,
  dismissSignup,
  renewPlan,
  updatePlan,
  updateTenantConfig,
} from "@/lib/actions/admin";
import type { AdminData } from "../AdminApp";

const emptyForm = { name: "", price: "", period: "mês", periodDays: "30", cutsIncluded: "1", benefits: "" };

export function PlanosPanel({ tenant, plans, clients, planSignups }: AdminData) {
  const router = useRouter();
  const [form, setForm] = useState(emptyForm);
  const [submitting, setSubmitting] = useState(false);
  const [assignPhone, setAssignPhone] = useState("");
  const [assignPlanId, setAssignPlanId] = useState(plans[0]?.id || "");

  const subscribers = clients
    .map((c) => ({ client: c, status: getPlanStatus(c, plans) }))
    .filter((x): x is { client: (typeof clients)[number]; status: NonNullable<ReturnType<typeof getPlanStatus>> } => !!x.status)
    .sort((a, b) => a.status.daysUntilExpiry - b.status.daysUntilExpiry);

  const submit = async () => {
    if (!form.name.trim() || !form.price) return;
    setSubmitting(true);
    await addPlan({
      name: form.name.trim(),
      price: parseFloat(form.price),
      period: form.period.trim() || "mês",
      periodDays: parseInt(form.periodDays) || 30,
      cutsIncluded: parseInt(form.cutsIncluded) || 1,
      benefits: form.benefits.split("\n").map((b) => b.trim()).filter(Boolean),
    });
    setSubmitting(false);
    setForm(emptyForm);
    router.refresh();
  };

  return (
    <div className="anim-step max-w-3xl">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-heading text-cream flex items-center gap-2">
          <Crown size={22} className="text-brass" /> Planos
        </h1>
        <Toggle
          checked={tenant.plans_enabled}
          onChange={(v) => {
            updateTenantConfig({ plans_enabled: v }).then(() => router.refresh());
          }}
          label="Mostrar pros clientes"
        />
      </div>

      {planSignups.length > 0 && (
        <div className="mb-6">
          <h2 className="text-sm uppercase tracking-wider text-brass mb-3 font-body">Solicitações pendentes</h2>
          <div className="space-y-2">
            {planSignups.map((s) => {
              const plan = plans.find((p) => p.id === s.plan_id);
              return (
                <Card key={s.id} className="flex items-center justify-between flex-wrap gap-2">
                  <div className="text-sm font-body">
                    <span className="text-cream font-semibold">{s.client_name}</span>{" "}
                    <span className="text-muted">quer assinar {plan?.name || "plano"} ({s.payment_method})</span>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="brass"
                      onClick={async () => {
                        await approveSignup(s.id, s.phone, s.plan_id);
                        router.refresh();
                      }}
                    >
                      Aprovar
                    </Button>
                    <Button
                      variant="ghost"
                      onClick={async () => {
                        await dismissSignup(s.id);
                        router.refresh();
                      }}
                    >
                      Descartar
                    </Button>
                  </div>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      <div className="mb-6">
        <h2 className="text-sm uppercase tracking-wider text-muted mb-3 font-body">Planos cadastrados</h2>
        <div className="space-y-2">
          {plans.map((p) => (
            <Card key={p.id} className="flex items-center justify-between flex-wrap gap-2">
              <div>
                <div className="text-sm font-semibold text-cream font-body">{p.name}</div>
                <div className="text-xs text-muted font-body">
                  {fmtMoney(p.price)}/{p.period} · {p.cuts_included} corte(s)
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Toggle
                  checked={p.active}
                  onChange={async (v) => {
                    await updatePlan(p.id, { active: v });
                    router.refresh();
                  }}
                />
                <button
                  onClick={async () => {
                    await deletePlan(p.id);
                    router.refresh();
                  }}
                  className="text-danger press-scale"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </Card>
          ))}
          {plans.length === 0 && <p className="text-muted font-body text-sm">Nenhum plano cadastrado.</p>}
        </div>
      </div>

      <Card className="mb-6">
        <h3 className="text-sm uppercase tracking-wider text-muted mb-3 font-body">Novo plano</h3>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Nome">
            <TextInput value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
          </Field>
          <Field label="Preço">
            <TextInput type="number" step="0.01" value={form.price} onChange={(e) => setForm((f) => ({ ...f, price: e.target.value }))} />
          </Field>
          <Field label="Período (texto)">
            <TextInput value={form.period} onChange={(e) => setForm((f) => ({ ...f, period: e.target.value }))} />
          </Field>
          <Field label="Duração (dias)">
            <TextInput type="number" value={form.periodDays} onChange={(e) => setForm((f) => ({ ...f, periodDays: e.target.value }))} />
          </Field>
          <Field label="Cortes incluídos">
            <TextInput type="number" value={form.cutsIncluded} onChange={(e) => setForm((f) => ({ ...f, cutsIncluded: e.target.value }))} />
          </Field>
        </div>
        <Field label="Benefícios (um por linha)">
          <TextArea rows={3} value={form.benefits} onChange={(e) => setForm((f) => ({ ...f, benefits: e.target.value }))} />
        </Field>
        <Button variant="primary" disabled={submitting} onClick={submit}>
          {submitting ? "Salvando..." : "Adicionar plano"}
        </Button>
      </Card>

      <Card className="mb-6">
        <h3 className="text-sm uppercase tracking-wider text-muted mb-3 font-body">Assinar plano manualmente</h3>
        <div className="flex gap-2 flex-wrap">
          <TextInput value={assignPhone} onChange={(e) => setAssignPhone(e.target.value)} placeholder="Telefone do cliente" className="flex-1 min-w-[160px]" />
          <select
            value={assignPlanId}
            onChange={(e) => setAssignPlanId(e.target.value)}
            className="rounded-md px-3 py-2.5 text-[15px] outline-none border bg-ink border-line text-cream font-body"
          >
            {plans.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
          <Button
            variant="brass"
            onClick={async () => {
              if (!assignPhone.trim() || !assignPlanId) return;
              await assignPlan(assignPhone.trim(), assignPlanId);
              setAssignPhone("");
              router.refresh();
            }}
          >
            Ativar
          </Button>
        </div>
        <p className="text-xs text-muted mt-2 font-body">O cliente precisa já ter feito pelo menos um agendamento.</p>
      </Card>

      <h2 className="text-sm uppercase tracking-wider text-muted mb-3 font-body">Assinantes</h2>
      <div className="space-y-2">
        {subscribers.map(({ client, status }) => {
          const urgent = status.expired || status.daysUntilExpiry <= tenant.plan_expiry_reminder_days || status.cutsRemaining === 0;
          return (
            <Card key={client.id} className="flex items-center justify-between flex-wrap gap-2" style={urgent ? { borderColor: "var(--danger)" } : undefined}>
              <div>
                <div className="text-sm font-semibold text-cream font-body">{client.name}</div>
                <div className="text-xs text-muted font-body">
                  {status.plan.name} · {status.expired ? "vencido" : `vence em ${status.daysUntilExpiry}d`} · {status.cutsRemaining} corte(s) restante(s)
                </div>
              </div>
              <div className="flex gap-2">
                <a
                  href={waLink(client.phone, planReminderMessage(client, status, { shopName: tenant.shop_name }))}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="press-scale w-8 h-8 rounded-full flex items-center justify-center bg-whatsapp text-whatsapp-ink"
                >
                  <MessageCircle size={15} />
                </a>
                <Button
                  variant="ghost"
                  onClick={async () => {
                    await renewPlan(client.phone);
                    router.refresh();
                  }}
                >
                  Renovar
                </Button>
                <Button
                  variant="danger"
                  onClick={async () => {
                    await cancelClientPlan(client.phone);
                    router.refresh();
                  }}
                >
                  Cancelar
                </Button>
              </div>
            </Card>
          );
        })}
        {subscribers.length === 0 && <p className="text-muted font-body text-sm">Nenhum assinante ainda.</p>}
      </div>
    </div>
  );
}
