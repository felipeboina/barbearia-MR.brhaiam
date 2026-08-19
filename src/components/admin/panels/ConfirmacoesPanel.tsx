"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Bell, Check, MessageCircle, X } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { fmtDatePt, minutesUntilAppt, todayStr } from "@/lib/business/format";
import { confirmMessage, waLink } from "@/lib/business/messages";
import { confirmAppointmentAdmin, cancelAppointment } from "@/lib/actions/admin";
import type { AdminData } from "../AdminApp";

export function ConfirmacoesPanel({ tenant, appointments, barbers, services }: AdminData) {
  const router = useRouter();
  const [notifStatus, setNotifStatus] = useState<NotificationPermission | "unsupported">(
    typeof window !== "undefined" && "Notification" in window ? Notification.permission : "unsupported"
  );

  const upcoming = appointments
    .filter((a) => a.status === "agendado" && a.date >= todayStr())
    .sort((a, b) => a.date.localeCompare(b.date) || a.time.localeCompare(b.time));

  const dueNow = upcoming.filter((a) => {
    const mins = minutesUntilAppt(a.date, a.time);
    return mins > 0 && mins <= tenant.reminder_hours * 60 && a.confirmed !== true;
  });
  const dueIds = new Set(dueNow.map((a) => a.id));
  const rest = upcoming.filter((a) => !dueIds.has(a.id));

  const tomorrow = (() => {
    const d = new Date(todayStr() + "T12:00:00");
    d.setDate(d.getDate() + 1);
    return d.toISOString().slice(0, 10);
  })();

  const row = (a: (typeof upcoming)[number]) => {
    const service = services.find((s) => s.id === a.service_id);
    const barber = barbers.find((b) => b.id === a.barber_id);
    const badge = a.date === todayStr() ? "Hoje" : a.date === tomorrow ? "Amanhã" : fmtDatePt(a.date);
    return (
      <Card key={a.id} className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <div className="flex items-center gap-2 mb-0.5">
            <span className="text-sm font-bold text-brass font-mono-receipt">{a.time.slice(0, 5)}</span>
            <span className="text-xs px-1.5 py-0.5 rounded bg-highlight-bg text-brass font-body">{badge}</span>
            {a.confirmed === true && (
              <span className="text-xs text-success flex items-center gap-1 font-body">
                <Check size={11} /> Confirmado
              </span>
            )}
          </div>
          <div className="text-sm text-cream font-body">{a.client_name}</div>
          <div className="text-xs text-muted font-body">
            {service?.name} · {barber?.name}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <a
            href={waLink(a.phone, confirmMessage({ clientName: a.client_name, date: a.date, time: a.time.slice(0, 5) }, tenant.shop_name))}
            target="_blank"
            rel="noopener noreferrer"
            className="press-scale w-8 h-8 rounded-full flex items-center justify-center bg-whatsapp text-whatsapp-ink"
          >
            <MessageCircle size={15} />
          </a>
          {a.confirmed !== true && (
            <button
              onClick={async () => { await confirmAppointmentAdmin(a.id); router.refresh(); }}
              className="press-scale text-success"
              title="Marcar confirmado"
            >
              <Check size={18} />
            </button>
          )}
          <button
            onClick={async () => { await cancelAppointment(a.id); router.refresh(); }}
            className="press-scale text-muted"
            title="Cancelar"
          >
            <X size={18} />
          </button>
        </div>
      </Card>
    );
  };

  return (
    <div className="anim-step max-w-3xl">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-heading text-cream">Confirmações</h1>
        {notifStatus !== "unsupported" && notifStatus !== "granted" && (
          <Button
            variant="ghost"
            onClick={() => Notification.requestPermission().then((p) => setNotifStatus(p))}
            className="flex items-center gap-2"
          >
            <Bell size={14} /> Ativar avisos do navegador
          </Button>
        )}
      </div>

      {dueNow.length > 0 && (
        <div className="mb-6">
          <h2 className="text-sm uppercase tracking-wider text-brass mb-3 font-body">Lembrar agora</h2>
          <div className="space-y-2">{dueNow.map(row)}</div>
        </div>
      )}

      <h2 className="text-sm uppercase tracking-wider text-muted mb-3 font-body">Todos os próximos</h2>
      <div className="space-y-2">
        {rest.map(row)}
        {upcoming.length === 0 && <p className="text-muted font-body">Nenhum agendamento futuro.</p>}
      </div>
    </div>
  );
}
