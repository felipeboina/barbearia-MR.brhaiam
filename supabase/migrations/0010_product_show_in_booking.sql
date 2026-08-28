-- ============================================================================
-- Controla quais produtos aparecem pro cliente na etapa "Adicionar
-- produtos" do agendamento público (public.products.show_in_booking).
-- Default true — todo produto já cadastrado continua aparecendo até o
-- dono desmarcar algum manualmente pela tela de Estoque. Produtos de uso
-- interno (ex.: insumo que não se vende ao cliente) podem ficar escondidos
-- ali sem deixar de existir no controle de estoque.
-- ============================================================================

alter table public.products add column show_in_booking boolean not null default true;
