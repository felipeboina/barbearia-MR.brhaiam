-- ============================================================================
-- Senha extra (opcional) pra proteger a aba Financeiro & Gráficos dentro do
-- painel admin já autenticado. Fica null por padrão (proteção desligada).
-- Nunca é exposta pro client: getTheTenant() em src/lib/current-tenant.ts
-- remove essa coluna do objeto antes de devolver o tenant; as actions em
-- src/lib/actions/admin.ts (hasFinancialPin/checkFinancialPin/
-- setFinancialPin) fazem sua própria query direta nessa coluna e só
-- devolvem boolean/void pro client, nunca o valor da senha em si.
-- ============================================================================

alter table public.tenants add column if not exists financial_pin text;
