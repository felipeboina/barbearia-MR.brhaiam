"use client";

import { useState } from "react";
import {
  Scissors,
  Zap,
  Calendar,
  MessageCircle,
  Heart,
  Users,
  DollarSign,
  Package,
  Crown,
  Ban,
  Send,
  Settings,
  ExternalLink,
} from "lucide-react";
import type { Appointment, Barber, Block, Client, Plan, PlanSignup, Product, Service, Tenant, Transaction } from "@/lib/types";
import { daysSince, isBirthdayToday } from "@/lib/business/format";
import { DashboardPanel } from "./panels/DashboardPanel";
import { AvulsoPanel } from "./panels/AvulsoPanel";
import { AgendaPanel } from "./panels/AgendaPanel";
import { ConfirmacoesPanel } from "./panels/ConfirmacoesPanel";
import { ClientsPanel } from "./panels/ClientsPanel";
import { RelacionamentoPanel } from "./panels/RelacionamentoPanel";
import { FinanceiroPanel } from "./panels/FinanceiroPanel";
import { EstoquePanel } from "./panels/EstoquePanel";
import { PlanosPanel } from "./panels/PlanosPanel";
import { BlocksPanel } from "./panels/BlocksPanel";
import { MensagensPanel } from "./panels/MensagensPanel";
import { ConfigPanel } from "./panels/ConfigPanel";

export interface AdminData {
  tenant: Tenant;
  barbers: Barber[];
  services: Service[];
  products: Product[];
  clients: Client[];
  appointments: Appointment[];
  transactions: Transaction[];
  blocks: Block[];
  plans: Plan[];
  planSignups: PlanSignup[];
}

type TabId =
  | "dashboard"
  | "avulso"
  | "agenda"
  | "confirmacoes"
  | "clientes"
  | "relacionamento"
  | "financeiro"
  | "estoque"
  | "planos"
  | "bloqueios"
  | "mensagens"
  | "config";

interface NavItem {
  id: TabId;
  label: string;
  icon: typeof Scissors;
}

interface NavSection {
  label: string;
  items: NavItem[];
}

const NAV_SECTIONS: NavSection[] = [
  {
    label: "Uso diário",
    items: [
      { id: "dashboard", label: "Visão geral", icon: Scissors },
      { id: "avulso", label: "Atendimento Avulso", icon: Zap },
      { id: "agenda", label: "Agenda", icon: Calendar },
      { id: "confirmacoes", label: "Confirmações", icon: MessageCircle },
    ],
  },
  {
    label: "Clientes",
    items: [
      { id: "clientes", label: "Clientes", icon: Users },
      { id: "relacionamento", label: "Relacionamento", icon: Heart },
    ],
  },
  {
    label: "Negócio",
    items: [
      { id: "financeiro", label: "Financeiro & Gráficos", icon: DollarSign },
      { id: "estoque", label: "Estoque", icon: Package },
      { id: "planos", label: "Planos", icon: Crown },
    ],
  },
  {
    label: "Ajustes (raro)",
    items: [
      { id: "bloqueios", label: "Bloqueios", icon: Ban },
      { id: "mensagens", label: "Mensagens", icon: Send },
      { id: "config", label: "Configurações", icon: Settings },
    ],
  },
];

function computeRelacionamentoBadge(data: AdminData) {
  const { tenant, clients, plans } = data;
  const hasActivePlan = (c: Client) => {
    if (!c.plan_id || !c.plan_start_date) return false;
    const plan = plans.find((p) => p.id === c.plan_id);
    if (!plan) return false;
    const start = new Date(c.plan_start_date + "T00:00:00");
    start.setDate(start.getDate() + (plan.period_days || 30));
    return start.getTime() >= Date.now();
  };
  const loyaltyReady = tenant.loyalty_enabled ? clients.filter((c) => (c.points || 0) >= tenant.loyalty_goal).length : 0;
  const birthdayPending = tenant.birthday_enabled
    ? clients.filter((c) => isBirthdayToday(c.birthday) && c.birthday_msg_year !== new Date().getFullYear()).length
    : 0;
  const inactivePending = clients.filter((c) => c.last_visit && daysSince(c.last_visit)! >= tenant.inactive_days && c.winback_sent_for !== c.last_visit).length;
  const earlyPending = clients.filter(
    (c) =>
      c.last_visit &&
      !hasActivePlan(c) &&
      daysSince(c.last_visit)! >= tenant.early_reminder_days &&
      daysSince(c.last_visit)! < tenant.inactive_days &&
      c.early_nudge_sent_for !== c.last_visit
  ).length;
  return loyaltyReady + birthdayPending + inactivePending + earlyPending;
}

export function AdminApp(data: AdminData) {
  const [tab, setTab] = useState<TabId>("dashboard");
  const { tenant } = data;
  const relacionamentoBadge = computeRelacionamentoBadge(data);

  const badgeFor = (id: TabId): number => (id === "relacionamento" ? relacionamentoBadge : 0);

  return (
    <div className="flex min-h-screen">
      <aside className="w-56 shrink-0 border-r border-line bg-panel p-3 flex flex-col gap-1 sticky top-0 h-screen overflow-y-auto">
        <div className="px-2 py-3 mb-2">
          <div className="text-sm font-semibold text-cream font-heading truncate">{tenant.shop_name}</div>
        </div>

        {NAV_SECTIONS.map((section) => (
          <div key={section.label} className="mb-1">
            <div className="px-3 pt-3 pb-1 text-[10px] uppercase tracking-wider text-muted font-body">{section.label}</div>
            {section.items.map((item) => {
              const Icon = item.icon;
              const active = tab === item.id;
              const badge = badgeFor(item.id);
              return (
                <button
                  key={item.id}
                  onClick={() => setTab(item.id)}
                  className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-md text-sm smooth text-left font-body"
                  style={{ background: active ? "var(--barber-red)" : "transparent", color: active ? "var(--cream)" : "var(--muted)" }}
                >
                  <Icon size={16} className="shrink-0" />
                  <span className="flex-1 truncate">{item.label}</span>
                  {badge > 0 && (
                    <span className="text-[10px] min-w-[18px] text-center px-1 py-0.5 rounded-full bg-barber-red text-cream font-body">{badge}</span>
                  )}
                </button>
              );
            })}
          </div>
        ))}

        <div className="flex-1" />

        <a href="/" target="_blank" rel="noopener noreferrer" className="flex items-center gap-2.5 px-3 py-2.5 rounded-md text-sm text-muted smooth font-body">
          <ExternalLink size={15} /> Área do cliente
        </a>
      </aside>

      <main className="flex-1 p-6 min-w-0">
        {tab === "dashboard" && <DashboardPanel {...data} />}
        {tab === "avulso" && <AvulsoPanel {...data} />}
        {tab === "agenda" && <AgendaPanel {...data} />}
        {tab === "confirmacoes" && <ConfirmacoesPanel {...data} />}
        {tab === "clientes" && <ClientsPanel {...data} />}
        {tab === "relacionamento" && <RelacionamentoPanel {...data} />}
        {tab === "financeiro" && <FinanceiroPanel {...data} />}
        {tab === "estoque" && <EstoquePanel {...data} />}
        {tab === "planos" && <PlanosPanel {...data} />}
        {tab === "bloqueios" && <BlocksPanel {...data} />}
        {tab === "mensagens" && <MensagensPanel {...data} />}
        {tab === "config" && <ConfigPanel {...data} />}
      </main>
    </div>
  );
}

export type { TabId };
