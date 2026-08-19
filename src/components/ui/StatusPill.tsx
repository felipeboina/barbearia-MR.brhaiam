import type { AppointmentStatus } from "@/lib/types";

const MAP: Record<AppointmentStatus, { bg: string; color: string; label: string }> = {
  agendado: { bg: "#3a3020", color: "var(--brass)", label: "Agendado" },
  concluido: { bg: "#1f3327", color: "#6fbf8f", label: "Concluído" },
  cancelado: { bg: "#3a2320", color: "#d9695f", label: "Cancelado" },
  falta: { bg: "#4a1f1f", color: "#ff8a7a", label: "Faltou" },
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
