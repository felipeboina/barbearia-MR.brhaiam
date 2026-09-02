"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronDown, Pencil, Phone, Search, Star, Trash2, UserPlus } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Field } from "@/components/ui/Field";
import { TextInput } from "@/components/ui/TextInput";
import { fmtDatePt, fmtMoney } from "@/lib/business/format";
import { deleteClient, updateClient } from "@/lib/actions/admin";
import type { AdminData } from "../AdminApp";

export function ClientsPanel({ tenant, clients, transactions, appointments, barbers }: AdminData) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [expanded, setExpanded] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ name: "", phone: "", birthday: "" });
  const [savingEdit, setSavingEdit] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const startEdit = (c: AdminData["clients"][number]) => {
    setEditingId(c.id);
    setConfirmDeleteId(null);
    setEditError(null);
    setEditForm({ name: c.name, phone: c.phone, birthday: c.birthday || "" });
  };

  const saveEdit = async (id: string) => {
    setSavingEdit(true);
    setEditError(null);
    const res = await updateClient(id, { name: editForm.name, phone: editForm.phone, birthday: editForm.birthday || null });
    setSavingEdit(false);
    if (!res.ok) {
      setEditError(res.error);
      return;
    }
    setEditingId(null);
    router.refresh();
  };

  const confirmDelete = async (id: string) => {
    setDeletingId(id);
    await deleteClient(id);
    setDeletingId(null);
    setConfirmDeleteId(null);
    router.refresh();
  };

  const list = useMemo(
    () =>
      clients
        .filter((c) => c.name.toLowerCase().includes(query.toLowerCase()) || c.phone.includes(query))
        .sort((a, b) => (b.last_visit || "").localeCompare(a.last_visit || "")),
    [clients, query]
  );

  const historyFor = (phone: string) => {
    const services = transactions
      .filter((t) => t.type === "servico" && t.phone === phone)
      .map((t) => ({ kind: "servico" as const, date: t.date, id: t.id, label: t.service_name, barberId: t.barber_id, value: t.value }));
    const faltas = appointments
      .filter((a) => a.status === "falta" && a.phone === phone)
      .map((a) => ({ kind: "falta" as const, date: a.date, id: a.id, label: "Não compareceu", barberId: a.barber_id, value: null as number | null }));
    return [...services, ...faltas].sort((a, b) => b.date.localeCompare(a.date));
  };

  return (
    <div className="anim-step max-w-3xl mx-auto">
      <h1 className="text-2xl mb-6 font-heading text-cream">Clientes</h1>
      <div className="relative mb-6">
        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
        <TextInput value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Buscar por nome ou telefone" className="pl-9" />
      </div>

      <div className="space-y-2">
        {list.map((c) => {
          const overLimit = (c.no_shows || 0) >= tenant.no_show_threshold;
          const isOpen = expanded === c.id;
          const history = isOpen ? historyFor(c.phone) : [];
          const isEditing = editingId === c.id;
          return (
            <Card key={c.id}>
              <div className="flex items-center justify-between gap-2">
                <button
                  className="flex-1 min-w-0 text-left flex items-center justify-between"
                  onClick={() => setExpanded(isOpen ? null : c.id)}
                >
                  <div>
                    <div className="flex items-center gap-2 flex-wrap mb-0.5">
                      <span className="text-sm font-semibold text-cream font-body">{c.name}</span>
                      {(c.points || 0) > 0 && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-highlight-bg text-brass flex items-center gap-0.5 font-body">
                          <Star size={9} /> {c.points}
                        </span>
                      )}
                      {(c.referrals_count || 0) > 0 && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-success-bg text-success flex items-center gap-0.5 font-body">
                          <UserPlus size={9} /> {c.referrals_count}
                        </span>
                      )}
                      {overLimit && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-danger-bg text-danger font-body">{c.no_shows} faltas</span>
                      )}
                    </div>
                    <div className="text-xs text-muted flex items-center gap-1 font-body">
                      <Phone size={10} /> {c.phone}
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <div className="text-sm text-brass font-mono-receipt">{fmtMoney(c.total_spent || 0)}</div>
                      <div className="text-xs text-muted font-body">{c.visits || 0} visitas</div>
                    </div>
                    <ChevronDown size={16} className={`text-muted smooth ${isOpen ? "rotate-180" : ""}`} />
                  </div>
                </button>
                <div className="flex items-center gap-2 shrink-0">
                  <button onClick={() => (isEditing ? setEditingId(null) : startEdit(c))} className="text-muted press-scale">
                    <Pencil size={14} />
                  </button>
                  <button onClick={() => setConfirmDeleteId(confirmDeleteId === c.id ? null : c.id)} className="text-danger press-scale">
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>

              {confirmDeleteId === c.id && (
                <div className="mt-3 pt-3 border-t border-line flex items-center gap-2 anim-pop">
                  <p className="text-xs text-danger font-body flex-1">
                    Apagar o cadastro de {c.name}? Pontos, aniversário e faltas registradas se perdem (o histórico financeiro continua existindo).
                  </p>
                  <Button variant="ghost" onClick={() => setConfirmDeleteId(null)}>
                    Cancelar
                  </Button>
                  <Button variant="danger" disabled={deletingId === c.id} onClick={() => confirmDelete(c.id)}>
                    {deletingId === c.id ? "Excluindo..." : "Confirmar"}
                  </Button>
                </div>
              )}

              {isEditing && (
                <div className="mt-3 pt-3 border-t border-line anim-pop">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-3">
                    <Field label="Nome">
                      <TextInput value={editForm.name} onChange={(e) => setEditForm((f) => ({ ...f, name: e.target.value }))} />
                    </Field>
                    <Field label="Telefone">
                      <TextInput value={editForm.phone} onChange={(e) => setEditForm((f) => ({ ...f, phone: e.target.value }))} />
                    </Field>
                    <Field label="Data de nascimento (opcional)">
                      <TextInput
                        type="date"
                        value={editForm.birthday}
                        onChange={(e) => setEditForm((f) => ({ ...f, birthday: e.target.value }))}
                      />
                    </Field>
                  </div>
                  {editError && <p className="text-xs text-danger mb-2 font-body">{editError}</p>}
                  <div className="flex items-center gap-2">
                    <Button variant="ghost" onClick={() => setEditingId(null)}>
                      Cancelar
                    </Button>
                    <Button variant="primary" disabled={savingEdit} onClick={() => saveEdit(c.id)}>
                      {savingEdit ? "Salvando..." : "Salvar"}
                    </Button>
                  </div>
                </div>
              )}

              {isOpen && (
                <div className="mt-3 pt-3 border-t border-line space-y-1.5 anim-pop">
                  {c.last_visit && (
                    <div className="text-xs text-muted mb-2 font-body">Última visita: {fmtDatePt(c.last_visit)}</div>
                  )}
                  {history.map((h) => (
                    <div key={h.kind + h.id} className="flex items-center justify-between text-xs font-body">
                      <span className={h.kind === "falta" ? "text-danger" : "text-cream"}>
                        {fmtDatePt(h.date)} · {h.label} {h.barberId && `· ${barbers.find((b) => b.id === h.barberId)?.name || ""}`}
                      </span>
                      {h.value != null && <span className="text-brass font-mono-receipt">{fmtMoney(h.value)}</span>}
                    </div>
                  ))}
                  {history.length === 0 && <p className="text-xs text-muted font-body">Sem histórico ainda.</p>}
                </div>
              )}
            </Card>
          );
        })}
        {list.length === 0 && <p className="text-muted font-body">Nenhum cliente encontrado.</p>}
      </div>
    </div>
  );
}
