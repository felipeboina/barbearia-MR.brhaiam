-- ============================================================================
-- Sistema de Barbearia SaaS — schema inicial multi-tenant
-- Rode este script inteiro no SQL Editor do seu projeto Supabase
-- (Project > SQL Editor > New query > cole tudo > Run).
-- ============================================================================

create extension if not exists "pgcrypto";

-- ----------------------------------------------------------------------------
-- TENANTS (cada barbearia é um tenant; config da loja mora direto aqui,
-- já que é 1:1 com o tenant — evita um join extra em toda query)
-- ----------------------------------------------------------------------------
create table public.tenants (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  shop_name text not null default 'Minha Barbearia',
  owner_user_id uuid references auth.users(id) on delete set null,

  -- assinatura do SaaS (cobrança do dono do sistema pro barbeiro)
  subscription_status text not null default 'trial'
    check (subscription_status in ('trial', 'active', 'canceled')),
  trial_ends_at timestamptz not null default (now() + interval '14 days'),

  -- config operacional da loja (equivalente ao "config" do protótipo)
  open_hour int not null default 9,
  close_hour int not null default 19,
  slot_min int not null default 30,
  reminder_hours int not null default 2,
  birthday_discount int not null default 15,
  no_show_threshold int not null default 2,
  pix_key text not null default '',
  pix_city text not null default 'SAO PAULO',
  shop_whatsapp text not null default '',
  address text not null default '',
  work_days int[] not null default '{1,2,3,4,5,6}',
  inactive_days int not null default 30,
  inactive_discount int not null default 10,
  loyalty_goal int not null default 10,
  loyalty_reward text not null default 'Corte grátis',
  referral_discount int not null default 10,
  plans_enabled boolean not null default true,
  early_reminder_days int not null default 18,
  plan_expiry_reminder_days int not null default 3,

  created_at timestamptz not null default now()
);

create index tenants_slug_idx on public.tenants (slug);

-- slug: minúsculas, números e hífen, 3-63 chars, sem hífen nas pontas
alter table public.tenants
  add constraint tenants_slug_format check (slug ~ '^[a-z0-9]([a-z0-9-]{1,61}[a-z0-9])?$');

-- ----------------------------------------------------------------------------
-- PROFILES (liga auth.users -> tenant; hoje só role 'owner', mas já deixa
-- espaço pra convidar outros barbeiros como usuários no futuro)
-- ----------------------------------------------------------------------------
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  role text not null default 'owner' check (role in ('owner', 'staff')),
  created_at timestamptz not null default now()
);

create index profiles_tenant_id_idx on public.profiles (tenant_id);

-- ----------------------------------------------------------------------------
-- BARBERS
-- ----------------------------------------------------------------------------
create table public.barbers (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  name text not null,
  commission numeric not null default 0,
  created_at timestamptz not null default now()
);

create index barbers_tenant_id_idx on public.barbers (tenant_id);

-- ----------------------------------------------------------------------------
-- SERVICES
-- ----------------------------------------------------------------------------
create table public.services (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  name text not null,
  price numeric not null default 0,
  duration int not null default 30,
  created_at timestamptz not null default now()
);

create index services_tenant_id_idx on public.services (tenant_id);

-- ----------------------------------------------------------------------------
-- PRODUCTS
-- ----------------------------------------------------------------------------
create table public.products (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  name text not null,
  stock int not null default 0,
  min_stock int not null default 5,
  price numeric not null default 0,
  created_at timestamptz not null default now()
);

create index products_tenant_id_idx on public.products (tenant_id);

