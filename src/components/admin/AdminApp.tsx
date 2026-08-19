"use client";

import { useState } from "react";
import {
  Scissors,
  Calendar,
  MessageCircle,
  Star,
  Cake,
  UserMinus,
  Ban,
  Users,
  DollarSign,
  Package,
  Crown,
  BarChart3,
  Settings,
  LogOut,
  ExternalLink,
} from "lucide-react";
import type { Appointment, Barber, Block, Client, Plan, PlanSignup, Product, Service, Tenant, Transaction } from "@/lib/types";
import { signOutTenant } from "@/lib/actions/auth";
import { DashboardPanel } from "./panels/DashboardPanel";
import { AgendaPanel } from "./panels/AgendaPanel";
import { ConfirmacoesPanel } from "./panels/ConfirmacoesPanel";
import { FidelidadePanel } from "./panels/FidelidadePanel";
import { AniversariantesPanel } from "./panels/AniversariantesPanel";
import { InativosPanel } from "./panels/InativosPanel";
import { BlocksPanel } from "./panels/BlocksPanel";
import { ClientsPanel } from "./panels/ClientsPanel";
import { FinanceiroPanel } from "./panels/FinanceiroPanel";
import { EstoquePanel } from "./panels/EstoquePanel";
import { PlanosPanel } from "./panels/PlanosPanel";
import { GraficosPanel } from "./panels/GraficosPanel";
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

const NAV_ITEMS = [
  { id: "dashboard", label: "Visão geral", icon: Scissors },
  { id: "agenda", label: "Agenda", icon: Calendar },
  { id: "confirmacoes", label: "Confirmações", icon: MessageCircle },
  { id: "fidelidade", label: "Fidelidade", icon: Star },
  { id: "aniversariantes", label: "Aniversariantes", icon: Cake },
  { id: "inativos", label: "Inativos", icon: UserMinus },
  { id: "bloqueios", label: "Bloqueios", icon: Ban },
  { id: "clientes", label: "Clientes", icon: Users },
  { id: "financeiro", label: "Financeiro", icon: DollarSign },
  { id: "estoque", label: "Estoque", icon: Package },
  { id: "planos", label: "Planos", icon: Crown },
  { id: "graficos", label: "Gráficos", icon: BarChart3 },
  { id: "config", label: "Configurações", icon: Settings },
] as const;

type TabId = (typeof NAV_ITEMS)[number]["id"];

export function AdminApp(data: AdminData) {
  const [tab, setTab] = useState<TabId>("dashboard");
  const { tenant } = data;

  return (
    <div className="flex min-h-screen">
      <aside className="w-56 shrink-0 border-r border-line bg-panel p-3 flex flex-col gap-1 sticky top-0 h-screen overflow-y-auto">
        <div className="px-2 py-3 mb-2">
          <div className="text-sm font-semibold text-cream font-heading truncate">{tenant.shop_name}</div>
          <span
            className="inline-block mt-1 text-[10px] uppercase tracking-wide px-1.5 py-0.5 rounded font-body"
            style={{
              background: tenant.subscription_status === "trial" ? "var(--highlight-bg)" : tenant.subscription_status === "active" ? "var(--success-bg)" : "var(--danger-bg)",
              color: tenant.subscription_status === "trial" ? "var(--brass)" : tenant.subscription_status === "active" ? "var(--success)" : "var(--danger)",
            }}
          >
            {tenant.subscription_status === "trial" ? "Período de teste" : tenant.subscription_status === "active" ? "Assinatura ativa" : "Assinatura cancelada"}
          </span>
        </div>

        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const active = tab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setTab(item.id)}
              className="flex items-center gap-2.5 px-3 py-2.5 rounded-md text-sm smooth text-left font-body"
              style={{ background: active ? "var(--barber-red)" : "transparent", color: active ? "var(--cream)" : "var(--muted)" }}
            >
              <Icon size={16} /> {item.label}
            </button>
          );
        })}

        <div className="flex-1" />

        <a href="/" target="_blank" rel="noopener noreferrer" className="flex items-center gap-2.5 px-3 py-2.5 rounded-md text-sm text-muted smooth font-body">
          <ExternalLink size={15} /> Área do cliente
        </a>
        <button onClick={() => signOutTenant()} className="flex items-center gap-2.5 px-3 py-2.5 rounded-md text-sm text-muted smooth font-body">
          <LogOut size={15} /> Sair
        </button>
      </aside>

      <main className="flex-1 p-6 min-w-0">
        {tab === "dashboard" && <DashboardPanel {...data} />}
        {tab === "agenda" && <AgendaPanel {...data} />}
        {tab === "confirmacoes" && <ConfirmacoesPanel {...data} />}
        {tab === "fidelidade" && <FidelidadePanel {...data} />}
        {tab === "aniversariantes" && <AniversariantesPanel {...data} />}
        {tab === "inativos" && <InativosPanel {...data} />}
        {tab === "bloqueios" && <BlocksPanel {...data} />}
        {tab === "clientes" && <ClientsPanel {...data} />}
        {tab === "financeiro" && <FinanceiroPanel {...data} />}
        {tab === "estoque" && <EstoquePanel {...data} />}
        {tab === "planos" && <PlanosPanel {...data} />}
        {tab === "graficos" && <GraficosPanel {...data} />}
        {tab === "config" && <ConfigPanel {...data} />}
      </main>
    </div>
  );
}

export type { TabId };
export { NAV_ITEMS };
