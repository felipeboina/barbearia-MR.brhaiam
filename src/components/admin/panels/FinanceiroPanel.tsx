"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Area, AreaChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { ArrowDownRight, ArrowUpRight, Minus, Plus } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Field } from "@/components/ui/Field";
import { TextInput, Select } from "@/components/ui/TextInput";
import { fmtDatePt, fmtMoney } from "@/lib/business/format";
import { EXPENSE_CATEGORIES, INCOME_CATEGORIES, PAYMENT_METHODS } from "@/lib/types";
import { addManualEntry } from "@/lib/actions/admin";
import type { AdminData } from "../AdminApp";

const MONTH_ABBR_PT = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];

function currentMonthKey() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export function FinanceiroPanel({ transactions, barbers }: AdminData) {
  const router = useRouter();
  const [month, setMonth] = useState(currentMonthKey());
  const [showForm, setShowForm] = useState(false);
  const [kind, setKind] = useState<"entrada" | "despesa">("despesa");
  const [categoryId, setCategoryId] = useState<string>(EXPENSE_CATEGORIES[0].id);
  const [desc, setDesc] = useState("");
  const [value, setValue] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const categories = kind === "entrada" ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;

  const monthTx = useMemo(
    () => transactions.filter((t) => t.date.startsWith(month)).sort((a, b) => b.date.localeCompare(a.date)),
    [transactions, month]
  );
  const revenue = monthTx.filter((t) => t.type === "servico" || t.type === "entrada").reduce((s, t) => s + t.value, 0);
  const expenses = monthTx.filter((t) => t.type === "despesa").reduce((s, t) => s + t.value, 0);
  const commissions = monthTx.filter((t) => t.type === "servico").reduce((s, t) => s + t.commission, 0);
  const net = revenue - expenses - commissions;

  const byBarber = barbers.map((b) => ({
    barber: b,
    total: monthTx.filter((t) => t.type === "servico" && t.barber_id === b.id).reduce((s, t) => s + t.commission, 0),
  }));

  const incomeByCategory: Record<string, number> = {};
  monthTx.filter((t) => t.type === "servico").forEach((t) => {
    incomeByCategory[t.service_name || "Serviço"] = (incomeByCategory[t.service_name || "Serviço"] || 0) + t.value;
  });
  monthTx.filter((t) => t.type === "entrada").forEach((t) => {
    const label = INCOME_CATEGORIES.find((c) => c.id === t.category_id)?.label || "Outra entrada";
    incomeByCategory[label] = (incomeByCategory[label] || 0) + t.value;
  });
  const expenseByCategory: Record<string, number> = {};
  monthTx.filter((t) => t.type === "despesa").forEach((t) => {
    const label = EXPENSE_CATEGORIES.find((c) => c.id === t.category_id)?.label || "Outra saída";
    expenseByCategory[label] = (expenseByCategory[label] || 0) + t.value;
  });
  const incomeRows = Object.entries(incomeByCategory).sort((a, b) => b[1] - a[1]);
  const expenseRows = Object.entries(expenseByCategory).sort((a, b) => b[1] - a[1]);

  const byPaymentMethod = PAYMENT_METHODS.map((m) => ({
    method: m,
    total: monthTx.filter((t) => t.type === "servico" && t.payment_method === m.id).reduce((s, t) => s + t.value, 0),
  })).filter((r) => r.total > 0);

  const monthly = useMemo(() => {
    const months: { key: string; label: string }[] = [];
    const now = new Date();
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      months.push({ key, label: MONTH_ABBR_PT[d.getMonth()] });
    }
    return months.map(({ key, label }) => {
      const tx = transactions.filter((t) => t.date.startsWith(key));
      const receita = tx.filter((t) => t.type === "servico" || t.type === "entrada").reduce((s, t) => s + t.value, 0);
      const comissoes = tx.filter((t) => t.type === "servico").reduce((s, t) => s + t.commission, 0);
      const despesas = tx.filter((t) => t.type === "despesa").reduce((s, t) => s + t.value, 0);
      const gastos = comissoes + despesas;
      const lucro = receita - gastos;
      return { key, label, receita, gastos, lucro };
    });
  }, [transactions]);

  const current = monthly[monthly.length - 1];
  const previous = monthly[monthly.length - 2];
  const growth = previous && previous.lucro !== 0 ? ((current.lucro - previous.lucro) / Math.abs(previous.lucro)) * 100 : current.lucro > 0 ? 100 : 0;
  const growthPositive = growth >= 0;

  const submit = async () => {
    if (!value || parseFloat(value) <= 0) return;
    const catLabel = categories.find((c) => c.id === categoryId)?.label || "Outro";
    setSubmitting(true);
    await addManualEntry({ type: kind, categoryId, description: desc.trim() || catLabel, value: parseFloat(value) });
    setSubmitting(false);
    setDesc("");
    setValue("");
    setShowForm(false);
    router.refresh();
  };

  return (
    <div className="anim-step max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <h1 className="text-2xl font-heading text-cream">Financeiro &amp; Gráficos</h1>
        <div className="flex items-center gap-2">
          <TextInput type="month" value={month} onChange={(e) => setMonth(e.target.value)} className="w-40" />
          <Button variant="brass" className="flex items-center gap-1.5" onClick={() => setShowForm((v) => !v)}>
            <Plus size={14} /> Lançamento
          </Button>
        </div>
      </div>

      {showForm && (
        <Card className="mb-6 anim-pop">
          <div className="flex gap-2 mb-4">
            <button
              onClick={() => {
                setKind("entrada");
                setCategoryId(INCOME_CATEGORIES[0].id);
              }}
              className="flex-1 press-scale rounded-md py-2 text-sm font-body border smooth"
              style={{ borderColor: kind === "entrada" ? "var(--brass)" : "var(--line)", color: "var(--cream)" }}
            >
              Entrada
            </button>
            <button
              onClick={() => {
                setKind("despesa");
                setCategoryId(EXPENSE_CATEGORIES[0].id);
              }}
              className="flex-1 press-scale rounded-md py-2 text-sm font-body border smooth"
              style={{ borderColor: kind === "despesa" ? "var(--brass)" : "var(--line)", color: "var(--cream)" }}
            >
              Despesa
            </button>
          </div>
          <Field label="Categoria">
            <Select value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.label}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Descrição (opcional)">
            <TextInput value={desc} onChange={(e) => setDesc(e.target.value)} />
          </Field>
          <Field label="Valor">
            <TextInput type="number" step="0.01" value={value} onChange={(e) => setValue(e.target.value)} placeholder="0,00" />
          </Field>
          <Button variant="primary" className="w-full" disabled={submitting} onClick={submit}>
            {submitting ? "Salvando..." : "Salvar lançamento"}
          </Button>
        </Card>
      )}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <Card>
          <div className="text-xs text-muted mb-1 font-body">Faturamento do mês</div>
          <div className="text-xl font-bold text-brass font-mono-receipt">{fmtMoney(revenue)}</div>
        </Card>
        <Card>
          <div className="text-xs text-muted mb-1 font-body">Comissões</div>
          <div className="text-xl font-bold text-cream font-mono-receipt">{fmtMoney(commissions)}</div>
        </Card>
        <Card>
          <div className="text-xs text-muted mb-1 font-body">Despesas</div>
          <div className="text-xl font-bold text-cream font-mono-receipt">{fmtMoney(expenses)}</div>
        </Card>
        <Card>
          <div className="text-xs text-muted mb-1 font-body">Líquido</div>
          <div className={`text-xl font-bold font-mono-receipt ${net >= 0 ? "text-success" : "text-danger"}`}>{fmtMoney(net)}</div>
        </Card>
      </div>

      <div className="grid md:grid-cols-2 gap-4 mb-6">
        <Card>
          <h3 className="text-sm uppercase tracking-wider text-muted mb-3 font-body">Entradas por categoria</h3>
          <div className="space-y-1.5">
            {incomeRows.map(([label, v]) => (
              <div key={label} className="flex justify-between text-sm font-body">
                <span className="text-cream">{label}</span>
                <span className="text-success font-mono-receipt">{fmtMoney(v)}</span>
              </div>
            ))}
            {incomeRows.length === 0 && <p className="text-xs text-muted font-body">Nenhuma entrada no mês.</p>}
          </div>
        </Card>
        <Card>
          <h3 className="text-sm uppercase tracking-wider text-muted mb-3 font-body">Saídas por categoria</h3>
          <div className="space-y-1.5">
            {expenseRows.map(([label, v]) => (
              <div key={label} className="flex justify-between text-sm font-body">
                <span className="text-cream">{label}</span>
                <span className="text-danger font-mono-receipt">{fmtMoney(v)}</span>
              </div>
            ))}
            {expenseRows.length === 0 && <p className="text-xs text-muted font-body">Nenhuma saída no mês.</p>}
          </div>
        </Card>
      </div>

      <div className="grid md:grid-cols-2 gap-4 mb-6">
        <Card>
          <h3 className="text-sm uppercase tracking-wider text-muted mb-3 font-body">Comissão por barbeiro</h3>
          <div className="space-y-1.5">
            {byBarber.map(({ barber, total }) => (
              <div key={barber.id} className="flex justify-between text-sm font-body">
                <span className="text-cream">{barber.name}</span>
                <span className="text-brass font-mono-receipt">{fmtMoney(total)}</span>
              </div>
            ))}
          </div>
        </Card>
        <Card>
          <h3 className="text-sm uppercase tracking-wider text-muted mb-3 font-body">Por forma de pagamento</h3>
          <div className="space-y-1.5">
            {byPaymentMethod.map(({ method, total }) => (
              <div key={method.id} className="flex justify-between text-sm font-body">
                <span className="text-cream">{method.label}</span>
                <span className="text-brass font-mono-receipt">{fmtMoney(total)}</span>
              </div>
            ))}
            {byPaymentMethod.length === 0 && <p className="text-xs text-muted font-body">Sem dados no mês.</p>}
          </div>
        </Card>
      </div>

      <Card className="mb-6">
        <h3 className="text-sm uppercase tracking-wider text-muted mb-3 font-body">Lançamentos do mês</h3>
        <div className="space-y-1.5 max-h-96 overflow-y-auto">
          {monthTx.map((t) => (
            <div key={t.id} className="flex justify-between text-sm font-body py-1 border-b border-line last:border-0">
              <span className="text-cream">
                {fmtDatePt(t.date)} · {t.description || t.service_name || t.type}
              </span>
              <span className={t.type === "despesa" ? "text-danger font-mono-receipt" : "text-success font-mono-receipt"}>
                {t.type === "despesa" ? "-" : "+"}
                {fmtMoney(t.value)}
              </span>
            </div>
          ))}
          {monthTx.length === 0 && <p className="text-xs text-muted font-body">Nenhum lançamento nesse mês.</p>}
        </div>
      </Card>

      <h2 className="text-sm uppercase tracking-wider text-muted mb-3 font-body">Tendência (últimos 6 meses)</h2>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <Card>
          <div className="text-xs text-muted mb-1 font-body">Lucro do mês</div>
          <div className="text-xl font-bold text-brass font-mono-receipt">{fmtMoney(current.lucro)}</div>
        </Card>
        <Card>
          <div className="text-xs text-muted mb-1 font-body">Receita do mês</div>
          <div className="text-xl font-bold text-success font-mono-receipt">{fmtMoney(current.receita)}</div>
        </Card>
        <Card>
          <div className="text-xs text-muted mb-1 font-body">Gastos do mês</div>
          <div className="text-xl font-bold text-danger font-mono-receipt">{fmtMoney(current.gastos)}</div>
        </Card>
        <Card>
          <div className="text-xs text-muted mb-1 font-body">Crescimento</div>
          <div className={`text-xl font-bold font-mono-receipt flex items-center gap-1 ${growthPositive ? "text-success" : "text-danger"}`}>
            {growth === 0 ? <Minus size={16} /> : growthPositive ? <ArrowUpRight size={16} /> : <ArrowDownRight size={16} />}
            {Math.abs(growth).toFixed(0)}%
          </div>
        </Card>
      </div>

      <Card>
        <div style={{ width: "100%", height: 300 }}>
          <ResponsiveContainer>
            <AreaChart data={monthly}>
              <CartesianGrid strokeDasharray="3 3" stroke="#382F25" />
              <XAxis dataKey="label" stroke="#8C8175" fontSize={12} />
              <YAxis stroke="#8C8175" fontSize={12} />
              <Tooltip contentStyle={{ background: "#241E17", border: "1px solid #382F25", color: "#F1E9DA" }} formatter={(v) => fmtMoney(Number(v))} />
              <Legend />
              <Area type="monotone" dataKey="receita" name="Receita" stroke="#6fbf8f" fill="#6fbf8f" fillOpacity={0.15} />
              <Area type="monotone" dataKey="gastos" name="Gastos" stroke="#d9695f" fill="#d9695f" fillOpacity={0.15} />
              <Area type="monotone" dataKey="lucro" name="Lucro" stroke="#C69B3B" fill="#C69B3B" fillOpacity={0.2} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </Card>
    </div>
  );
}
