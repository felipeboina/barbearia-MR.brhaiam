"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Minus, Plus, Scissors } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Field } from "@/components/ui/Field";
import { TextInput, Select } from "@/components/ui/TextInput";
import { fmtMoney } from "@/lib/business/format";
import { PAYMENT_METHODS } from "@/lib/types";
import { registerWalkIn } from "@/lib/actions/admin";
import type { AdminData } from "../AdminApp";

export function AvulsoPanel({ clients, services, products, barbers }: AdminData) {
  const router = useRouter();

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [birthday, setBirthday] = useState("");
  const [serviceIds, setServiceIds] = useState<string[]>([]);
  const [cart, setCart] = useState<Record<string, number>>({});
  const [barberId, setBarberId] = useState(barbers[0]?.id || "");
  const [paymentMethod, setPaymentMethod] = useState<string>(PAYMENT_METHODS[0]?.id || "");
  const [submitting, setSubmitting] = useState(false);

  const cleanPhone = phone.replace(/\D/g, "");
  const matchedClient = useMemo(() => (cleanPhone.length >= 8 ? clients.find((c) => c.phone === cleanPhone) : null), [cleanPhone, clients]);

  const toggleService = (id: string) => {
    setServiceIds((ids) => (ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id]));
  };

  const selectedServices = useMemo(() => services.filter((s) => serviceIds.includes(s.id)), [services, serviceIds]);
  const totalServicePrice = selectedServices.reduce((s, it) => s + it.price, 0);
  const cartItems = useMemo(
    () =>
      Object.entries(cart)
        .filter(([, qty]) => qty > 0)
        .map(([productId, qty]) => ({ product: products.find((p) => p.id === productId)!, qty }))
        .filter((it) => it.product),
    [cart, products]
  );
  const addonsTotal = cartItems.reduce((s, it) => s + it.product.price * it.qty, 0);
  const totalValue = totalServicePrice + addonsTotal;

  const submitWalkIn = async () => {
    if (!name.trim() || serviceIds.length === 0 || !barberId || !paymentMethod) return;
    setSubmitting(true);
    await registerWalkIn({
      clientName: name,
      phone,
      birthday: birthday || null,
      serviceIds,
      productItems: cartItems.map((it) => ({ productId: it.product.id, qty: it.qty })),
      barberId,
      paymentMethod,
    });
    setSubmitting(false);
    setName("");
    setPhone("");
    setBirthday("");
    setServiceIds([]);
    setCart({});
    router.refresh();
  };

  return (
    <div className="anim-step max-w-2xl mx-auto">
      <h1 className="text-2xl mb-6 font-heading text-cream">Atendimento Avulso</h1>

      <Card className="mb-6">
        <h3 className="text-sm uppercase tracking-wider text-muted mb-3 flex items-center gap-1.5 font-body">
          <Scissors size={14} /> Registrar corte feito agora
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Field label="Nome do cliente*">
            <TextInput value={name} onChange={(e) => setName(e.target.value)} />
          </Field>
          <Field label="Telefone (opcional)">
            <TextInput value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="(00) 00000-0000" />
          </Field>
          <Field label="Data de nascimento (opcional)">
            <TextInput type="date" value={birthday} onChange={(e) => setBirthday(e.target.value)} />
          </Field>
          <Field label="Barbeiro">
            <Select value={barberId} onChange={(e) => setBarberId(e.target.value)}>
              {barbers.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Forma de pagamento">
            <Select value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)}>
              {PAYMENT_METHODS.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.label}
                </option>
              ))}
            </Select>
          </Field>
        </div>

        <div className="mb-3">
          <span className="block text-xs uppercase tracking-wider mb-1.5 text-muted font-body">Serviços (pode escolher mais de um)</span>
          <div className="space-y-1.5">
            {services.map((s) => {
              const checked = serviceIds.includes(s.id);
              return (
                <label
                  key={s.id}
                  className="flex items-center justify-between py-1.5 px-2.5 rounded-md border smooth cursor-pointer"
                  style={{ borderColor: checked ? "var(--brass)" : "var(--line)" }}
                >
                  <span className="flex items-center gap-2 text-sm text-cream font-body">
                    <input type="checkbox" checked={checked} onChange={() => toggleService(s.id)} className="accent-[var(--brass)]" />
                    {s.name}
                  </span>
                  <span className="text-xs text-muted font-mono-receipt">{fmtMoney(s.price)}</span>
                </label>
              );
            })}
          </div>
        </div>

        {products.length > 0 && (
          <div className="mb-3">
            <span className="block text-xs uppercase tracking-wider mb-1.5 text-muted font-body">Produtos (opcional)</span>
            <div className="space-y-1.5">
              {products.map((p) => {
                const qty = cart[p.id] || 0;
                return (
                  <div key={p.id} className="flex items-center justify-between py-1.5 px-2.5 rounded-md border border-line">
                    <div>
                      <div className="text-sm text-cream font-body">{p.name}</div>
                      <div className="text-xs text-muted font-mono-receipt">{fmtMoney(p.price)}</div>
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
                        onClick={() => setCart((c) => ({ ...c, [p.id]: Math.min(p.stock, (c[p.id] || 0) + 1) }))}
                        className="press-scale w-7 h-7 rounded-full border border-line flex items-center justify-center text-cream"
                      >
                        <Plus size={13} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        <p className="text-xs mb-3 font-body text-muted">
          {cleanPhone.length < 8
            ? "Sem telefone, essa venda não fica vinculada ao histórico ou fidelidade do cliente."
            : matchedClient
              ? `Cliente já cadastrado: ${matchedClient.name}.`
              : "Telefone novo — um cadastro de cliente será criado."}
        </p>

        <Button variant="primary" disabled={submitting || !name.trim() || serviceIds.length === 0} onClick={submitWalkIn}>
          {submitting ? "Registrando..." : `Registrar${totalValue > 0 ? ` (${fmtMoney(totalValue)})` : ""}`}
        </Button>
      </Card>
    </div>
  );
}
