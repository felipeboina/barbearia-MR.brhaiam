-- ============================================================================
-- Ordem manual dos serviços (public.services.sort_order). Antes disso, tanto
-- a agenda pública quanto a tela de Configurações listavam os serviços em
-- ordem alfabética fixa — o dono quer escolher a ordem (ex.: Cabelo, Barba,
-- Sobrancelha, Pezinho, Bigode primeiro, resto depois).
-- ============================================================================

alter table public.services add column sort_order integer not null default 0;

-- Seed inicial: aplica a ordem pedida pelo dono pros serviços que já
-- existem hoje (Cabelo/Corte, Barba, Sobrancelha, Pezinho, Bigode primeiro,
-- resto em ordem alfabética) — só o ponto de partida, dá pra reordenar
-- livremente depois pela tela de Configurações.
with ordered as (
  select
    id,
    row_number() over (
      order by
        case lower(name)
          when 'cabelo' then 0
          when 'corte masculino' then 0
          when 'corte' then 0
          when 'barba' then 1
          when 'sobrancelha' then 2
          when 'sombrancelha' then 2
          when 'pezinho' then 3
          when 'bigode' then 4
          else 100
        end,
        name
    ) as rn
  from public.services
)
update public.services s
set sort_order = ordered.rn
from ordered
where ordered.id = s.id;
