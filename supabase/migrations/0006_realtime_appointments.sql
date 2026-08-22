-- ============================================================================
-- Liga o Realtime do Supabase pra tabela de agendamentos. Sem isso, o
-- Postgres nunca transmite as mudanças pelo websocket, mesmo que o client
-- esteja "escutando" — a tabela precisa estar explicitamente na publicação
-- supabase_realtime. Painel admin escuta essa tabela (filtrado pelo
-- tenant_id da própria barbearia) pra atualizar sozinho assim que um
-- cliente agenda, confirma ou cancela um horário pela área pública.
-- ============================================================================

alter publication supabase_realtime add table public.appointments;
