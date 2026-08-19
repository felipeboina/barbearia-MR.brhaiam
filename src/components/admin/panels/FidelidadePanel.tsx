"use client";

import { useRouter } from "next/navigation";
import { Gift, Star } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { redeemLoyalty } from "@/lib/actions/admin";
import type { AdminData } from "../AdminApp";

export function FidelidadePanel({ tenant, clients }: AdminData) {
  const router = useRouter();

  const all = clients.filter((c) => (c.points || 0) > 0).sort((a, b) => (b.points || 0) - (a.points || 0));
  const ready = all.filter((c) => (c.points || 0) >= tenant.loyalty_goal);
  const rest = all.filter((c) => (c.points || 0) < tenant.loyalty_goal);

  return (
    <div className="anim-step max-w-3xl">
      <h1 className="text-2xl mb-2 font-heading text-cream">Fidelidade</h1>
      <p className="text-sm text-muted mb-6 font-body">
        A cada {tenant.loyalty_goal} atendimentos concluídos, o cliente ganha: <span className="text-brass">{tenant.loyalty_reward}</span>
      </p>

      {ready.length > 0 && (
        <div className="mb-6">
          <h2 className="text-sm uppercase tracking-wider text-brass mb-3 flex items-center gap-1.5 font-body">
            <Gift size={14} /> Prontos para resgatar
          </h2>
          <div className="space-y-2">
            {ready.map((c) => (
              <Card key={c.id} className="flex items-center justify-between">
                <div>
                  <div className="text-sm text-cream font-body">{c.name}</div>
                  <div className="text-xs text-muted font-body">{c.points} pontos</div>
                </div>
                <Button
                  variant="brass"
                  onClick={async () => { await redeemLoyalty(c.phone); router.refresh(); }}
                >
                  Resgatar
                </Button>
              </Card>
            ))}
          </div>
        </div>
      )}

      <h2 className="text-sm uppercase tracking-wider text-muted mb-3 flex items-center gap-1.5 font-body">
        <Star size={14} /> Ranking de pontos
      </h2>
      <div className="space-y-2">
        {rest.map((c) => (
          <Card key={c.id} className="flex items-center justify-between py-2.5">
            <div className="text-sm text-cream font-body">{c.name}</div>
            <div className="flex items-center gap-2">
              <div className="w-24 h-1.5 rounded-full bg-line overflow-hidden">
                <div className="h-full bg-brass" style={{ width: `${Math.min(100, ((c.points || 0) / tenant.loyalty_goal) * 100)}%` }} />
              </div>
              <span className="text-xs text-muted font-mono-receipt w-16 text-right">
                {c.points}/{tenant.loyalty_goal}
              </span>
            </div>
          </Card>
        ))}
        {all.length === 0 && <p className="text-muted font-body">Nenhum cliente com pontos ainda.</p>}
      </div>
    </div>
  );
}
