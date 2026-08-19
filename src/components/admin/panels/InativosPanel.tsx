"use client";

import { useRouter } from "next/navigation";
import { Check, MessageCircle, UserMinus } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { daysSince } from "@/lib/business/format";
import { earlyNudgeMessage, waLink, winbackMessage } from "@/lib/business/messages";
import { getPlanStatus } from "@/lib/business/plans";
import { markEarlyNudgeSent, markWinbackContacted } from "@/lib/actions/admin";
import type { AdminData } from "../AdminApp";

export function InativosPanel({ tenant, clients, plans }: AdminData) {
  const router = useRouter();

  const hasActivePlan = (c: (typeof clients)[number]) => {
    const status = getPlanStatus(c, plans);
    return status && !status.expired;
  };

  const earlyNudge = clients
    .filter((c) => c.last_visit && !hasActivePlan(c) && daysSince(c.last_visit)! >= tenant.early_reminder_days && daysSince(c.last_visit)! < tenant.inactive_days)
    .sort((a, b) => daysSince(b.last_visit)! - daysSince(a.last_visit)!);

  const inactive = clients
    .filter((c) => c.last_visit && daysSince(c.last_visit)! >= tenant.inactive_days)
    .sort((a, b) => daysSince(b.last_visit)! - daysSince(a.last_visit)!);

  return (
    <div className="anim-step max-w-3xl">
      <h1 className="text-2xl mb-6 font-heading text-cream flex items-center gap-2">
        <UserMinus size={22} className="text-brass" /> Inativos
      </h1>

      <div className="mb-6">
        <h2 className="text-sm uppercase tracking-wider text-brass mb-3 font-body">Aviso antecipado</h2>
        <div className="space-y-2">
          {earlyNudge.map((c) => {
            const nudgedRecently = c.early_nudge_sent_for === c.last_visit;
            return (
              <Card key={c.id} className="flex items-center justify-between">
                <div>
                  <div className="text-sm text-cream font-body">{c.name}</div>
                  <div className="text-xs text-muted font-body">{daysSince(c.last_visit)} dias sem vir</div>
                </div>
                {nudgedRecently ? (
                  <span className="text-xs text-success flex items-center gap-1 font-body">
                    <Check size={12} /> Avisado
                  </span>
                ) : (
                  <a
                    href={waLink(c.phone, earlyNudgeMessage(c, { shopName: tenant.shop_name }))}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={async () => { await markEarlyNudgeSent(c.phone, c.last_visit!); router.refresh(); }}
                    className="press-scale w-8 h-8 rounded-full flex items-center justify-center bg-whatsapp text-whatsapp-ink"
                  >
                    <MessageCircle size={15} />
                  </a>
                )}
              </Card>
            );
          })}
          {earlyNudge.length === 0 && <p className="text-muted font-body text-sm">Ninguém nessa faixa no momento.</p>}
        </div>
      </div>

      <div>
        <h2 className="text-sm uppercase tracking-wider text-muted mb-3 font-body">Inativos</h2>
        <div className="space-y-2">
          {inactive.map((c) => {
            const contactedRecently = c.winback_sent_for === c.last_visit;
            return (
              <Card key={c.id} className="flex items-center justify-between">
                <div>
                  <div className="text-sm text-cream font-body">{c.name}</div>
                  <div className="text-xs text-muted font-body">{daysSince(c.last_visit)} dias sem vir</div>
                </div>
                {contactedRecently ? (
                  <span className="text-xs text-success flex items-center gap-1 font-body">
                    <Check size={12} /> Contatado
                  </span>
                ) : (
                  <a
                    href={waLink(c.phone, winbackMessage(c, { shopName: tenant.shop_name, inactiveDiscount: tenant.inactive_discount }))}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={async () => { await markWinbackContacted(c.phone, c.last_visit!); router.refresh(); }}
                    className="press-scale w-8 h-8 rounded-full flex items-center justify-center bg-whatsapp text-whatsapp-ink"
                  >
                    <MessageCircle size={15} />
                  </a>
                )}
              </Card>
            );
          })}
          {inactive.length === 0 && <p className="text-muted font-body text-sm">Nenhum cliente inativo.</p>}
        </div>
      </div>
    </div>
  );
}
