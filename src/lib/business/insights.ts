/**
 * Insights calculados a partir dos dados reais — portado de
 * barbearia-app.jsx (linhas 147-197).
 */
import type { Client, Transaction } from "@/lib/types";
import { daysBetween, daysSince } from "./format";

export const WEEKDAY_FULL_PT = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];

export interface BusyDaysResult {
  counts: number[];
  busiest: { day: number; count: number };
  quietest: { day: number; count: number };
}

export function computeBusyDays(transactions: Transaction[]): BusyDaysResult | null {
  const counts = [0, 0, 0, 0, 0, 0, 0];
  transactions
    .filter((t) => t.type === "servico")
    .forEach((t) => {
      counts[new Date(t.date + "T12:00:00").getDay()]++;
    });
  const withData = counts.map((c, i) => ({ day: i, count: c })).filter((x) => x.count > 0);
  if (withData.length < 2) return null;
  const busiest = withData.reduce((a, b) => (b.count > a.count ? b : a));
  const quietest = withData.reduce((a, b) => (b.count < a.count ? b : a));
  if (busiest.day === quietest.day) return null;
  return { counts, busiest, quietest };
}

export interface RevenueForecast {
  current: number;
  forecast: number;
  daysElapsed: number;
  daysInMonth: number;
}

export function computeRevenueForecast(transactions: Transaction[]): RevenueForecast {
  const now = new Date();
  const monthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const daysElapsed = now.getDate();
  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  const monthRevenue = transactions
    .filter((t) => t.date.startsWith(monthKey) && (t.type === "servico" || t.type === "entrada"))
    .reduce((s, t) => s + t.value, 0);
  if (daysElapsed === 0) return { current: 0, forecast: 0, daysElapsed, daysInMonth };
  const dailyAvg = monthRevenue / daysElapsed;
  const forecast = monthRevenue + dailyAvg * (daysInMonth - daysElapsed);
  return { current: monthRevenue, forecast, daysElapsed, daysInMonth };
}

export interface AtRiskClient {
  client: Client;
  avgInterval: number;
  daysSince: number;
}

export function computeAtRiskClients(clients: Client[], transactions: Transaction[]): AtRiskClient[] {
  const byPhone: Record<string, string[]> = {};
  transactions
    .filter((t) => t.type === "servico" && t.phone)
    .forEach((t) => {
      (byPhone[t.phone!] = byPhone[t.phone!] || []).push(t.date);
    });
  const clientsByPhone = new Map(clients.map((c) => [c.phone, c] as const));
  const results: AtRiskClient[] = [];
  Object.entries(byPhone).forEach(([phone, dates]) => {
    const sorted = [...new Set(dates)].sort();
    if (sorted.length < 2) return;
    const intervals: number[] = [];
    for (let i = 1; i < sorted.length; i++) intervals.push(daysBetween(sorted[i - 1], sorted[i]));
    const avg = intervals.reduce((a, b) => a + b, 0) / intervals.length;
    const last = sorted[sorted.length - 1];
    const since = daysSince(last)!;
    if (avg >= 5 && since > avg * 1.5 && since < avg * 4) {
      const client = clientsByPhone.get(phone);
      if (client) results.push({ client, avgInterval: Math.round(avg), daysSince: since });
    }
  });
  return results.sort((a, b) => b.daysSince - a.daysSince);
}
