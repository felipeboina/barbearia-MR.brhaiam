"use client";

import { ArrowLeft, Check, Crown } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { fmtMoney } from "@/lib/business/format";
import type { Plan } from "@/lib/types";

export function PlansView({ plans, onBack, onSelect }: { plans: Plan[]; onBack: () => void; onSelect: (plan: Plan) => void }) {
  return (
    <div className="max-w-md mx-auto px-4 pb-16 pt-6 anim-step">
      <button onClick={onBack} className="flex items-center gap-1 text-sm mb-6 smooth text-muted font-body">
        <ArrowLeft size={16} /> Voltar
      </button>
      <div className="flex items-center gap-2 mb-4">
        <Crown size={20} className="text-brass" />
        <h2 className="text-xl font-heading text-cream">Planos de assinatura</h2>
      </div>
      <div className="space-y-3">
        {plans.map((p) => (
          <Card key={p.id} className="anim-pop">
            <div className="flex items-baseline justify-between mb-2">
              <h3 className="font-semibold text-cream font-body">{p.name}</h3>
              <div className="text-right">
                <span className="text-lg font-bold text-brass font-mono-receipt">{fmtMoney(p.price)}</span>
                <span className="text-xs text-muted font-body">/{p.period}</span>
              </div>
            </div>
            <ul className="space-y-1 mb-4">
              {p.benefits?.map((b, i) => (
                <li key={i} className="text-sm text-muted flex items-center gap-1.5 font-body">
                  <Check size={13} className="text-success shrink-0" /> {b}
                </li>
              ))}
            </ul>
            <Button variant="brass" className="w-full" onClick={() => onSelect(p)}>
              Assinar
            </Button>
          </Card>
        ))}
        {plans.length === 0 && <p className="text-muted font-body">Nenhum plano disponível no momento.</p>}
      </div>
    </div>
  );
}