-- ----------------------------------------------------------------------------
-- PLANS
-- ----------------------------------------------------------------------------
create table public.plans (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  name text not null,
  price numeric not null default 0,
  period text not null default 'mês',
  period_days int not null default 30,
  cuts_included int not null default 1,
  benefits text[] not null default '{}',
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create index plans_tenant_id_idx on public.plans (tenant_id);

-- ----------------------------------------------------------------------------
-- CLIENTS (tabela própria em vez do dicionário por telefone do protótipo;
-- telefone único por tenant, não é mais a chave primária)
-- ----------------------------------------------------------------------------
create table public.clients (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  phone text not null,
  name text not null,
  birthday date,
  visits int not null default 0,
  total_spent numeric not null default 0,
  last_visit date,
  no_shows int not null default 0,
  points int not null default 0,
  referral_credits int not null default 0,
  referrals_count int not null default 0,

  -- assinatura de plano ativa (equivalente ao client.plan do protótipo)
  plan_id uuid references public.plans(id) on delete set null,
  plan_start_date date,
  plan_cuts_used int not null default 0,

  -- dedup de notificações (mensagens automáticas)
  birthday_msg_year int,
  winback_sent_for date,
  early_nudge_sent_for date,

  created_at timestamptz not null default now(),
  unique (tenant_id, phone)
);

create index clients_tenant_id_idx on public.clients (tenant_id);
create index clients_tenant_phone_idx on public.clients (tenant_id, phone);

-- ----------------------------------------------------------------------------
-- APPOINTMENTS
-- ----------------------------------------------------------------------------
create table public.appointments (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  client_id uuid references public.clients(id) on delete set null,
  client_name text not null,
  phone text not null,
  birthday date,
  barber_id uuid not null references public.barbers(id) on delete cascade,
  service_id uuid not null references public.services(id) on delete cascade,
  date date not null,
  time time not null,
  duration_min int not null,
  status text not null default 'agendado'
    check (status in ('agendado', 'concluido', 'cancelado', 'falta')),
  confirmed boolean not null default false,

  -- carrinho de produtos adicionado no agendamento (snapshot de preço/nome
  -- no momento da escolha, igual ao protótipo)
  products jsonb not null default '[]',
  addons_total numeric not null default 0,
  total_value numeric not null default 0,

  payment_preference text check (payment_preference in ('pix', 'local')),
  client_claims_paid boolean not null default false,
  referred_by_phone text,

  -- preenchido só na conclusão do atendimento
  payment_method text,
  discount_pct numeric,
  discount_reason text,

  created_at timestamptz not null default now()
);

create index appointments_tenant_date_idx on public.appointments (tenant_id, date);
create index appointments_tenant_barber_date_idx on public.appointments (tenant_id, barber_id, date);
create index appointments_tenant_phone_idx on public.appointments (tenant_id, phone);

-- ----------------------------------------------------------------------------
-- TRANSACTIONS (financeiro: serviço concluído, entrada manual/produto, despesa)
-- ----------------------------------------------------------------------------
create table public.transactions (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  date date not null,
  type text not null check (type in ('servico', 'entrada', 'despesa')),
  appt_id uuid references public.appointments(id) on delete set null,
  barber_id uuid references public.barbers(id) on delete set null,
  service_name text,
  client_name text,
  phone text,
  value numeric not null,
  commission numeric not null default 0,
  payment_method text,
  discount_pct numeric,
  category_id text,
  product_id uuid references public.products(id) on delete set null,
  description text,
  created_at timestamptz not null default now()
);

create index transactions_tenant_date_idx on public.transactions (tenant_id, date);
create index transactions_tenant_type_idx on public.transactions (tenant_id, type);

-- ----------------------------------------------------------------------------
-- BLOCKS (bloqueios de horário: almoço, reunião, férias, folga...)
-- ----------------------------------------------------------------------------
create table public.blocks (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  barber_id uuid references public.barbers(id) on delete cascade, -- null = todos
  date date not null,
  all_day boolean not null default false,
  start_time time,
  end_time time,
  reason_id text not null,
  reason_label text not null,
  note text not null default '',
  created_at timestamptz not null default now()
);

create index blocks_tenant_date_idx on public.blocks (tenant_id, date);

-- ----------------------------------------------------------------------------
-- PLAN_SIGNUPS (solicitações pendentes de assinatura de plano)
-- ----------------------------------------------------------------------------
create table public.plan_signups (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  plan_id uuid not null references public.plans(id) on delete cascade,
  client_name text not null,
  phone text not null,
  payment_method text not null,
  status text not null default 'pendente' check (status in ('pendente', 'aprovado', 'descartado')),
  created_at timestamptz not null default now()
);

create index plan_signups_tenant_id_idx on public.plan_signups (tenant_id);

-- ============================================================================
-- ROW LEVEL SECURITY
--
-- Estratégia: o dashboard autenticado (dono da barbearia logado) acessa via
-- RLS, sempre restrito ao próprio tenant_id (nunca cross-tenant). A área
-- pública de agendamento (anônima, por subdomínio) NUNCA acessa o Postgres
-- diretamente — passa sempre por Route Handlers do Next.js no servidor, que
-- usam a service role key (bypassa RLS) e filtram tenant_id explicitamente
-- a partir do subdomínio resolvido no servidor. Ou seja: RLS protege o
-- caminho autenticado; os Route Handlers protegem e validam o caminho público.
-- Isso garante isolamento real no banco, nunca só no frontend.
-- ============================================================================

alter table public.tenants enable row level security;
alter table public.profiles enable row level security;
alter table public.barbers enable row level security;
alter table public.services enable row level security;
alter table public.products enable row level security;
alter table public.plans enable row level security;
alter table public.clients enable row level security;
alter table public.appointments enable row level security;
alter table public.transactions enable row level security;
alter table public.blocks enable row level security;
alter table public.plan_signups enable row level security;

-- helper: tenant do usuário autenticado (security definer pra poder ler
-- profiles mesmo com RLS de profiles restringindo a linha do próprio usuário)
create or replace function public.auth_tenant_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select tenant_id from public.profiles where id = auth.uid()
$$;

-- tenants: dono só vê/edita a própria barbearia
create policy "tenant: select own" on public.tenants
  for select using (id = public.auth_tenant_id());
create policy "tenant: update own" on public.tenants
  for update using (id = public.auth_tenant_id());

-- profiles: usuário só vê o próprio perfil
create policy "profiles: select own" on public.profiles
  for select using (id = auth.uid());

-- helper genérico pras tabelas com tenant_id: policy única cobrindo todas
-- as operações (select/insert/update/delete), sempre restrita ao próprio tenant
create policy "barbers: tenant isolation" on public.barbers
  for all using (tenant_id = public.auth_tenant_id()) with check (tenant_id = public.auth_tenant_id());

create policy "services: tenant isolation" on public.services
  for all using (tenant_id = public.auth_tenant_id()) with check (tenant_id = public.auth_tenant_id());

create policy "products: tenant isolation" on public.products
  for all using (tenant_id = public.auth_tenant_id()) with check (tenant_id = public.auth_tenant_id());

create policy "plans: tenant isolation" on public.plans
  for all using (tenant_id = public.auth_tenant_id()) with check (tenant_id = public.auth_tenant_id());

create policy "clients: tenant isolation" on public.clients
  for all using (tenant_id = public.auth_tenant_id()) with check (tenant_id = public.auth_tenant_id());

create policy "appointments: tenant isolation" on public.appointments
  for all using (tenant_id = public.auth_tenant_id()) with check (tenant_id = public.auth_tenant_id());

create policy "transactions: tenant isolation" on public.transactions
  for all using (tenant_id = public.auth_tenant_id()) with check (tenant_id = public.auth_tenant_id());

create policy "blocks: tenant isolation" on public.blocks
  for all using (tenant_id = public.auth_tenant_id()) with check (tenant_id = public.auth_tenant_id());

create policy "plan_signups: tenant isolation" on public.plan_signups
  for all using (tenant_id = public.auth_tenant_id()) with check (tenant_id = public.auth_tenant_id());

-- ============================================================================
-- ONBOARDING AUTOMÁTICO: ao criar um usuário (auth.users) com metadata
-- {subdomain, shop_name}, cria o tenant + profile + serviços de exemplo
-- automaticamente, dentro da mesma transação (se o subdomínio já existir,
-- a constraint unique falha e o cadastro inteiro é revertido).
-- ============================================================================
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  new_tenant_id uuid;
  meta jsonb := new.raw_user_meta_data;
  chosen_slug text := meta ->> 'subdomain';
begin
  if chosen_slug is null or chosen_slug = '' then
    return new; -- signup sem metadata de tenant (não deveria acontecer no fluxo normal)
  end if;

  insert into public.tenants (slug, shop_name, owner_user_id)
  values (chosen_slug, coalesce(meta ->> 'shop_name', 'Minha Barbearia'), new.id)
  returning id into new_tenant_id;

  insert into public.profiles (id, tenant_id, role)
  values (new.id, new_tenant_id, 'owner');

  insert into public.barbers (tenant_id, name, commission) values
    (new_tenant_id, 'Barbeiro 1', 40);

  insert into public.services (tenant_id, name, price, duration) values
    (new_tenant_id, 'Corte Masculino', 45, 30),
    (new_tenant_id, 'Barba', 30, 20),
    (new_tenant_id, 'Corte + Barba', 65, 50),
    (new_tenant_id, 'Sobrancelha', 15, 10);

  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ============================================================================
-- Função utilitária para checar disponibilidade de subdomínio a partir do
-- app (evita expor a tabela tenants inteira pra checagem anônima de slug).
-- ============================================================================
create or replace function public.is_slug_available(check_slug text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select not exists (select 1 from public.tenants where slug = check_slug)
$$;

grant execute on function public.is_slug_available(text) to anon, authenticated;
