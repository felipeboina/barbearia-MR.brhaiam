"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, Check, Copy, Minus, Plus, QrCode as QrCodeIcon, UserPlus } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { TextInput } from "@/components/ui/TextInput";
import { Field } from "@/components/ui/Field";
import { PixQrCode } from "@/components/ui/PixQrCode";
import { fmtDuration, fmtMoney, todayStr } from "@/lib/business/format";
import type { AvailableSlot } from "@/lib/business/availability";
import { buildPixPayload } from "@/lib/business/pix";
import { bookAppointment, findClientNoShows, findReferrerName, getSlots } from "@/lib/actions/public";
import type { Barber, Product, Service, Tenant } from "@/lib/types";

interface DoneInfo {
  clientName: string;
  date: string;
  time: string;
  serviceName: string;
  barberName: string;
}

export function BookingWizard({
  tenant,
  barbers,
  services,
  products,
  onBack,
  onDone,
}: {
  tenant: Tenant;
  barbers: Barber[];
  services: Service[];
  products: Product[];
  onBack: () => void;
  onDone: (info: DoneInfo) => void;
}) {
  const [step, setStep] = useState(1);
  const [serviceId, setServiceId] = useState<string | null>(null);
  const [barberId, setBarberId] = useState<string | null>(null);
  const [date, setDate] = useState(todayStr());
  const [time, setTime] = useState<string | null>(null);
  const [cart, setCart] = useState<Record<string, number>>({});
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [referralPhone, setReferralPhone] = useState("");
  const [referrerName, setReferrerName] = useState<string | null>(null);
  const [birthday, setBirthday] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<"pix" | "local">("local");
  const [clientClaimsPaid, setClientClaimsPaid] = useState(false);
  const [pixCopied, setPixCopied] = useState(false);
  const [noShows, setNoShows] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const [slotState, setSlotState] = useState<{ slots: AvailableSlot[]; isFullyBlocked: boolean; fullDayBlockLabel: string | null }>({
    slots: [],
    isFullyBlocked: false,
    fullDayBlockLabel: null,
  });
  const [slotsLoading, setSlotsLoading] = useState(false);

  const service = services.find((s) => s.id === serviceId) || null;
  const barber = barbers.find((b) => b.id === barberId) || null;

  useEffect(() => {
    if (!barberId || !service) return;
    let cancelled = false;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- indicador de carregamento p/ fetch disparado por mudança de dependência
    setSlotsLoading(true);
    getSlots(barberId, date, service.duration).then((res) => {
      if (!cancelled) {
        setSlotState(res);
        setSlotsLoading(false);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [barberId, date, service?.duration, service]);

  const phoneDebounce = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (phoneDebounce.current) clearTimeout(phoneDebounce.current);
    if (phone.replace(/\D/g, "").length < 8) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- reseta o aviso quando o telefone digitado fica curto demais
      setNoShows(0);
      return;
    }
    phoneDebounce.current = setTimeout(async () => {
      setNoShows(await findClientNoShows(phone));
    }, 500);
  }, [phone]);

  const referralDebounce = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (referralDebounce.current) clearTimeout(referralDebounce.current);
    if (referralPhone.replace(/\D/g, "").length < 8) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- reseta o nome do indicador quando o telefone digitado fica curto demais
      setReferrerName(null);
      return;
    }
    referralDebounce.current = setTimeout(async () => {
      setReferrerName(await findReferrerName(referralPhone, phone));
    }, 500);
  }, [referralPhone, phone]);

  const cartItems = useMemo(
    () =>
      Object.entries(cart)
        .filter(([, qty]) => qty > 0)
        .map(([productId, qty]) => ({ product: products.find((p) => p.id === productId)!, qty }))
        .filter((it) => it.product),
    [cart, products]
  );
  const addonsTotal = cartItems.reduce((s, it) => s + it.product.price * it.qty, 0);
  const grandTotal = (service?.price || 0) + addonsTotal;

  const canConfirm = name.trim().length >= 2 && phone.trim().length >= 8;

  const pixPayload =
    tenant.pix_key && grandTotal > 0
      ? buildPixPayload({ pixKey: tenant.pix_key, merchantName: tenant.shop_name, merchantCity: tenant.pix_city, amount: grandTotal })
      : null;

  const confirm = async () => {
    if (!canConfirm || !service || !barber || !time) return;
    setSubmitting(true);
    setSubmitError(null);
    const res = await bookAppointment({
      clientName: name,
      phone,
      birthday: birthday || null,
      barberId: barber.id,
      serviceId: service.id,
      date,
      time,
      duration: service.duration,
      products: cartItems.map((it) => ({ productId: it.product.id, name: it.product.name, price: it.product.price, qty: it.qty })),
      addonsTotal,
      totalValue: grandTotal,
      paymentPreference: paymentMethod,
      clientClaimsPaid,
      referredByPhone: referralPhone || null,
    });
    setSubmitting(false);
    if (!res.ok) {
      setSubmitError(res.error);
      return;
    }
    onDone({ clientName: name.trim(), date, time, serviceName: service.name, barberName: barber.name });
  };

  return (
    <div className="max-w-md mx-auto px-4 pb-16 pt-6 anim-step">
      <button
        onClick={() => (step === 1 ? onBack() : setStep(step - 1))}
        className="flex items-center gap-1 text-sm mb-6 smooth text-muted font-body"
      >
        <ArrowLeft size={16} /> Voltar
      </button>

      <div className="flex items-center gap-1.5 mb-6">
        {[1, 2, 3, 4].map((s) => (
          <div key={s} className="h-1.5 flex-1 rounded-full smooth" style={{ background: s <= step ? "var(--brass)" : "var(--line)" }} />
        ))}
      </div>

      {step === 1 && (
        <div className="anim-step">
          <h2 className="text-xl mb-4 font-heading text-cream">Escolha o serviço</h2>
          <div className="space-y-2">
            {services.map((s) => (
              <button
                key={s.id}
                onClick={() => {
                  setServiceId(s.id);
                  setStep(2);
                }}
                className="w-full text-left"
              >
                <Card lift className="flex items-center justify-between">
                  <div>
                    <div className="font-semibold text-cream font-body">{s.name}</div>
                    <div className="text-xs text-muted font-body">{fmtDuration(s.duration)}</div>
                  </div>
                  <div className="text-brass font-mono-receipt font-bold">{fmtMoney(s.price)}</div>
                </Card>
              </button>
            ))}
            {services.length === 0 && <p className="text-muted font-body">Nenhum serviço cadastrado ainda.</p>}
          </div>
        </div>
      )}

      {step === 2 && (
        <div className="anim-step">
          <h2 className="text-xl mb-4 font-heading text-cream">Escolha o barbeiro</h2>
          <div className="space-y-2">
            {barbers.map((b) => (
              <button
                key={b.id}
                onClick={() => {
                  setBarberId(b.id);
                  setStep(3);
                }}
                className="w-full text-left"
              >
                <Card lift className="font-semibold text-cream font-body">
                  {b.name}
                </Card>
              </button>
            ))}
            {barbers.length === 0 && <p className="text-muted font-body">Nenhum barbeiro cadastrado ainda.</p>}
          </div>
        </div>
      )}

      {step === 3 && (
        <div className="anim-step">
          <h2 className="text-xl mb-4 font-heading text-cream">Data e horário</h2>
          <Field label="Data">
            <TextInput
              type="date"
              min={todayStr()}
              value={date}
              onChange={(e) => {
                setDate(e.target.value);
                setTime(null);
              }}
            />
          </Field>
          {slotState.isFullyBlocked ? (
            <p className="text-sm text-muted font-body mt-4">
              {barber?.name} não atende nesse dia{slotState.fullDayBlockLabel ? ` (${slotState.fullDayBlockLabel})` : ""}. Escolha outra data.
            </p>
          ) : slotsLoading ? (
            <p className="text-sm text-muted font-body mt-4">Carregando horários...</p>
          ) : (
            <div className="grid grid-cols-3 gap-2 mt-4">
              {slotState.slots.map((s) => (
                <button
                  key={s.time}
                  disabled={s.taken}
                  onClick={() => {
                    setTime(s.time);
                    setStep(4);
                  }}
                  className="press-scale rounded-md py-2.5 text-sm font-mono-receipt border smooth disabled:opacity-30"
                  style={{
                    background: s.taken ? "var(--ink)" : "var(--panel)",
                    borderColor: time === s.time ? "var(--brass)" : "var(--line)",
                    color: "var(--cream)",
                  }}
                >
                  {s.time}
                </button>
              ))}
              {slotState.slots.length === 0 && <p className="text-sm text-muted font-body col-span-3">Nenhum horário disponível nesse dia.</p>}
            </div>
          )}
        </div>
      )}

      {step === 4 && (
        <div className="anim-step">
          <h2 className="text-xl mb-4 font-heading text-cream">Seus dados</h2>

          {products.length > 0 && (
            <div className="mb-5">
              <span className="block text-xs uppercase tracking-wider mb-1.5 text-muted font-body">Adicionar produtos (opcional)</span>
              <div className="space-y-2">
                {products.map((p) => {
                  const qty = cart[p.id] || 0;
                  return (
                    <Card key={p.id} className="flex items-center justify-between py-2.5">
                      <div>
                        <div className="text-sm text-cream font-body">{p.name}</div>
                        <div className="text-xs text-brass font-mono-receipt">{fmtMoney(p.price)}</div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setCart((c) => ({ ...c, [p.id]: Math.max(0, (c[p.id] || 0) - 1) }))}
                          className="press-scale w-7 h-7 rounded-full border border-line flex items-center justify-center text-cream"
                        >
                          <Minus size={13} />
                        </button>
                        <span className="w-4 text-center text-sm text-cream font-mono-receipt">{qty}</span>
                        <button
                          onClick={() => setCart((c) => ({ ...c, [p.id]: (c[p.id] || 0) + 1 }))}
                          className="press-scale w-7 h-7 rounded-full border border-line flex items-center justify-center text-cream"
                        >
                          <Plus size={13} />
                        </button>
                      </div>
                    </Card>
                  );
                })}
              </div>
            </div>
          )}

          <Field label="Nome completo">
            <TextInput value={name} onChange={(e) => setName(e.target.value)} placeholder="Seu nome" />
          </Field>
          <Field label="Telefone / WhatsApp">
            <TextInput value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="(00) 00000-0000" />
          </Field>
          {noShows >= tenant.no_show_threshold && (
            <p className="text-xs text-danger mb-4 font-body">
              Notamos {noShows} falta(s) anterior(es) nesse telefone. Por favor, confirme presença ou avise com antecedência caso não possa vir.
            </p>
          )}

          <Field label="Telefone de quem te indicou (opcional)">
            <TextInput value={referralPhone} onChange={(e) => setReferralPhone(e.target.value)} placeholder="(00) 00000-0000" />
          </Field>
          {referrerName && (
            <p className="text-xs text-brass mb-4 flex items-center gap-1 font-body">
              <UserPlus size={12} /> Indicado por {referrerName}
            </p>
          )}

          <Field label="Data de nascimento (opcional)">
            <TextInput type="date" value={birthday} onChange={(e) => setBirthday(e.target.value)} />
          </Field>

          <span className="block text-xs uppercase tracking-wider mb-1.5 text-muted font-body">Forma de pagamento</span>
          <div className="flex gap-2 mb-4">
            <button
              onClick={() => setPaymentMethod("local")}
              className="flex-1 press-scale rounded-md py-2.5 text-sm font-body border smooth"
              style={{ borderColor: paymentMethod === "local" ? "var(--brass)" : "var(--line)", color: "var(--cream)" }}
            >
              Pagar no local
            </button>
            {tenant.pix_key && (
              <button
                onClick={() => setPaymentMethod("pix")}
                className="flex-1 press-scale rounded-md py-2.5 text-sm font-body border smooth"
                style={{ borderColor: paymentMethod === "pix" ? "var(--brass)" : "var(--line)", color: "var(--cream)" }}
              >
                PIX
              </button>
            )}
          </div>

          {paymentMethod === "pix" && pixPayload && (
            <Card className="mb-4 text-center">
              <div className="flex justify-center mb-3">
                <PixQrCode value={pixPayload} size={150} />
              </div>
              <Button
                variant="ghost"
                className="w-full mb-2 flex items-center justify-center gap-2"
                onClick={() => {
                  navigator.clipboard?.writeText(tenant.pix_key).then(() => {
                    setPixCopied(true);
                    setTimeout(() => setPixCopied(false), 2000);
                  });
                }}
              >
                {pixCopied ? <Check size={14} /> : <Copy size={14} />} {pixCopied ? "Chave copiada!" : "Copiar chave PIX"}
              </Button>
              <button
                onClick={() => setClientClaimsPaid(true)}
                className={`text-xs font-body flex items-center gap-1 justify-center mx-auto smooth ${clientClaimsPaid ? "text-success" : "text-muted"}`}
              >
                <QrCodeIcon size={12} /> {clientClaimsPaid ? "Marcado como pago" : "Já paguei"}
              </button>
            </Card>
          )}

          <div className="flex items-center justify-between mb-4 pt-2">
            <span className="text-sm text-muted font-body">Total</span>
            <span className="text-lg font-bold text-brass font-mono-receipt">{fmtMoney(grandTotal)}</span>
          </div>

          {submitError && <p className="text-sm text-danger mb-4 font-body">{submitError}</p>}

          <Button variant="primary" className="w-full" disabled={!canConfirm || submitting} onClick={confirm}>
            {submitting ? "Confirmando..." : "Confirmar agendamento"}
          </Button>
        </div>
      )}
    </div>
  );
}
