/**
 * Templates de mensagens (WhatsApp) — portados de barbearia-app.jsx
 * (linhas 66-127, 198-220).
 */
import type { Client } from "@/lib/types";
import { fmtDatePt, weekdayPt } from "./format";
import type { FinalPriceResult } from "./pricing";
import type { PlanStatus } from "./plans";

export function waLink(phone: string | null | undefined, message: string) {
  let digits = (phone || "").replace(/\D/g, "");
  if (digits.length > 0 && digits.length <= 11) digits = "55" + digits;
  return `https://wa.me/${digits}?text=${encodeURIComponent(message)}`;
}

export function confirmMessage(appt: { clientName: string; date: string; time: string }, shopName: string) {
  return `Olá ${appt.clientName}! Aqui é da ${shopName}. Seu horário é ${weekdayPt(appt.date)} (${fmtDatePt(appt.date)}) às ${appt.time}. Confirma sua presença? Responda SIM para confirmar ou me avise se precisar remarcar.`;
}

export function reminderMessage(appt: { clientName: string; time: string }, shopName: string) {
  return `Olá ${appt.clientName}! Passando pra lembrar que seu horário na ${shopName} é hoje às ${appt.time}. Te esperamos! Se não puder vir, avisa aqui.`;
}

export function birthdayMessage(client: Pick<Client, "name">, config: { shopName: string; birthdayDiscount: number }) {
  return `Parabéns, ${client.name}! 🎉 A ${config.shopName} deseja um feliz aniversário! Pra comemorar, você tem ${config.birthdayDiscount}% de desconto no seu próximo corte esse mês. Vem comemorar com a gente!`;
}

export function winbackMessage(client: Pick<Client, "name">, config: { shopName: string; inactiveDiscount: number }) {
  return `${client.name}, faz tempo que você não aparece na ${config.shopName}! Agende seu corte e ganhe ${config.inactiveDiscount}% de desconto. Vem dar um trato no visual! 💈`;
}

export function riskMessage(item: { client: Client; avgInterval: number; daysSince: number }, config: { shopName: string }) {
  return `Olá ${item.client.name}! Notamos que já faz ${item.daysSince} dias desde seu último corte na ${config.shopName} (você costuma vir a cada ${item.avgInterval} dias). Bora agendar? Preparamos condições especiais pra você voltar!`;
}

export function planReminderMessage(client: Pick<Client, "name">, status: PlanStatus, config: { shopName: string }) {
  const dueText =
    status.daysUntilExpiry >= 0
      ? `vence em ${status.daysUntilExpiry} dia${status.daysUntilExpiry === 1 ? "" : "s"} (${fmtDatePt(status.expiresAt)})`
      : `venceu há ${Math.abs(status.daysUntilExpiry)} dia${Math.abs(status.daysUntilExpiry) === 1 ? "" : "s"}`;
  return `Olá ${client.name}! Seu ${status.plan.name} da ${config.shopName} ${dueText}, e você ainda tem ${status.cutsRemaining} corte${status.cutsRemaining === 1 ? "" : "s"} disponí${status.cutsRemaining === 1 ? "vel" : "veis"}. Aproveita antes que acabe!`;
}

export function earlyNudgeMessage(client: Pick<Client, "name">, config: { shopName: string }) {
  return `Olá ${client.name}! Já faz um tempinho desde seu último corte na ${config.shopName}. Bora agendar um horário? 💈`;
}

/** Reexportado só pra deixar o tipo de computeFinalPrice acessível junto das mensagens que o usam. */
export type { FinalPriceResult };
