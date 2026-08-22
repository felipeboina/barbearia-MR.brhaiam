"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft, ChevronRight, Check, X, UserX, Trash2, Copy } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { TicketCard } from "@/components/ui/TicketCard";
import { PixQrCode } from "@/components/ui/PixQrCode";
import { fmtDatePt, fmtMoney, minutesUntilAppt, todayStr, weekdayPt } from "@/lib/business/format";
import { computeFinalPrice } from "@/lib/business/pricing";
import { buildPixPayload } from "@/lib/business/pix";
import { PAYMENT_METHODS, BLOCK_REASONS, type Appointment } from "@/lib/types";
import { completeAppointment, cancelAppointment, markNoShow, deleteBlock } from "@/lib/actions/admin";
import type { AdminData } from "../AdminApp";

export function AgendaPanel({ tenant, appointments, barbers, services, blocks, clients }: AdminData) {
  const [date, setDate] = useState(todayStr());
  const [completingId, setCompletingId] = useState<string | null>(null);
  const router = useRouter();

  const dayAppts = appointments
    .filter((a) => a.date === date && a.status !== "cancelado")
    .sort((a, b) => {
      const aDone = a.status === "concluido" ? 1 : 0;
      const bDone = b.status === "concluido" ? 1 : 0;
      if (aDone !== bDone) return aDone - bDone;
      return a.time.localeCompare(b.time);
    });
  const dayBlocks = blocks.filter((b) => b.date === date);

  const shift = (delta: number) => {
    const d = new Date(date + "T12:00:00");
    d.setDate(d.getDate() + delta);
    setDate(d.toISOString().slice(0, 10));
  };

  return (
    <div className="anim-step max-w-3xl mx-auto">
      <h1 className="text-2xl mb-6 font-heading text-cream">Agenda</h1>

      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => shift(-1)} className="press-scale w-9 h-9 rounded-md border border-line flex items-center justify-center text-cream">
          <ChevronLeft size={16} />
        </button>
        <div className="text-sm font-body text-cream">
          {weekdayPt(date)}, {fmtDatePt(date)}
        </div>
        <button onClick={() => shift(1)} className="press-scale w-9 h-9 rounded-md border border-line flex items-center justify-center text-cream">
          <ChevronRight size={16} />
        </button>
        {date !== todayStr() && (
          <button onClick={() => setDate(todayStr())} className="text-xs text-brass font-body underline">
            Hoje
          </button>
        )}
      </div>

      {dayBlocks.length > 0 && (
        <div className="space-y-2 mb-4">
          {dayBlocks.map((b) => {
            const reason = BLOCK_REASONS.find((r) => r.id === b.reason_id);
            const barberName = b.barber_id ? barbers.find((x) => x.id === b.barber_id)?.name : "Todos";
            return (
              <Card key={b.id} className="flex items-center justify-between py-2.5">
                <div className="text-sm text-muted font-body">
                  {reason?.label || b.reason_id} · {barberName} {!b.all_day && b.start_time && `· ${b.start_time.slice(0, 5)}–${b.end_time?.slice(0, 5)}`}
                  {b.note && ` · ${b.note}`}
                </div>
                <button
                  onClick={async () => { await deleteBlock(b.id); router.refresh(); }}
                  className="text-danger press-scale"
                >
                  <Trash2 size={14} />
                </button>
              </Card>
            );
          })}
        </div>
      )}

      <div className="space-y-3">
        {dayAppts.map((a) => {
          const service = services.find((s) => s.id === a.service_id);
          const extraServices = services.filter((s) => a.extra_service_ids?.includes(s.id));
          const barber = barbers.find((b) => b.id === a.barber_id);
          const canNoShow = a.status === "agendado" && minutesUntilAppt(a.date, a.time) < 0;
          return (
            <div key={a.id}>
              <TicketCard appt={a} service={service} extraServices={extraServices} barber={barber}>
                {a.status === "agendado" && (
                  <>
                    <button onClick={() => setCompletingId(completingId === a.id ? null : a.id)} className="press-scale text-success" title="Concluir">
                      <Check size={18} />
                    </button>
                    <button
                      disabled={!canNoShow}
                      onClick={async () => { await markNoShow(a.id); router.refresh(); }}
                      className="press-scale text-danger disabled:opacity-30"
                      title="Marcar falta"
                    >
                      <UserX size={18} />
                    </button>
                    <button
                      onClick={async () => { await cancelAppointment(a.id); router.refresh(); }}
                      className="press-scale text-muted"
                      title="Cancelar"
                    >
                      <X size={18} />
                    </button>
                  </>
                )}
              </TicketCard>
              {completingId === a.id && (
                <PaymentPicker
                  appt={a}
                  service={service}
                  extraServices={extraServices}
                  tenant={tenant}
                  clients={clients}
                  onDone={() => {
                    setCompletingId(null);
                    router.refresh();
                  }}
                  onCancel={() => setCompletingId(null)}
                />
              )}
            </div>
          );
        })}
        {dayAppts.length === 0 && <p className="text-muted font-body">Nenhum agendamento nesse dia.</p>}
      </div>
    </div>
  );
}

