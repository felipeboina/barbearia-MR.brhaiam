"use client";

import { useEffect, useState } from "react";
import { Users, DollarSign, Clock, Scissors as ScissorsIcon } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { CountUp } from "@/components/ui/CountUp";
import { TicketCard } from "@/components/ui/TicketCard";
import { fmtDatePt, fmtMoney, minutesUntilAppt, todayStr, weekdayPt } from "@/lib/business/format";
import { computeTodayAvailability } from "@/lib/business/availability";
import type { AdminData } from "../AdminApp";

export function DashboardPanel({ tenant, appointments, transactions, barbers, services, blocks }: AdminData) {
  const [, forceTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => forceTick((n) => n + 1), 60000);
    return () => clearInterval(id);
  }, []);

  const today = todayStr();
  const todaysAppts = appointments.filter((a) => a.date === today && a.status !== "cancelado").sort((a, b) => a.time.localeCompare(b.time));
  const todaysTx = transactions.filter((t) => t.date === today);
  const revenue = todaysTx.filter((t) => t.type === "servico" || t.type === "entrada").reduce((s, t) => s + t.value, 0);
  const commissions = todaysTx.filter((t) => t.type === "servico").reduce((s, t) => s + t.commission, 0);
  const expenses = todaysTx.filter((t) => t.type === "despesa").reduce((s, t) => s + t.value, 0);
  const profit = revenue - expenses - commissions;
  const clientsToday = new Set(todaysAppts.map((a) => a.phone)).size;
  const { freeSlots, activeBarbers } = computeTodayAvailability(barbers, appointments, blocks, tenant);

  const nextAppt = todaysAppts.find((a) => a.status === "agendado" && minutesUntilAppt(a.date, a.time) >= 0);

  return (
    <div className="anim-step max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6 flex-wrap gap-2">
        <h1 className="text-2xl font-heading text-cream">
          Visão geral · {weekdayPt(today)} {fmtDatePt(today)}
        </h1>
        <span className="text-xs flex items-center gap-1.5 text-success font-body">
          <span className="w-1.5 h-1.5 rounded-full bg-success inline-block" /> Ao vivo
        </span>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
        <Card>
          <div className="flex items-center gap-2 text-muted text-xs mb-1 font-body">
            <Users size={13} /> Clientes hoje
          </div>
          <div className="text-2xl font-bold text-cream font-mono-receipt">
            <CountUp value={clientsToday} />
          </div>
        </Card>
        <Card>
          <div className="flex items-center gap-2 text-muted text-xs mb-1 font-body">
            <DollarSign size={13} /> Faturado hoje
          </div>
          <div className="text-2xl font-bold text-brass font-mono-receipt">
            <CountUp value={revenue} formatter={fmtMoney} />
          </div>
        </Card>
        <Card>
          <div className="flex items-center gap-2 text-muted text-xs mb-1 font-body">
            <Clock size={13} /> Livres hoje
          </div>
          <div className="text-2xl font-bold text-cream font-mono-receipt">
            <CountUp value={freeSlots} />
          </div>
        </Card>
        <Card>
          <div className="flex items-center gap-2 text-muted text-xs mb-1 font-body">
            <ScissorsIcon size={13} /> Barbeiros hoje
          </div>
          <div className="text-2xl font-bold text-cream font-mono-receipt">
            {activeBarbers}/{barbers.length}
          </div>
        </Card>
        <Card>
          <div className="flex items-center gap-2 text-muted text-xs mb-1 font-body">
            <Clock size={13} /> Próximo cliente
          </div>
          <div className="text-sm font-bold text-cream font-mono-receipt truncate">
            {nextAppt ? `${nextAppt.time.slice(0, 5)} · ${nextAppt.client_name}` : "Nenhum"}
          </div>
        </Card>
      </div>

      <Card className="mb-6 font-mono-receipt" style={{ borderStyle: "dashed" }}>
        <div className="text-xs uppercase tracking-wider text-muted mb-3 font-body">Fechamento do dia</div>
        <div className="flex justify-between text-sm mb-1">
          <span className="text-muted">Recebido</span>
          <span className="text-cream">{fmtMoney(revenue)}</span>
        </div>
        <div className="flex justify-between text-sm mb-1">
          <span className="text-muted">Despesas</span>
          <span className="text-danger">-{fmtMoney(expenses)}</span>
        </div>
        <div className="flex justify-between text-sm mb-2">
          <span className="text-muted">Comissões</span>
          <span className="text-danger">-{fmtMoney(commissions)}</span>
        </div>
        <div className="flex justify-between text-base font-bold pt-2 border-t border-line">
          <span className="text-cream">Lucro</span>
          <span className="text-brass">{fmtMoney(profit)}</span>
        </div>
      </Card>

      <h2 className="text-sm uppercase tracking-wider text-muted mb-3 font-body">Agenda de hoje</h2>
      <div className="space-y-3">
        {todaysAppts.map((a) => (
          <TicketCard
            key={a.id}
            appt={a}
            service={services.find((s) => s.id === a.service_id)}
            extraServices={services.filter((s) => a.extra_service_ids?.includes(s.id))}
            barber={barbers.find((b) => b.id === a.barber_id)}
          />
        ))}
        {todaysAppts.length === 0 && <p className="text-muted font-body">Nenhum agendamento para hoje.</p>}
      </div>
    </div>
  );
}
