begin;

-- Mantém somente um método ativo por condomínio. Registros antigos ficam
-- preservados, mas os excedentes são desativados para não perder histórico.
with ranked as (
  select id, row_number() over (
    partition by condominio_id
    order by updated_at desc nulls last, created_at desc nulls last, id
  ) as position
  from public.meios_pagamento_condominio
  where ativo
)
update public.meios_pagamento_condominio m
set ativo = false, updated_at = now()
from ranked r
where r.id = m.id and r.position > 1;

create unique index if not exists meios_pagamento_um_ativo_por_condominio
  on public.meios_pagamento_condominio (condominio_id)
  where ativo;

-- O Access Token nunca pode ser lido pelo cliente. O conteúdo é criptografado
-- pela Edge Function antes de chegar a esta tabela.
create table if not exists public.mercadopago_credenciais (
  condominio_id uuid primary key references public.condominios(id) on delete cascade,
  access_token_cifrado text not null,
  public_key text not null,
  pix_ativo boolean not null default true,
  cartao_ativo boolean not null default true,
  boleto_ativo boolean not null default true,
  updated_by uuid references auth.users(id) on delete set null,
  updated_at timestamptz not null default now(),
  check (pix_ativo or cartao_ativo or boleto_ativo)
);

alter table public.mercadopago_credenciais enable row level security;
revoke all on public.mercadopago_credenciais from public, anon, authenticated;
grant all on public.mercadopago_credenciais to service_role;
comment on table public.mercadopago_credenciais is
  'Credenciais Mercado Pago cifradas e acessíveis somente pelo backend de Edge Functions.';

commit;
