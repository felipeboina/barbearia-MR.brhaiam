/**
 * Funções de formatação — portadas de barbearia-app.jsx (linhas 30-65).
 */

export const todayStr = () => new Date().toISOString().slice(0, 10);

export const fmtMoney = (n: number) => (n < 0 ? "-R$ " : "R$ ") + Math.abs(n).toFixed(2).replace(".", ",");

export const fmtDatePt = (iso: string) => {
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
};

export const DAYS_PT = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

export const weekdayPt = (iso: string) => {
  const d = new Date(iso + "T12:00:00");
  return DAYS_PT[d.getDay()];
};

export function formatWorkDays(days: number[] | null | undefined) {
  if (!days || days.length === 0) return "Fechado";
  const sorted = [...days].sort((a, b) => a - b);
  const isContiguous = sorted.length > 1 && sorted.every((d, i) => i === 0 || d === sorted[i - 1] + 1);
  if (isContiguous) return `${DAYS_PT[sorted[0]]} a ${DAYS_PT[sorted[sorted.length - 1]]}`;
  return sorted.map((d) => DAYS_PT[d]).join(", ");
}

/** Converte "HH:MM" (ou "HH:MM:SS" vindo do Postgres `time`) para minutos desde meia-noite. */
export const toMin = (t: string) => {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
};

export const fromMin = (m: number) => {
  const h = String(Math.floor(m / 60)).padStart(2, "0");
  const mm = String(m % 60).padStart(2, "0");
  return `${h}:${mm}`;
};

export const fmtDuration = (min: number) => {
  if (min < 60) return `${min} min`;
  const h = Math.floor(min / 60);
  const rest = min % 60;
  return rest === 0 ? `${h}h` : `${h}h${rest}min`;
};

export function daysBetween(a: string, b: string) {
  return Math.round((new Date(b + "T00:00:00").getTime() - new Date(a + "T00:00:00").getTime()) / 86400000);
}

export function daysSince(dateStr: string | null | undefined) {
  if (!dateStr) return null;
  const then = new Date(dateStr + "T00:00:00");
  const now = new Date(todayStr() + "T00:00:00");
  return Math.round((now.getTime() - then.getTime()) / 86400000);
}

export function isBirthdayToday(birthday: string | null | undefined) {
  if (!birthday) return false;
  const [, m, d] = birthday.split("-");
  const today = new Date();
  return parseInt(m) === today.getMonth() + 1 && parseInt(d) === today.getDate();
}

export const normalizePhone = (phone: string | null | undefined) => (phone || "").replace(/\D/g, "");

export function minutesUntilAppt(date: string, time: string) {
  const dt = new Date(`${date}T${time.slice(0, 5)}:00`);
  return (dt.getTime() - Date.now()) / 60000;
}
