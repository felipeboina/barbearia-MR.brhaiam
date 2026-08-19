"use client";

import { useMemo } from "react";
import { Area, AreaChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { ArrowDownRight, ArrowUpRight, Minus } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { fmtMoney } from "@/lib/business/format";
import type { AdminData } from "../AdminApp";

const MONTH_ABBR_PT = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];

export function GraficosPanel({ transactions }: AdminData) {
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

  return (
    <div className="anim-step max-w-4xl">
      <h1 className="text-2xl mb-6 font-heading text-cream">Gráficos</h1>

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
