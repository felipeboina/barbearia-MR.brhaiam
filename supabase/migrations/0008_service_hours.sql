-- ============================================================================
-- Horário próprio por serviço (public.services.start_hour/end_hour), no
-- mesmo molde do horário próprio já existente por barbeiro
-- (barbers.start_hour/end_hour, migração 0003). Deixa em branco (null) pra
-- usar o horário geral da loja. Exemplo de uso do dono: loja abre 10h e
-- fecha 21h, mas "Cabelo" só pode ser agendado das 19h às 21h — os demais
-- serviços continuam livres o dia todo.
-- ============================================================================

alter table public.services add column start_hour integer;
alter table public.services add column end_hour integer;
