/**
 * Cálculo do valor final de um atendimento — portado de barbearia-app.jsx
 * (computeFinalPrice, linhas 128-145).
 *
 * Aplica (nessa ordem de prioridade, nunca os dois ao mesmo tempo):
 *   1) desconto de boas-vindas por indicação (1ª visita de quem foi indicado)
 *   2) crédito de indicação acumulado (de quem já indicou algum amigo)
 *
 * IMPORTANTE (achado da extração do protótipo): birthday_discount e
 * inactive_discount NÃO são aplicados aqui — só aparecem no texto das
 * mensagens de WhatsApp. O plano do cliente também não gera desconto de
 * preço (só consome "cutsUsed" à parte, ver lib/business/plans.ts).
 */
import type { Client, Service } from "@/lib/types";

export interface FinalPriceResult {
  price: number;
  discountPct: number;
  reason: string | null;
}

export function computeFinalPrice(
  appt: { referred_by_phone: string | null | undefined; phone: string },
  service: Pick<Service, "price"> | null | undefined,
  clientRecord: Client | null | undefined,
  referralDiscount: number
): FinalPriceResult {
  if (!service) return { price: 0, discountPct: 0, reason: null };
  const isFirstVisit = !clientRecord || (clientRecord.visits || 0) === 0;

  if (appt.referred_by_phone && isFirstVisit) {
    const price = +(service.price * (1 - referralDiscount / 100)).toFixed(2);
    return { price, discountPct: referralDiscount, reason: "Desconto de boas-vindas (indicação)" };
  }
  if ((clientRecord?.referral_credits || 0) > 0) {
    const price = +(service.price * (1 - referralDiscount / 100)).toFixed(2);
    return { price, discountPct: referralDiscount, reason: "Crédito por ter indicado um amigo" };
  }
  return { price: service.price, discountPct: 0, reason: null };
}
