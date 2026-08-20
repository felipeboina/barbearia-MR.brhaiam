"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Field } from "@/components/ui/Field";
import { TextInput, Select } from "@/components/ui/TextInput";
import { fmtDatePt, todayStr } from "@/lib/business/format";
import { BLOCK_REASONS } from "@/lib/types";
import { addBlocks, deleteBlock, type BlockInput } from "@/lib/actions/admin";
import type { AdminData } from "../AdminApp";

export function BlocksPanel({ barbers, blocks }: AdminData) {
  const router = useRouter();

  const [barberId, setBarberId] = useState<string>("todos");
  const [reasonId, setReasonId] = useState<string>(BLOCK_REASONS[0].id);
  const [allDay, setAllDay] = useState<boolean>(BLOCK_REASONS[0].allDay);
  const [startDate, setStartDate] = useState(todayStr());
  const [endDate, setEndDate] = useState(todayStr());
  const [startTime, setStartTime] = useState("12:00");
  const [endTime, setEndTime] = useState("13:00");
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const preset = BLOCK_REASONS.find((r) => r.id === reasonId)!;

  const selectReason = (id: string) => {
    const r = BLOCK_REASONS.find((x) => x.id === id)!;
    setReasonId(id);
    setAllDay(r.allDay);
    if (id === "ferias") setEndDate(startDate);
  };

  const submit = async () => {
    const list: BlockInput[] = [];
    if (allDay) {
      let d = new Date(startDate + "T12:00:00");
      const end = new Date(endDate + "T12:00:00");
      if (end < d) return;
      while (d <= end) {
        list.push({
          barberId: barberId === "todos" ? null : barberId,
          date: d.toISOString().slice(0, 10),
          allDay: true,
          startTime: null,
          endTime: null,
          reasonId,
          reasonLabel: preset.label,
          note,
        });
        d = new Date(d);
        d.setDate(d.getDate() + 1);
      }
    } else {
      if (endTime <= startTime) return;
      list.push({
        barberId: barberId === "todos" ? null : barberId,
        date: startDate,
        allDay: false,
        startTime,
        endTime,
        reasonId,
        reasonLabel: preset.label,
        note,
      });
    }
    setSubmitting(true);
    await addBlocks(list);
    setSubmitting(false);
    setNote("");
    router.refresh();
  };

  const upcoming = blocks.filter((b) => b.date >= todayStr()).sort((a, b) => a.date.localeCompare(b.date));

  return (
    <div className="anim-step max-w-3xl mx-auto grid md:grid-cols-2 gap-6">
      <div>
        <h1 className="text-2xl mb-6 font-heading text-cream">Bloqueios</h1>
        <Card>
          <Field label="Motivo">
            <Select value={reasonId} onChange={(e) => selectReason(e.target.value)}>
              {BLOCK_REASONS.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.label}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Barbeiro">
            <Select value={barberId} onChange={(e) => setBarberId(e.target.value)}>
              <option value="todos">Todos</option>
              {barbers.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </Select>
          </Field>
          {allDay ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Field label="De">
                <TextInput type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
              </Field>
              <Field label="Até">
                <TextInput type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
              </Field>
            </div>
          ) : (
            <>
              <Field label="Data">
                <TextInput type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
              </Field>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Field label="Início">
                  <TextInput type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} />
                </Field>
                <Field label="Fim">
                  <TextInput type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} />
                </Field>
              </div>
            </>
          )}
          <Field label="Observação (opcional)">
            <TextInput value={note} onChange={(e) => setNote(e.target.value)} placeholder="Ex: consulta médica" />
          </Field>
          <Button variant="primary" className="w-full" disabled={submitting} onClick={submit}>
            {submitting ? "Salvando..." : "Adicionar bloqueio"}
          </Button>
        </Card>
      </div>

      <div>
        <h2 className="text-sm uppercase tracking-wider text-muted mb-3 mt-1 md:mt-16 font-body">Próximos bloqueios</h2>
        <div className="space-y-2">
          {upcoming.map((b) => {
            const reason = BLOCK_REASONS.find((r) => r.id === b.reason_id);
            const barberName = b.barber_id ? barbers.find((x) => x.id === b.barber_id)?.name : "Todos";
            return (
              <Card key={b.id} className="flex items-center justify-between py-2.5">
                <div className="text-sm font-body">
                  <div className="text-cream">
                    {fmtDatePt(b.date)} · {reason?.label || b.reason_id}
                  </div>
                  <div className="text-xs text-muted">
                    {barberName}
                    {!b.all_day && b.start_time && ` · ${b.start_time.slice(0, 5)}–${b.end_time?.slice(0, 5)}`}
                  </div>
                </div>
                <button
                  onClick={async () => { await deleteBlock(b.id); router.refresh(); }}
                  className="text-danger press-scale"
                >
                  <Trash2 size={14} />
                </button>
              </Card>
            );
          })}
          {upcoming.length === 0 && <p className="text-muted font-body text-sm">Nenhum bloqueio futuro.</p>}
        </div>
      </div>
    </div>
  );
}