function PaymentPicker({
  appt,
  service,
  extraServices,
  tenant,
  clients,
  onDone,
  onCancel,
}: {
  appt: Appointment;
  service: AdminData["services"][number] | undefined;
  extraServices: AdminData["services"];
  tenant: AdminData["tenant"];
  clients: AdminData["clients"];
  onDone: () => void;
  onCancel: () => void;
}) {
  const [method, setMethod] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const clientRecord = clients.find((c) => c.phone === appt.phone) || null;
  // soma o preço do serviço principal + extras — precisa bater com o que
  // complete_appointment() calcula no banco, senão o "valor a cobrar"
  // mostrado aqui fica errado pra agendamentos com mais de um serviço.
  const basePrice = (service?.price || 0) + extraServices.reduce((s, it) => s + it.price, 0);
  const priceInfo = useMemo(
    () => computeFinalPrice({ referred_by_phone: appt.referred_by_phone, phone: appt.phone }, { price: basePrice }, clientRecord, tenant.referral_discount),
    [appt, basePrice, clientRecord, tenant.referral_discount]
  );

  const pixPayload =
    method === "pix" && tenant.pix_key
      ? buildPixPayload({ pixKey: tenant.pix_key, merchantName: tenant.shop_name, merchantCity: tenant.pix_city, amount: priceInfo.price })
      : null;

  const confirm = async () => {
    if (!method || submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await completeAppointment(appt.id, method);
      if (res.ok) {
        onDone();
      } else {
        setError(res.error);
      }
    } catch {
      // rede caiu, sessão expirou etc. — nunca deixa o botão girando pra sempre
      setError("Não deu pra concluir o atendimento. Verifique sua conexão e tenta de novo.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Card className="mt-2 anim-pop">
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm text-muted font-body">Valor a cobrar</span>
        <div className="text-right">
          <span className="text-lg font-bold text-brass font-mono-receipt">{fmtMoney(priceInfo.price)}</span>
          {priceInfo.discountPct > 0 && <div className="text-xs text-success font-body">{priceInfo.reason}</div>}
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2 mb-3">
        {PAYMENT_METHODS.map((m) => (
          <button
            key={m.id}
            onClick={() => setMethod(m.id)}
            className="press-scale rounded-md py-2 text-sm font-body border smooth"
            style={{ borderColor: method === m.id ? "var(--brass)" : "var(--line)", color: "var(--cream)" }}
          >
            {m.label}
          </button>
        ))}
      </div>
      {method === "pix" && pixPayload && (
        <div className="text-center mb-3">
          <div className="flex justify-center mb-2">
            <PixQrCode value={pixPayload} size={130} />
          </div>
          <button
            onClick={() => {
              navigator.clipboard?.writeText(tenant.pix_key).then(() => {
                setCopied(true);
                setTimeout(() => setCopied(false), 2000);
              });
            }}
            className="text-xs text-brass font-body flex items-center gap-1 justify-center mx-auto"
          >
            <Copy size={12} /> {copied ? "Copiado!" : "Copiar chave PIX"}
          </button>
        </div>
      )}
      {error && <p className="text-sm text-danger mb-3 font-body">{error}</p>}

      <div className="flex gap-2">
        <Button variant="ghost" className="flex-1" onClick={onCancel}>
          Cancelar
        </Button>
        <Button variant="primary" className="flex-1" disabled={!method || submitting} onClick={confirm}>
          {submitting ? "Confirmando..." : "Confirmar pagamento"}
        </Button>
      </div>
    </Card>
  );
}
