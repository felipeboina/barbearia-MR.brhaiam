"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Scissors, UserPlus } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Field } from "@/components/ui/Field";
import { TextInput, Select } from "@/components/ui/TextInput";
import { fmtMoney } from "@/lib/business/format";
import { PAYMENT_METHODS } from "@/lib/types";
import { registerWalkIn, registerClient } from "@/lib/actions/admin";
import type { AdminData } from "../AdminApp";

export function AvulsoPanel({ clients, services, barbers }: AdminData) {
  const router = useRouter();

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [serviceId, setServiceId] = useState(services[0]?.id || "");
  const [barberId, setBarberId] = useState(barbers[0]?.id || "");
  const [paymentMethod, setPaymentMethod] = useState<string>(PAYMENT_METHODS[0]?.id || "");
  const [submitting, setSubmitting] = useState(false);

  const cleanPhone = phone.replace(/\D/g, "");
  const matchedClient = useMemo(() => (cleanPhone.length >= 8 ? clients.find((c) => c.phone === cleanPhone) : null), [cleanPhone, clients]);

  const service = services.find((s) => s.id === serviceId);

  const submitWalkIn = async () => {
    if (!name.trim() || !serviceId || !barberId || !paymentMethod) return;
    setSubmitting(true);
    await registerWalkIn({ clientName: name, phone, serviceId, barberId, paymentMethod });
    setSubmitting(false);
    setName("");
    setPhone("");
    router.refresh();
  };

  const [clientName, setClientName] = useState("");
  const [clientPhone, setClientPhone] = useState("");
  const [clientBirthday, setClientBirthday] = useState("");
  const [submittingClient, setSubmittingClient] = useState(false);

  const submitClient = async () => {
    if (!clientName.trim() || clientPhone.replace(/\D/g, "").length < 8) return;
    setSubmittingClient(true);
    await registerClient({ name: clientName, phone: clientPhone, birthday: clientBirthday || null });
    setSubmittingClient(false);
    setClientName("");
    setClientPhone("");
    setClientBirthday("");
    router.refresh();
  };

  return (
    <div className="anim-step max-w-2xl">
      <h1 className="text-2xl mb-6 font-heading text-cream">Atendimento Avulso</h1>

      <Card className="mb-6">
        <h3 className="text-sm uppercase tracking-wider text-muted mb-3 flex items-center gap-1.5 font-body">
          <Scissors size={14} /> Registrar corte feito agora
        </h3>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Nome do cliente">
            <TextInput value={name} onChange={(e) => setName(e.target.value)} />
          </Field>
          <Field label="Telefone (opcional)">
            <TextInput value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="(00) 00000-0000" />
          </Field>
          <Field label="Serviço">
            <Select value={serviceId} onChange={(e) => setServiceId(e.target.value)}>
              {services.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} — {fmtMoney(s.price)}
                </option>
              ))}
            </Select>
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

        <p className="text-xs mb-3 font-body text-muted">
          {cleanPhone.length < 8
            ? "Sem telefone, essa venda não fica vinculada ao histórico ou fidelidade do cliente."
            : matchedClient
              ? `Cliente já cadastrado: ${matchedClient.name}.`
              : "Telefone novo — um cadastro de cliente será criado."}
        </p>

        <Button variant="primary" disabled={submitting || !name.trim() || !service} onClick={submitWalkIn}>
          {submitting ? "Registrando..." : `Registrar${service ? ` (${fmtMoney(service.price)})` : ""}`}
        </Button>
      </Card>

      <Card>
        <h3 className="text-sm uppercase tracking-wider text-muted mb-3 flex items-center gap-1.5 font-body">
          <UserPlus size={14} /> Cadastrar cliente (sem agendar nada)
        </h3>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Nome">
            <TextInput value={clientName} onChange={(e) => setClientName(e.target.value)} />
          </Field>
          <Field label="Telefone">
            <TextInput value={clientPhone} onChange={(e) => setClientPhone(e.target.value)} placeholder="(00) 00000-0000" />
          </Field>
          <Field label="Data de nascimento (opcional)">
            <TextInput type="date" value={clientBirthday} onChange={(e) => setClientBirthday(e.target.value)} />
          </Field>
        </div>
        <Button variant="brass" disabled={submittingClient} onClick={submitClient}>
          {submittingClient ? "Salvando..." : "Cadastrar cliente"}
        </Button>
      </Card>
    </div>
  );
}
