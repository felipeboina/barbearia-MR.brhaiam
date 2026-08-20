"use client";

import { useState } from "react";
import Image from "next/image";
import { Check, Clock, MapPin, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { PoleStripe } from "@/components/ui/PoleStripe";
import { fmtDatePt, formatWorkDays, weekdayPt } from "@/lib/business/format";
import type { Barber, Plan, Product, Service, Tenant } from "@/lib/types";
import { SelfCheckin } from "./SelfCheckin";
import { BookingWizard } from "./BookingWizard";
import { PlansView } from "./PlansView";
import { PlanSignupForm } from "./PlanSignupForm";

type Screen = "hero" | "booking" | "checkin" | "plans" | "planSignup" | "done";

interface DoneInfo {
  clientName: string;
  date: string;
  time: string;
  serviceName: string;
  barberName: string;
}

export function PublicBookingApp({
  tenant,
  barbers,
  services,
  products,
  plans,
}: {
  tenant: Tenant;
  barbers: Barber[];
  services: Service[];
  products: Product[];
  plans: Plan[];
}) {
  const [screen, setScreen] = useState<Screen>("hero");
  const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null);
  const [doneInfo, setDoneInfo] = useState<DoneInfo | null>(null);

  if (screen === "checkin") {
    return <SelfCheckin onBack={() => setScreen("hero")} />;
  }

  if (screen === "booking") {
    return (
      <BookingWizard
        tenant={tenant}
        barbers={barbers}
        services={services}
        products={products}
        onBack={() => setScreen("hero")}
        onDone={(info) => {
          setDoneInfo(info);
          setScreen("done");
        }}
      />
    );
  }

  if (screen === "plans") {
    return (
      <PlansView
        plans={plans}
        onBack={() => setScreen("hero")}
        onSelect={(plan) => {
          setSelectedPlan(plan);
          setScreen("planSignup");
        }}
      />
    );
  }

  if (screen === "planSignup" && selectedPlan) {
    return <PlanSignupForm plan={selectedPlan} tenant={tenant} onBack={() => setScreen("plans")} />;
  }

  if (screen === "done" && doneInfo) {
    return (
      <div className="max-w-md mx-auto px-4 pb-16 pt-10 text-center anim-step">
        <div className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-5 bg-brass stamp-in">
          <Check size={36} className="text-ink" />
        </div>
        <div
          className="inline-block px-4 py-1.5 rounded border-2 uppercase text-sm font-bold tracking-widest mb-5 stamp-in"
          style={{ borderColor: "var(--barber-red)", color: "var(--barber-red)", transform: "rotate(-7deg)" }}
        >
          Confirmado
        </div>
        <h2 className="text-xl mb-2 font-heading text-cream">Agendamento confirmado, {doneInfo.clientName.split(" ")[0]}!</h2>
        <p className="text-sm text-muted mb-6 font-body">
          {doneInfo.serviceName} com {doneInfo.barberName}
          <br />
          {weekdayPt(doneInfo.date)}, {fmtDatePt(doneInfo.date)} às {doneInfo.time}
        </p>
        <Button variant="brass" onClick={() => setScreen("hero")}>
          Voltar ao início
        </Button>
      </div>
    );
  }

  // Hero
  return (
    <div className="anim-fadein brand-bg">
      <PoleStripe />
      <div className="max-w-md mx-auto px-4 pb-16 pt-10 text-center relative">
        <Image
          src="/logo.jpg"
          alt={tenant.shop_name}
          width={80}
          height={80}
          className="rounded-full mx-auto mb-5"
          style={{ boxShadow: "0 4px 24px -4px rgba(47,95,224,0.5)" }}
          priority
        />
        <h1 className="text-3xl mb-2 font-heading text-cream">{tenant.shop_name}</h1>
        <p className="text-sm text-muted mb-8 font-body flex items-center justify-center gap-1.5">
          <Clock size={13} /> {tenant.open_hour}h às {tenant.close_hour}h · {formatWorkDays(tenant.work_days)}
        </p>

        <Button variant="primary" className="w-full mb-3 btn-shine" onClick={() => setScreen("booking")}>
          Começar agendamento
        </Button>

        {tenant.plans_enabled && plans.length > 0 && (
          <Card lift className="mb-3 cursor-pointer text-left flex items-center gap-3" onClick={() => setScreen("plans")}>
            <Sparkles size={20} className="text-brass shrink-0" />
            <div>
              <div className="text-sm font-semibold text-cream font-body">Conheça nossos planos</div>
              <div className="text-xs text-muted font-body">Assine e economize nos cortes</div>
            </div>
          </Card>
        )}

        <button onClick={() => setScreen("checkin")} className="text-sm text-muted smooth font-body underline">
          Já tenho horário — confirmar presença
        </button>

        {tenant.address && (
          <div className="mt-8 flex items-center justify-center gap-1.5 text-xs text-muted font-body">
            <MapPin size={13} />
            <a
              href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(tenant.address)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="underline"
            >
              {tenant.address}
            </a>
          </div>
        )}
      </div>
    </div>
  );
}
