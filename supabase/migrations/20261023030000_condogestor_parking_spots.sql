begin;

alter table public.unidades
  add column if not exists vagas_estacionamento text[] not null default '{}'::text[];

comment on column public.unidades.vagas_estacionamento is
  'Identificações das vagas de estacionamento vinculadas ao apartamento.';

commit;
