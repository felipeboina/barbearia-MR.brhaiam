-- ============================================================================
-- Dias em que o AGENDAMENTO ONLINE é aceito (public.tenants.booking_days),
-- separado de `work_days` (que é só o texto informativo "10h às 21h · Seg a
-- Sáb" mostrado na página pública — dias que a loja funciona). O dono pode
-- querer atender clientes sem hora marcada (avulso) num dia mesmo sem abrir
-- pro agendamento online nesse dia — por isso os dois campos são
-- independentes, um não implica o outro.
-- ============================================================================

alter table public.tenants add column booking_days int[] not null default '{1,2,3,4,5,6}';

-- Ponto de partida seguro: copia o valor atual de work_days pra não mudar
-- nada no comportamento de ninguém até o dono ajustar manualmente pela
-- tela de Configurações.
update public.tenants set booking_days = work_days;
