"use client";

import { useMemo, useState } from "react";
import { ArrowLeft, Check, X } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { TextInput } from "@/components/ui/TextInput";
import { fmtDatePt, weekdayPt } from "@/lib/business/format";
import { confirmAppointmentSelf, cancelAppointmentSelf, searchAppointmentsByPhone, type SelfCheckinAppt } from "@/lib/actions/public";

export function SelfCheckin({ onBack }: { onBack: () => void }) {
  const [phone, setPhone] = useState("");
  const [results, setResults] = useState<SelfCheckinAppt[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState<Record<string, "confirmado" | "cancelado">>({});

  const search = async () => {
    setLoading(true);
    const res = await searchAppointmentsByPhone(phone);
    setResults(res);
    setLoading(false);
  };

  const disabled = useMemo(() => phone.trim().length < 8, [phone]);

  return (
    <div className="max-w-md mx-auto px-4 pb-16 pt-6 anim-step">
      <button onClick={onBack} className="flex items-center gap-1 text-sm mb-6 smooth text-muted font-body">
        <ArrowLeft size={16} /> Voltar
      </button>
      <h2 className="text-xl mb-1 font-heading text-cream">Confirmar presença</h2>
      <p className="text-sm mb-4 text-muted font-body">Digite o telefone usado no agendamento.</p>
      <div className="flex gap-2 mb-6">
        <TextInput
          value={phone}
          onChange={(e) => {
            setPhone(e.target.value);
            setResults(null);
          }}
          placeholder="(00) 00000-0000"
        />
        <Button variant="brass" onClick={search} disabled={disabled || loading}>
          {loading ? "..." : "Buscar"}
        </Button>
      </div>

      {results && results.length === 0 && <p className="anim-pop text-muted font-body">Nenhum horário marcado encontrado para esse telefone.</p>}

      <div className="space-y-3">
        {results?.map((a) => {
          const state = feedback[a.id];
          return (
            <Card key={a.id} className="anim-pop">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-lg font-bold text-brass font-mono-receipt">{a.time.slice(0, 5)}</span>
                <span className="text-sm text-muted font-body">
                  {weekdayPt(a.date)} {fmtDatePt(a.date)}
                </span>
              </div>
              <div className="text-sm mb-3 text-cream font-body">
                {a.serviceName} com {a.barberName}
              </div>
              {state ? (
                <div className={`flex items-center gap-2 text-sm font-semibold anim-pop font-body ${state === "confirmado" ? "text-success" : "text-danger"}`}>
                  {state === "confirmado" ? <Check size={16} /> : <X size={16} />}
                  {state === "confirmado" ? "Presença confirmada!" : "Avisamos o barbeiro que você não vai."}
                </div>
              ) : (
                <div className="flex gap-2">
                  <Button
                    variant="primary"
                    className="flex-1"
                    onClick={async () => {
                      const ok = await confirmAppointmentSelf(a.id, phone);
                      if (ok) setFeedback((f) => ({ ...f, [a.id]: "confirmado" }));
                    }}
                  >
                    Sim, vou
                  </Button>
                  <Button
                    variant="ghost"
                    className="flex-1"
                    onClick={async () => {
                      const ok = await cancelAppointmentSelf(a.id, phone);
                      if (ok) setFeedback((f) => ({ ...f, [a.id]: "cancelado" }));
                    }}
                  >
                    Não vou dar
                  </Button>
                </div>
              )}
            </Card>
          );
        })}
      </div>
    </div>
  );
}
