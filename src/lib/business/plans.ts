/**
 * Status de assinatura de plano — portado de barbearia-app.jsx
 * (getPlanStatus, linhas 202-212).
 */
import type { Client, Plan } from "@/lib/types";
import { daysBetween, todayStr } from "./format";

export interface PlanStatus {
  plan: Plan;
  expiresAt: string;
  daysUntilExpiry: number;
  cutsRemaining: number;
  expired: boolean;
}

export function getPlanStatus(client: Pick<Client, "plan_id" | "plan_start_date" | "plan_cuts_used"> | null | undefined, plans: Plan[]): PlanStatus | null {
  if (!client?.plan_id || !client.plan_start_date) return null;
  const plan = plans.find((p) => p.id === client.plan_id);
  if (!plan) return null;
  const start = new Date(client.plan_start_date + "T00:00:00");
  start.setDate(start.getDate() + (plan.period_days || 30));
  const expiresAt = start.toISOString().slice(0, 10);
  const daysUntilExpiry = daysBetween(todayStr(), expiresAt);
  const cutsRemaining = Math.max(0, (plan.cuts_included || 0) - (client.plan_cuts_used || 0));
  return { plan, expiresAt, daysUntilExpiry, cutsRemaining, expired: daysUntilExpiry < 0 };
}
