"use client";

import { useRouter } from "next/navigation";
import { Cake, Check, MessageCircle } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { fmtDatePt, isBirthdayToday } from "@/lib/business/format";
import { birthdayMessage, waLink } from "@/lib/business/messages";
import { markBirthdaySent } from "@/lib/actions/admin";
import type { AdminData } from "../AdminApp";

export function AniversariantesPanel({ tenant, clients }: AdminData) {
  const router = useRouter();
  const thisYear = new Date().getFullYear();

  const todayList = clients.filter((c) => isBirthdayToday(c.birthday));
  const withBirthday = clients
    .filter((c) => c.birthday)
    .sort((a, b) => (a.birthday as string).slice(5).localeCompare((b.birthday as string).slice(5)));

  return (
    <div className="anim-step max-w-3xl">
      <h1 className="text-2xl mb-6 font-heading text-cream flex items-center gap-2">
        <Cake size={22} className="text-brass" /> Aniversariantes
      </h1>

      {todayList.length > 0 && (
        <div className="mb-6">
          <h2 className="text-sm uppercase tracking-wider text-brass mb-3 font-body">Hoje! 🎉</h2>
          <div className="space-y-2">
            {todayList.map((c) => {
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
                      href={waLink(c.phone, birthdayMessage(c, { shopName: tenant.shop_name, birthdayDiscount: tenant.birthday_discount }))}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={async () => { await markBirthdaySent(c.phone, thisYear); router.refresh(); }}
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

      <h2 className="text-sm uppercase tracking-wider text-muted mb-3 font-body">Todos os cadastrados</h2>
      <div className="space-y-2">
        {withBirthday.map((c) => (
          <Card key={c.id} className="flex items-center justify-between py-2.5">
            <div className="text-sm text-cream font-body">{c.name}</div>
            <div className="text-xs text-muted font-mono-receipt">{fmtDatePt(c.birthday as string).slice(0, 5)}</div>
          </Card>
        ))}
        {withBirthday.length === 0 && <p className="text-muted font-body">Nenhum cliente com data de nascimento cadastrada.</p>}
      </div>
    </div>
  );
}
