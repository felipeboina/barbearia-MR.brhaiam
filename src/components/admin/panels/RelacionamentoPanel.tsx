"use client";

import { useRouter } from "next/navigation";
import { Cake, Check, Gift, MessageCircle, Star, UserMinus } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Toggle } from "@/components/ui/Toggle";
import { daysSince, fmtDatePt, isBirthdayToday } from "@/lib/business/format";
import { birthdayMessage, earlyNudgeMessage, waLink, winbackMessage } from "@/lib/business/messages";
import { getPlanStatus } from "@/lib/business/plans";
import { markBirthdaySent, markEarlyNudgeSent, markWinbackContacted, redeemLoyalty, updateTenantConfig } from "@/lib/actions/admin";
import type { AdminData } from "../AdminApp";

export function RelacionamentoPanel({ tenant, clients, plans }: AdminData) {
  const router = useRouter();
  const thisYear = new Date().getFullYear();

  const hasActivePlan = (c: (typeof clients)[number]) => {
    const status = getPlanStatus(c, plans);
    return status && !status.expired;
  };

  // Fidelidade
  const loyaltyAll = clients.filter((c) => (c.points || 0) > 0).sort((a, b) => (b.points || 0) - (a.points || 0));
  const loyaltyReady = loyaltyAll.filter((c) => (c.points || 0) >= tenant.loyalty_goal);
  const loyaltyRest = loyaltyAll.filter((c) => (c.points || 0) < tenant.loyalty_goal);

  // Aniversariantes
  const birthdayToday = clients.filter((c) => isBirthdayToday(c.birthday));
  const withBirthday = clients
    .filter((c) => c.birthday)
    .sort((a, b) => (a.birthday as string).slice(5).localeCompare((b.birthday as string).slice(5)));

  // Aviso antecipado + inativos
  const earlyNudge = clients
    .filter((c) => c.last_visit && !hasActivePlan(c) && daysSince(c.last_visit)! >= tenant.early_reminder_days && daysSince(c.last_visit)! < tenant.inactive_days)
    .sort((a, b) => daysSince(b.last_visit)! - daysSince(a.last_visit)!);
  const inactive = clients
    .filter((c) => c.last_visit && daysSince(c.last_visit)! >= tenant.inactive_days)
    .sort((a, b) => daysSince(b.last_visit)! - daysSince(a.last_visit)!);

  return (
    <div className="anim-step max-w-3xl mx-auto">
      <h1 className="text-2xl mb-6 font-heading text-cream">Relacionamento</h1>

      <div className="flex flex-wrap gap-4 mb-8">
        <Toggle
          checked={tenant.loyalty_enabled}
          onChange={(v) => updateTenantConfig({ loyalty_enabled: v }).then(() => router.refresh())}
          label="Programa de fidelidade"
        />
        <Toggle
          checked={tenant.birthday_enabled}
          onChange={(v) => updateTenantConfig({ birthday_enabled: v }).then(() => router.refresh())}
          label="Programa de aniversário"
        />
      </div>

      {tenant.loyalty_enabled && (
        <div className="mb-8">
          <h2 className="text-sm uppercase tracking-wider text-cream mb-1 flex items-center gap-1.5 font-body">
            <Star size={14} className="text-brass" /> Fidelidade
          </h2>
          <p className="text-xs text-muted mb-3 font-body">
            A cada {tenant.loyalty_goal} atendimentos concluídos, o cliente ganha: <span className="text-brass">{tenant.loyalty_reward}</span>
          </p>

          {loyaltyReady.length > 0 && (
            <div className="mb-4">
              <h3 className="text-xs uppercase tracking-wider text-brass mb-2 flex items-center gap-1.5 font-body">
                <Gift size={12} /> Prontos para resgatar
              </h3>
              <div className="space-y-2">
                {loyaltyReady.map((c) => (
                  <Card key={c.id} className="flex items-center justify-between">
                    <div>
                      <div className="text-sm text-cream font-body">{c.name}</div>
                      <div className="text-xs text-muted font-body">{c.points} pontos</div>
                    </div>
                    <Button
                      variant="brass"
                      onClick={async () => {
                        await redeemLoyalty(c.phone);
                        router.refresh();
                      }}
                    >
                      Resgatar
                    </Button>
                  </Card>
                ))}
              </div>
            </div>
          )}

          <div className="space-y-2">
            {loyaltyRest.map((c) => (
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
            {loyaltyAll.length === 0 && <p className="text-muted font-body text-sm">Nenhum cliente com pontos ainda.</p>}
          </div>
        </div>
      )}

      {tenant.birthday_enabled && (
        <div className="mb-8">
          <h2 className="text-sm uppercase tracking-wider text-cream mb-3 flex items-center gap-1.5 font-body">
            <Cake size={14} className="text-brass" /> Aniversariantes
          </h2>

          {birthdayToday.length > 0 && (
            <div className="mb-4">
              <h3 className="text-xs uppercase tracking-wider text-brass mb-2 font-body">Hoje! 🎉</h3>
              <div className="space-y-2">
                {birthdayToday.map((c) => {
                  const sentThisYear = c.birthday_msg_year === thisYear;
                  return (
                    <Card key={c.id} className="flex items-center justify-between">
                      <div className="text-sm text-cream font-body">{c.name}</div>
                      {sentThisYear ? (
                        <span className="text-xs text-success flex items-center gap-1 font-body">
                          <Check size={12} /> Enviado
                        </span>
                      ) : (
                        <a
                          href={waLink(c.phone, birthdayMessage(c, tenant))}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={async () => {
                            await markBirthdaySent(c.phone, thisYear);
                            router.refresh();
                          }}
                          className="press-scale w-8 h-8 rounded-full flex items-center justify-center bg-whatsapp text-whatsapp-ink"
                        >
                          <MessageCircle size={15} />
                        </a>
                      )}
                    </Card>
                  );
                })}
              </div>
            </div>
          )}

          <div className="space-y-2">
            {withBirthday.map((c) => (
              <Card key={c.id} className="flex items-center justify-between py-2.5">
                <div className="text-sm text-cream font-body">{c.name}</div>
                <div className="text-xs text-muted font-mono-receipt">{fmtDatePt(c.birthday as string).slice(0, 5)}</div>
              </Card>
            ))}
            {withBirthday.length === 0 && <p className="text-muted font-body text-sm">Nenhum cliente com data de nascimento cadastrada.</p>}
          </div>
        </div>
      )}

      <div className="mb-8">
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
                    href={waLink(c.phone, earlyNudgeMessage(c, tenant))}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={async () => {
                      await markEarlyNudgeSent(c.phone, c.last_visit!);
                      router.refresh();
                    }}
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
        <h2 className="text-sm uppercase tracking-wider text-muted mb-3 flex items-center gap-1.5 font-body">
          <UserMinus size={14} /> Inativos
        </h2>
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
                    href={waLink(c.phone, winbackMessage(c, tenant))}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={async () => {
                      await markWinbackContacted(c.phone, c.last_visit!);
                      router.refresh();
                    }}
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
