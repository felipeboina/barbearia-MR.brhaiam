/**
 * Templates de mensagens (WhatsApp) — configuráveis pelo dono da barbearia
 * na aba Mensagens (`tenant.templates`), com fallback pros textos padrão
 * abaixo. Portado de barbearia-app.jsx (DEFAULT_TEMPLATES, fillTemplate,
 * getTemplate, TEMPLATE_INFO).
 */
import type { Client, MessageTemplateKey, Tenant } from "@/lib/types";
import { fmtDatePt, weekdayPt } from "./format";
import type { FinalPriceResult } from "./pricing";
import type { PlanStatus } from "./plans";

export function waLink(phone: string | null | undefined, message: string) {
  let digits = (phone || "").replace(/\D/g, "");
  if (digits.length > 0 && digits.length <= 11) digits = "55" + digits;
  return `https://wa.me/${digits}?text=${encodeURIComponent(message)}`;
}

export const DEFAULT_TEMPLATES: Record<MessageTemplateKey, string> = {
  confirmacao:
    "Olá {{cliente}}! Aqui é da {{loja}}. Seu horário é {{diaSemana}} ({{data}}) às {{hora}}. Confirma sua presença? Responda SIM para confirmar ou me avise se precisar remarcar.",
  lembrete: "Olá {{cliente}}! Passando pra lembrar que seu horário na {{loja}} é hoje às {{hora}}. Te esperamos! Se não puder vir, avisa aqui.",
  aniversario:
    "Parabéns, {{cliente}}! 🎉 A {{loja}} deseja um feliz aniversário! Pra comemorar, você tem {{desconto}}% de desconto no seu próximo corte esse mês. Vem comemorar com a gente!",
  reengajamento: "{{cliente}}, faz tempo que você não aparece na {{loja}}! Agende seu corte e ganhe {{desconto}}% de desconto. Vem dar um trato no visual! 💈",
  aviso_antecipado: "Olá {{cliente}}! Já faz um tempinho desde seu último corte na {{loja}}. Bora agendar um horário? 💈",
  vencimento_plano: "Olá {{cliente}}! Seu {{plano}} da {{loja}} {{statusVencimento}}, e você ainda tem {{cortesRestantes}} disponível(is). Aproveita antes que acabe!",
};

export const TEMPLATE_INFO: { key: MessageTemplateKey; label: string; description: string; placeholders: string[] }[] = [
  { key: "confirmacao", label: "Confirmação de horário", description: "Usado na aba Confirmações", placeholders: ["cliente", "loja", "diaSemana", "data", "hora"] },
  { key: "lembrete", label: "Lembrete no dia", description: "Usado na aba Confirmações, quando o horário é hoje", placeholders: ["cliente", "loja", "hora"] },
  { key: "aniversario", label: "Feliz aniversário", description: "Usado na aba Relacionamento, seção aniversariantes", placeholders: ["cliente", "loja", "desconto"] },
  { key: "reengajamento", label: "Cliente inativo", description: "Usado na aba Relacionamento, seção inativos", placeholders: ["cliente", "loja", "desconto"] },
  { key: "aviso_antecipado", label: "Aviso antecipado", description: "Usado na aba Relacionamento, antes do cliente virar inativo", placeholders: ["cliente", "loja"] },
  { key: "vencimento_plano", label: "Vencimento de plano", description: "Usado na aba Planos, pros assinantes", placeholders: ["cliente", "loja", "plano", "statusVencimento", "cortesRestantes"] },
];

export function fillTemplate(str: string, vars: Record<string, string | number>) {
  return str.replace(/\{\{(\w+)\}\}/g, (_, key) => String(vars[key] ?? ""));
}

export function getTemplate(tenant: Pick<Tenant, "templates">, key: MessageTemplateKey): string {
  return tenant.templates?.[key] || DEFAULT_TEMPLATES[key];
}

export function confirmMessage(appt: { clientName: string; date: string; time: string }, tenant: Pick<Tenant, "shop_name" | "templates">) {
  return fillTemplate(getTemplate(tenant, "confirmacao"), {
    cliente: appt.clientName,
    loja: tenant.shop_name,
    diaSemana: weekdayPt(appt.date),
    data: fmtDatePt(appt.date),
    hora: appt.time,
  });
}

export function reminderMessage(appt: { clientName: string; time: string }, tenant: Pick<Tenant, "shop_name" | "templates">) {
  return fillTemplate(getTemplate(tenant, "lembrete"), { cliente: appt.clientName, loja: tenant.shop_name, hora: appt.time });
}

export function birthdayMessage(client: Pick<Client, "name">, tenant: Pick<Tenant, "shop_name" | "birthday_discount" | "templates">) {
  return fillTemplate(getTemplate(tenant, "aniversario"), { cliente: client.name, loja: tenant.shop_name, desconto: tenant.birthday_discount });
}

export function winbackMessage(client: Pick<Client, "name">, tenant: Pick<Tenant, "shop_name" | "inactive_discount" | "templates">) {
  return fillTemplate(getTemplate(tenant, "reengajamento"), { cliente: client.name, loja: tenant.shop_name, desconto: tenant.inactive_discount });
}

export function planReminderMessage(client: Pick<Client, "name">, status: PlanStatus, tenant: Pick<Tenant, "shop_name" | "templates">) {
  const dueText =
    status.daysUntilExpiry >= 0
      ? `vence em ${status.daysUntilExpiry} dia${status.daysUntilExpiry === 1 ? "" : "s"} (${fmtDatePt(status.expiresAt)})`
      : `venceu há ${Math.abs(status.daysUntilExpiry)} dia${Math.abs(status.daysUntilExpiry) === 1 ? "" : "s"}`;
  const cutsText = `${status.cutsRemaining} corte${status.cutsRemaining === 1 ? "" : "s"}`;
  return fillTemplate(getTemplate(tenant, "vencimento_plano"), {
    cliente: client.name,
    loja: tenant.shop_name,
    plano: status.plan.name,
    statusVencimento: dueText,
    cortesRestantes: cutsText,
  });
}

export function earlyNudgeMessage(client: Pick<Client, "name">, tenant: Pick<Tenant, "shop_name" | "templates">) {
  return fillTemplate(getTemplate(tenant, "aviso_antecipado"), { cliente: client.name, loja: tenant.shop_name });
}

/** Reexportado só pra deixar o tipo de computeFinalPrice acessível junto das mensagens que o usam. */
export type { FinalPriceResult };
