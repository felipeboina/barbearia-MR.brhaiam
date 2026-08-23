/**
 * Tipos de domínio — espelham as colunas do schema Postgres (snake_case)
 * definido em supabase/migrations/0001_init.sql. Manter em sincronia com o
 * schema é responsabilidade manual (não há geração automática configurada).
 */

export type SubscriptionStatus = "trial" | "active" | "canceled";

export type MessageTemplateKey = "confirmacao" | "lembrete" | "aniversario" | "reengajamento" | "aviso_antecipado" | "vencimento_plano";

export interface Tenant {
  id: string;
  slug: string;
  shop_name: string;
  owner_user_id: string | null;
  subscription_status: SubscriptionStatus;
  trial_ends_at: string;
  open_hour: number;
  close_hour: number;
  slot_min: number;
  reminder_hours: number;
  birthday_discount: number;
  no_show_threshold: number;
  pix_key: string;
  pix_city: string;
  shop_whatsapp: string;
  address: string;
  work_days: number[];
  booking_days: number[];
  inactive_days: number;
  inactive_discount: number;
  loyalty_goal: number;
  loyalty_reward: string;
  referral_discount: number;
  plans_enabled: boolean;
  early_reminder_days: number;
  plan_expiry_reminder_days: number;
  loyalty_enabled: boolean;
  birthday_enabled: boolean;
  message_sender_number: string;
  templates: Partial<Record<MessageTemplateKey, string>>;
  created_at: string;
}

export interface Profile {
  id: string;
  tenant_id: string;
  role: "owner" | "staff";
  created_at: string;
}

export interface Barber {
  id: string;
  tenant_id: string;
  name: string;
  commission: number;
  start_hour: number | null;
  end_hour: number | null;
  created_at: string;
}

export interface Service {
  id: string;
  tenant_id: string;
  name: string;
  price: number;
  duration: number;
  sort_order: number;
  start_hour: number | null;
  end_hour: number | null;
  created_at: string;
}

export interface Product {
  id: string;
  tenant_id: string;
  name: string;
  stock: number;
  min_stock: number;
  price: number;
  cost: number;
  created_at: string;
}

export interface Plan {
  id: string;
  tenant_id: string;
  name: string;
  price: number;
  period: string;
  period_days: number;
  cuts_included: number;
  benefits: string[];
  active: boolean;
  created_at: string;
}

export interface Client {
  id: string;
  tenant_id: string;
  phone: string;
  name: string;
  birthday: string | null;
  visits: number;
  total_spent: number;
  last_visit: string | null;
  no_shows: number;
  points: number;
  referral_credits: number;
  referrals_count: number;
  plan_id: string | null;
  plan_start_date: string | null;
  plan_cuts_used: number;
  birthday_msg_year: number | null;
  winback_sent_for: string | null;
  early_nudge_sent_for: string | null;
  created_at: string;
}

export type AppointmentStatus = "agendado" | "concluido" | "cancelado" | "falta";

export interface AppointmentProductItem {
  productId: string;
  name: string;
  price: number;
  qty: number;
}

export interface Appointment {
  id: string;
  tenant_id: string;
  client_id: string | null;
  client_name: string;
  phone: string;
  birthday: string | null;
  barber_id: string;
  service_id: string;
  extra_service_ids: string[];
  date: string; // YYYY-MM-DD
  time: string; // HH:MM:SS (postgres time) ou HH:MM
  duration_min: number;
  status: AppointmentStatus;
  confirmed: boolean;
  products: AppointmentProductItem[];
  addons_total: number;
  total_value: number;
  payment_preference: "pix" | "local" | null;
  client_claims_paid: boolean;
  referred_by_phone: string | null;
  payment_method: string | null;
  discount_pct: number | null;
  discount_reason: string | null;
  created_at: string;
}

export type TransactionType = "servico" | "entrada" | "despesa";

export interface Transaction {
  id: string;
  tenant_id: string;
  date: string;
  type: TransactionType;
  appt_id: string | null;
  barber_id: string | null;
  service_name: string | null;
  client_name: string | null;
  phone: string | null;
  value: number;
  commission: number;
  payment_method: string | null;
  discount_pct: number | null;
  category_id: string | null;
  product_id: string | null;
  description: string | null;
  created_at: string;
}

export interface Block {
  id: string;
  tenant_id: string;
  barber_id: string | null; // null = todos os barbeiros
  date: string;
  all_day: boolean;
  start_time: string | null;
  end_time: string | null;
  reason_id: string;
  reason_label: string;
  note: string;
  created_at: string;
}

export interface PlanSignup {
  id: string;
  tenant_id: string;
  plan_id: string;
  client_name: string;
  phone: string;
  payment_method: string;
  status: "pendente" | "aprovado" | "descartado";
  created_at: string;
}

export const BLOCK_REASONS = [
  { id: "almoco", label: "Almoço", allDay: false },
  { id: "reuniao", label: "Reunião", allDay: false },
  { id: "ferias", label: "Férias", allDay: true },
  { id: "folga", label: "Folga", allDay: true },
  { id: "outro", label: "Outro", allDay: false },
] as const;

export const PAYMENT_METHODS = [
  { id: "pix", label: "PIX" },
  { id: "dinheiro", label: "Dinheiro" },
  { id: "debito", label: "Débito" },
  { id: "credito", label: "Crédito" },
] as const;

export const INCOME_CATEGORIES = [
  { id: "produto", label: "Venda de produtos" },
  { id: "outro", label: "Outra entrada" },
] as const;

export const EXPENSE_CATEGORIES = [
  { id: "aluguel", label: "Aluguel" },
  { id: "agua", label: "Água" },
  { id: "energia", label: "Energia" },
  { id: "salarios", label: "Salários" },
  { id: "outro", label: "Outra saída" },
] as const;
