import { Check, Package, QrCode, UserPlus } from "lucide-react";
import type { Appointment, Barber, Service } from "@/lib/types";
import { fromMin, toMin } from "@/lib/business/format";
import { StatusPill } from "./StatusPill";

/** Talão de ticket — assinatura visual dos agendamentos. Portado de TicketCard (barbearia-app.jsx). */
export function TicketCard({
  appt,
  service,
  barber,
  children,
}: {
  appt: Appointment;
  service: Service | null | undefined;
  barber: Barber | null | undefined;
  children?: React.ReactNode;
}) {
  const duration = appt.duration_min || service?.duration;
  const time = appt.time.slice(0, 5);
  const endTime = duration ? fromMin(toMin(time) + duration) : null;

  return (
    <div className="relative rounded-md p-4 pl-5 smooth hover-lift anim-pop bg-panel border border-line" style={{ borderLeft: "3px dashed var(--brass)" }}>
      <div className="flex justify-between items-start gap-3 flex-wrap">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-lg font-bold text-brass font-mono-receipt">
              {time}
              {endTime ? ` – ${endTime}` : ""}
            </span>
            <StatusPill status={appt.status} />
            {appt.status === "agendado" && appt.confirmed === true && (
              <span className="text-[11px] font-semibold uppercase tracking-wide px-2 py-1 rounded flex items-center gap-1 bg-success-bg text-success font-body">
                <Check size={11} /> Confirmado
              </span>
            )}
          </div>
          <div className="font-semibold text-cream font-body">{appt.client_name}</div>
          <div className="text-sm text-muted">
            {service?.name || "—"} · {barber?.name || "—"}
          </div>
          {appt.products?.length > 0 && (
            <div className="text-xs mt-1 flex items-center gap-1 text-brass">
              <Package size={11} /> {appt.products.map((p) => `${p.qty}x ${p.name}`).join(", ")}
            </div>
          )}
          {appt.payment_preference === "pix" && appt.status === "agendado" && (
            <div className={`text-xs mt-1 flex items-center gap-1 ${appt.client_claims_paid ? "text-success" : "text-muted"}`}>
              <QrCode size={11} /> {appt.client_claims_paid ? "Cliente marcou PIX como pago" : "Prefere pagar via PIX"}
            </div>
          )}
          {appt.referred_by_phone && (
            <div className="text-xs mt-1 flex items-center gap-1 text-brass">
              <UserPlus size={11} /> Cliente indicado
            </div>
          )}
        </div>
        <div className="flex items-center gap-2">{children}</div>
      </div>
    </div>
  );
}
