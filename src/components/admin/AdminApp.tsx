"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
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
  Menu,
  X,
  LogOut,
  Lock,
} from "lucide-react";
import type { Appointment, Barber, Block, Client, Plan, PlanSignup, Product, Service, Tenant, Transaction } from "@/lib/types";
import { daysSince, isBirthdayToday, minutesUntilAppt } from "@/lib/business/format";
import { signOutTenant } from "@/lib/actions/auth";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { FinancialPinModal } from "./FinancialPinModal";
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

function computeConfirmacoesBadge(data: AdminData) {
  return data.appointments.filter((a) => {
    if (a.status !== "agendado" || a.confirmed === true) return false;
    const mins = minutesUntilAppt(a.date, a.time);
    return mins > 0 && mins <= data.tenant.reminder_hours * 60;
  }).length;
}

function computePlanosBadge(data: AdminData) {
  return data.planSignups.length;
}

function computeEstoqueBadge(data: AdminData) {
  return data.products.filter((p) => p.stock <= p.min_stock).length;
}

const AGENDA_LAST_SEEN_KEY = "barbearia_agenda_last_seen";

export function AdminApp(data: AdminData & { financialPinSet: boolean }) {
  const { financialPinSet, ...adminData } = data;
  const router = useRouter();
  const [tab, setTab] = useState<TabId>("dashboard");
  const [mobileOpen, setMobileOpen] = useState(false);
  const [financialUnlocked, setFinancialUnlocked] = useState(false);
  const [showPinModal, setShowPinModal] = useState(false);
  const [agendaLastSeen, setAgendaLastSeen] = useState<string | null>(null);
  const { tenant } = adminData;
  const relacionamentoBadge = computeRelacionamentoBadge(adminData);
  const confirmacoesBadge = computeConfirmacoesBadge(adminData);
  const planosBadge = computePlanosBadge(adminData);
  const estoqueBadge = computeEstoqueBadge(adminData);
  const financialLocked = financialPinSet && !financialUnlocked;

  // Primeira carga: se nunca visitou a Agenda nesse navegador, marca "visto
  // agora" em vez de tratar todo o histórico de agendamentos como novo.
  useEffect(() => {
    const stored = localStorage.getItem(AGENDA_LAST_SEEN_KEY);
    if (stored) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- lê o "último visto" salvo no navegador só depois de montar (localStorage não existe no servidor)
      setAgendaLastSeen(stored);
    } else {
      const now = new Date().toISOString();
      localStorage.setItem(AGENDA_LAST_SEEN_KEY, now);
      setAgendaLastSeen(now);
    }
  }, []);

  // Tempo real: assim que um cliente agenda, confirma ou cancela um horário
  // pela área pública, o Postgres avisa por websocket e a gente só manda
  // buscar os dados de novo — sem precisar apertar F5. router.refresh()
  // busca os dados atualizados do servidor sem perder a aba/estado atual.
  //
  // A sessão do dono (cookies) carrega de forma assíncrona; se o canal
  // conectar antes disso, ele entra "anônimo" e a política de segurança
  // (cada barbearia só vê os próprios dados) bloqueia os eventos em
  // silêncio, sem erro nenhum. Por isso buscamos a sessão e avisamos o
  // realtime dela ANTES de assinar o canal.
  useEffect(() => {
    const supabase = createSupabaseBrowserClient();
    let channel: ReturnType<typeof supabase.channel> | undefined;
    let cancelled = false;

    (async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (cancelled) return;
      if (session) {
        supabase.realtime.setAuth(session.access_token);
      }

      channel = supabase
        .channel(`appointments-${tenant.id}`)
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "appointments", filter: `tenant_id=eq.${tenant.id}` },
          () => router.refresh()
        )
        .subscribe((status, err) => {
          if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
            console.error("[realtime] falha ao conectar ao canal de agendamentos:", status, err);
          }
        });
    })();

    return () => {
      cancelled = true;
      if (channel) supabase.removeChannel(channel);
    };
  }, [tenant.id, router]);

  const agendaBadge = agendaLastSeen
    ? adminData.appointments.filter((a) => a.status !== "cancelado" && a.created_at > agendaLastSeen).length
    : 0;

  const badgeFor = (id: TabId): number => {
    if (id === "relacionamento") return relacionamentoBadge;
    if (id === "agenda") return agendaBadge;
    if (id === "confirmacoes") return confirmacoesBadge;
    if (id === "planos") return planosBadge;
    if (id === "estoque") return estoqueBadge;
    return 0;
  };

  const selectTab = (id: TabId) => {
    setMobileOpen(false);
    if (id === "financeiro" && financialLocked) {
      setShowPinModal(true);
      return;
    }
    // Saindo do Financeiro pra qualquer outra aba: tranca de novo. A senha
    // não fica valendo pro resto da sessão, só enquanto você está dentro
    // da própria aba — sair e voltar pede de novo.
    if (tab === "financeiro" && id !== "financeiro" && financialUnlocked) {
      setFinancialUnlocked(false);
    }
    if (id === "agenda") {
      const now = new Date().toISOString();
      localStorage.setItem(AGENDA_LAST_SEEN_KEY, now);
      setAgendaLastSeen(now);
    }
    setTab(id);
  };

  return (
    <div className="flex min-h-screen">
      {mobileOpen && <div className="fixed inset-0 bg-black/60 z-40 md:hidden" onClick={() => setMobileOpen(false)} />}

      <aside
        className={`w-64 md:w-56 shrink-0 border-r border-line bg-panel p-3 flex flex-col gap-1 fixed md:sticky top-0 h-screen overflow-y-auto z-50 smooth ${
          mobileOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
        }`}
      >
        <div className="px-2 py-3 mb-2 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2.5 min-w-0">
            <Image src="/logo.jpg" alt="" width={32} height={32} className="rounded-full shrink-0" />
            <div className="text-sm font-semibold text-cream font-heading truncate">{tenant.shop_name}</div>
          </div>
          <button onClick={() => setMobileOpen(false)} className="text-muted md:hidden shrink-0" aria-label="Fechar menu">
            <X size={18} />
          </button>
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
                  onClick={() => selectTab(item.id)}
                  className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-md text-sm smooth text-left font-body"
                  style={{ background: active ? "var(--barber-red)" : "transparent", color: active ? "var(--cream)" : "var(--muted)" }}
                >
                  <Icon size={16} className="shrink-0" />
                  <span className="flex-1 truncate">{item.label}</span>
                  {item.id === "financeiro" && financialLocked && <Lock size={12} className="shrink-0 text-muted" />}
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
        <button onClick={() => signOutTenant()} className="flex items-center gap-2.5 px-3 py-2.5 rounded-md text-sm text-muted smooth font-body">
          <LogOut size={15} /> Sair
        </button>
      </aside>

      <div className="flex-1 min-w-0 flex flex-col">
        <div className="md:hidden flex items-center gap-3 p-3 border-b border-line bg-panel sticky top-0 z-30">
          <button onClick={() => setMobileOpen(true)} className="text-cream press-scale" aria-label="Abrir menu">
            <Menu size={22} />
          </button>
          <Image src="/logo.jpg" alt="" width={26} height={26} className="rounded-full shrink-0" />
          <span className="text-sm font-semibold text-cream font-heading truncate">{tenant.shop_name}</span>
        </div>

        <main className="flex-1 p-4 md:p-6 min-w-0">
          {tab === "dashboard" && <DashboardPanel {...adminData} />}
          {tab === "avulso" && <AvulsoPanel {...adminData} />}
          {tab === "agenda" && <AgendaPanel {...adminData} />}
          {tab === "confirmacoes" && <ConfirmacoesPanel {...adminData} />}
          {tab === "clientes" && <ClientsPanel {...adminData} />}
          {tab === "relacionamento" && <RelacionamentoPanel {...adminData} />}
          {tab === "financeiro" && !financialLocked && <FinanceiroPanel {...adminData} />}
          {tab === "estoque" && <EstoquePanel {...adminData} />}
          {tab === "planos" && <PlanosPanel {...adminData} />}
          {tab === "bloqueios" && <BlocksPanel {...adminData} />}
          {tab === "mensagens" && <MensagensPanel {...adminData} />}
          {tab === "config" && <ConfigPanel {...adminData} financialPinSet={financialPinSet} />}
        </main>
      </div>

      {showPinModal && (
        <FinancialPinModal
          onCancel={() => setShowPinModal(false)}
          onSuccess={() => {
            setFinancialUnlocked(true);
            setShowPinModal(false);
            setTab("financeiro");
          }}
        />
      )}
    </div>
  );
}

export type { TabId };
