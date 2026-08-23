/**
 * Cálculo de disponibilidade de horários — portado literalmente de
 * barbearia-app.jsx (computeTodayAvailability, linhas 81-109, e o cálculo
 * de slots do passo 3 do agendamento, linhas 849-886).
 *
 * Regra sutil preservada: um agendamento com status "falta" continua
 * ocupando o horário (só "cancelado" libera o slot).
 */
import type { Appointment, Barber, Block, Service, Tenant } from "@/lib/types";
import { toMin, fromMin, todayStr } from "./format";

type SlotConfig = Pick<Tenant, "open_hour" | "close_hour" | "slot_min">;

export function computeTodayAvailability(
  barbers: Barber[],
  appointments: Appointment[],
  blocks: Block[],
  config: SlotConfig
) {
  const today = todayStr();
  const now = new Date();
  const nowMin = now.getHours() * 60 + now.getMinutes();
  const shopClosedToday = blocks.some((bl) => bl.all_day && bl.barber_id === null && bl.date === today);
  if (shopClosedToday) return { freeSlots: 0, activeBarbers: 0 };

  let freeSlots = 0;
  let activeBarbers = 0;
  barbers.forEach((b) => {
    const offToday = blocks.some((bl) => bl.all_day && bl.date === today && bl.barber_id === b.id);
    if (offToday) return;
    activeBarbers++;
    const openHour = b.start_hour ?? config.open_hour;
    const closeHour = b.end_hour ?? config.close_hour;
    const startMin = Math.max(openHour * 60, Math.ceil(nowMin / config.slot_min) * config.slot_min);
    const closeMin = closeHour * 60;
    const dayAppts = appointments.filter((a) => a.barber_id === b.id && a.date === today && a.status !== "cancelado");
    const timeBlocks = blocks.filter((bl) => !bl.all_day && bl.date === today && (bl.barber_id === b.id || bl.barber_id === null));
    for (let m = startMin; m + config.slot_min <= closeMin; m += config.slot_min) {
      const start = m;
      const end = m + config.slot_min;
      const overlapsAppt = dayAppts.some((a) => {
        const aStart = toMin(a.time);
        const aDur = a.duration_min || config.slot_min;
        return start < aStart + aDur && aStart < end;
      });
      const overlapsBlock = timeBlocks.some((bl) => start < toMin(bl.end_time!) && toMin(bl.start_time!) < end);
      if (!overlapsAppt && !overlapsBlock) freeSlots++;
    }
  });
  return { freeSlots, activeBarbers };
}

export interface AvailableSlot {
  time: string;
  taken: boolean;
}

export function computeAvailableSlots(params: {
  barberId: string | null;
  barberHours?: Pick<Barber, "start_hour" | "end_hour"> | null;
  serviceHours?: Pick<Service, "start_hour" | "end_hour">[];
  date: string;
  appointments: Appointment[];
  blocks: Block[];
  config: SlotConfig;
  serviceDuration: number | null;
}): { slots: AvailableSlot[]; isFullyBlocked: boolean; fullDayBlockLabel: string | null } {
  const { barberId, barberHours, serviceHours, date, appointments, blocks, config, serviceDuration } = params;

  const dayBlocks = blocks.filter((bl) => (bl.barber_id === null || bl.barber_id === barberId) && bl.date === date);
  const isFullyBlocked = dayBlocks.some((bl) => bl.all_day);
  const fullDayBlockLabel = dayBlocks.find((bl) => bl.all_day)?.reason_label ?? null;

  if (!barberId || !serviceDuration || isFullyBlocked) {
    return { slots: [], isFullyBlocked, fullDayBlockLabel };
  }

  // horário efetivo = interseção entre loja, barbeiro e todo serviço
  // selecionado que tenha horário próprio (ex.: "Cabelo" só das 19h às 21h,
  // mesmo a loja abrindo às 10h) — o mais restritivo sempre vence.
  let openHour = barberHours?.start_hour ?? config.open_hour;
  let closeHour = barberHours?.end_hour ?? config.close_hour;
  for (const s of serviceHours ?? []) {
    if (s.start_hour != null) openHour = Math.max(openHour, s.start_hour);
    if (s.end_hour != null) closeHour = Math.min(closeHour, s.end_hour);
  }
  const { slot_min: slotMin } = config;
  const dayAppts = appointments.filter((a) => a.barber_id === barberId && a.date === date && a.status !== "cancelado");
  const timeBlocks = dayBlocks.filter((bl) => !bl.all_day);

  const slots: AvailableSlot[] = [];
  for (let m = openHour * 60; m + serviceDuration <= closeHour * 60; m += slotMin) {
    const start = m;
    const end = m + serviceDuration;
    // um horário só fica disponível se o bloco inteiro do serviço couber
    // sem invadir a duração de nenhum outro atendimento já marcado
    const overlapsAppt = dayAppts.some((a) => {
      const aStart = toMin(a.time);
      const aDur = a.duration_min || slotMin;
      const aEnd = aStart + aDur;
      return start < aEnd && aStart < end;
    });
    const overlapsBlock = timeBlocks.some((bl) => {
      const bStart = toMin(bl.start_time!);
      const bEnd = toMin(bl.end_time!);
      return start < bEnd && bStart < end;
    });
    slots.push({ time: fromMin(start), taken: overlapsAppt || overlapsBlock });
  }
  return { slots, isFullyBlocked, fullDayBlockLabel };
}
