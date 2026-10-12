-- ============================================================================
-- Ajusta o fuso horário padrão do banco pra horário de Brasília
-- (America/Sao_Paulo, sempre UTC-3 — o Brasil não usa mais horário de
-- verão). Por padrão o Supabase roda em UTC; isso faz `current_date` e
-- `now()` dentro de funções SQL (ex.: complete_appointment, checagem de
-- plano vencido) baterem com o dia real no Brasil, em vez de virar o dia
-- três horas mais cedo (às 21h já seria "amanhã" em UTC). Mesmo bug corrigido
-- do lado do app em `todayStr()` (src/lib/business/format.ts).
-- ============================================================================

alter database postgres set timezone to 'America/Sao_Paulo';
