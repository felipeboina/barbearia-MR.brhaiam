import type { AppointmentStatus } from "@/lib/types";

const MAP: Record<AppointmentStatus, { bg: string; color: string; label: string }> = {
  agendado: { bg: "var(--highlight-bg)", color: "var(--brass)", label: "Agendado" },
  concluido: { bg: "var(--success-bg)", color: "var(--success)", label: "Concluído" },
  cancelado: { bg: "var(--danger-bg)", color: "var(--danger)", label: "Cancelado" },
  falta: { bg: "#2c1420", color: "var(--danger-light)", label: "Faltou" },
};

export function StatusPill({ status }: { status: AppointmentStatus }) {
  const s = MAP[status] || MAP.agendado;
  return (
    <span
      className="text-[11px] font-semibold uppercase tracking-wide px-2 py-1 rounded smooth font-body"
      style={{ background: s.bg, color: s.color }}
    >
      {s.label}
    </span>
  );
}
