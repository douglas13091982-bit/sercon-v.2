-- Extensões aditivas para persistir os módulos do CondoGestor.
-- As tabelas base (condominios, blocos, unidades, moradores, cobranças,
-- leituras, comunicados, chamados, visitantes e encomendas) já existem.
-- Nenhum dado existente é apagado ou reescrito por esta migração.

begin;

-- Configuração financeira por competência: preserva valores históricos de água/gás.
create table if not exists public.financeiro_competencias (
  condominio_id uuid not null references public.condominios(id) on delete cascade,
  competencia date not null check (extract(day from competencia) = 1),
  conta_agua numeric(12,2) not null default 0 check (conta_agua >= 0),
  tarifa_gas_m3 numeric(12,4) not null default 0 check (tarifa_gas_m3 >= 0),
  modo_rateio_agua text not null default 'consumo'
    check (modo_rateio_agua in ('consumo', 'igual')),
  incluir_aluguel_na_cobranca boolean not null default false,
  updated_by uuid references auth.users(id) on delete set null,
  updated_at timestamptz not null default now(),
  primary key (condominio_id, competencia)
);

-- Definições de taxas extraordinárias configuráveis pelo síndico.
create table if not exists public.taxas_adicionais (
  id uuid primary key default gen_random_uuid(),
  condominio_id uuid not null references public.condominios(id) on delete cascade,
  nome text not null check (length(trim(nome)) between 1 and 120),
  valor numeric(12,2) not null check (valor > 0),
  modo text not null default 'fixa' check (modo in ('fixa', 'rateio')),
  aplica_a text not null default 'todas'
    check (aplica_a in ('todas', 'ocupadas', 'selecionadas')),
  inicio date not null check (extract(day from inicio) = 1),
  fim date check (fim is null or (extract(day from fim) = 1 and fim >= inicio)),
  ativa boolean not null default true,
  criado_por uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  unique (id, condominio_id)
);

create table if not exists public.taxas_adicionais_unidades (
  condominio_id uuid not null,
  taxa_id uuid not null,
  unidade_id uuid not null,
  created_at timestamptz not null default now(),
  primary key (taxa_id, unidade_id),
  foreign key (taxa_id, condominio_id)
    references public.taxas_adicionais(id, condominio_id) on delete cascade,
  foreign key (unidade_id, condominio_id)
    references public.unidades(id, condominio_id) on delete cascade
);

create table if not exists public.cobrancas_taxas_adicionais (
  id uuid primary key default gen_random_uuid(),
  condominio_id uuid not null,
  unidade_id uuid not null,
  taxa_id uuid not null,
  competencia date not null check (extract(day from competencia) = 1),
  descricao text not null,
  valor numeric(12,2) not null check (valor >= 0),
  vencimento date not null,
  status text not null default 'pendente'
    check (status in ('pendente', 'pago', 'atrasado', 'cancelado')),
  created_at timestamptz not null default now(),
  unique (unidade_id, taxa_id, competencia),
  foreign key (unidade_id, condominio_id)
    references public.unidades(id, condominio_id) on delete cascade,
  foreign key (taxa_id, condominio_id)
    references public.taxas_adicionais(id, condominio_id) on delete restrict
);

-- Métodos exibidos aos moradores. Guardar somente dados públicos de pagamento;
-- Access Tokens e segredos do Mercado Pago devem ficar em Edge Function secrets.
create table if not exists public.meios_pagamento_condominio (
  id uuid primary key default gen_random_uuid(),
  condominio_id uuid not null references public.condominios(id) on delete cascade,
  nome text not null check (length(trim(nome)) between 1 and 100),
  tipo text not null check (tipo in ('pix', 'transferencia', 'dinheiro', 'mercadopago', 'outro')),
  dados_publicos jsonb not null default '{}'::jsonb
    check (jsonb_typeof(dados_publicos) = 'object'),
  instrucoes text,
  ativo boolean not null default true,
  ordem integer not null default 0,
  criado_por uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, condominio_id)
);

create table if not exists public.pagamentos_morador (
  id uuid primary key default gen_random_uuid(),
  condominio_id uuid not null,
  unidade_id uuid not null,
  morador_id uuid references public.moradores(id) on delete set null,
  user_id uuid not null default auth.uid() references auth.users(id) on delete restrict,
  competencia date not null check (extract(day from competencia) = 1),
  valor numeric(12,2) not null check (valor > 0),
  meio_pagamento_id uuid,
  meio_nome_snapshot text not null,
  status text not null default 'aguardando_conferencia'
    check (status in ('aguardando_conferencia', 'confirmado', 'recusado', 'cancelado')),
  referencia_externa text,
  informado_em timestamptz not null default now(),
  conferido_por uuid references auth.users(id) on delete set null,
  conferido_em timestamptz,
  observacao text,
  foreign key (unidade_id, condominio_id)
    references public.unidades(id, condominio_id) on delete cascade,
  foreign key (meio_pagamento_id, condominio_id)
    references public.meios_pagamento_condominio(id, condominio_id) on delete restrict
);

-- Despesas operacionais do condomínio (folha, consumo, manutenção e serviços).
create table if not exists public.despesas_condominio (
  id uuid primary key default gen_random_uuid(),
  condominio_id uuid not null references public.condominios(id) on delete cascade,
  descricao text not null check (length(trim(descricao)) between 1 and 240),
  categoria text not null default 'outros',
  valor numeric(12,2) not null check (valor > 0),
  data date not null default current_date,
  fornecedor text,
  documento_storage_path text,
  criado_por uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

-- Cadastro de veículos de moradores e histórico de veículos visitantes/prestadores.
create table if not exists public.veiculos_condominio (
  id uuid primary key default gen_random_uuid(),
  condominio_id uuid not null,
  unidade_id uuid not null,
  morador_id uuid references public.moradores(id) on delete set null,
  placa text not null check (length(regexp_replace(upper(placa), '[^A-Z0-9]', '', 'g')) between 7 and 8),
  modelo text not null,
  cor text,
  tipo text not null default 'morador' check (tipo in ('morador', 'visitante', 'prestador')),
  vaga text,
  entrada_em timestamptz,
  saida_em timestamptz,
  criado_por uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  foreign key (unidade_id, condominio_id)
    references public.unidades(id, condominio_id) on delete cascade,
  unique (condominio_id, placa, id)
);

create unique index if not exists veiculos_condominio_placa_ativa_idx
  on public.veiculos_condominio(condominio_id, upper(regexp_replace(placa, '[^A-Z0-9]', '', 'g')))
  where saida_em is null;

-- Registro de entrada e saída de prestadores com dados da empresa/serviço.
create table if not exists public.acessos_prestadores (
  id uuid primary key default gen_random_uuid(),
  condominio_id uuid not null,
  unidade_id uuid not null,
  nome text not null,
  documento text,
  empresa text,
  servico text not null,
  autorizado_por text,
  entrada_em timestamptz not null default now(),
  saida_em timestamptz,
  registrado_por uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  foreign key (unidade_id, condominio_id)
    references public.unidades(id, condominio_id) on delete cascade
);

-- Complementa as encomendas existentes sem alterar seus registros atuais.
alter table public.encomendas
  add column if not exists transportadora text,
  add column if not exists avisado_em timestamptz;

create index if not exists financeiro_competencias_condominio_idx
  on public.financeiro_competencias(condominio_id, competencia desc);
create index if not exists taxas_adicionais_condominio_vigencia_idx
  on public.taxas_adicionais(condominio_id, inicio, fim) where ativa;
create index if not exists cobrancas_taxas_unidade_competencia_idx
  on public.cobrancas_taxas_adicionais(condominio_id, unidade_id, competencia desc);
create index if not exists pagamentos_morador_unidade_competencia_idx
  on public.pagamentos_morador(condominio_id, unidade_id, competencia desc);
create index if not exists despesas_condominio_data_idx
  on public.despesas_condominio(condominio_id, data desc);
create index if not exists veiculos_condominio_unidade_idx
  on public.veiculos_condominio(condominio_id, unidade_id);
create index if not exists acessos_prestadores_abertos_idx
  on public.acessos_prestadores(condominio_id, entrada_em desc) where saida_em is null;

alter table public.financeiro_competencias enable row level security;
alter table public.taxas_adicionais enable row level security;
alter table public.taxas_adicionais_unidades enable row level security;
alter table public.cobrancas_taxas_adicionais enable row level security;
alter table public.meios_pagamento_condominio enable row level security;
alter table public.pagamentos_morador enable row level security;
alter table public.despesas_condominio enable row level security;
alter table public.veiculos_condominio enable row level security;
alter table public.acessos_prestadores enable row level security;

drop policy if exists cg_financeiro_competencias_select on public.financeiro_competencias;
create policy cg_financeiro_competencias_select on public.financeiro_competencias
  for select to authenticated using (
    public.has_role(auth.uid(), 'super_admin') or
    (condominio_id = public.current_condominio_id() and public.has_role(auth.uid(), 'sindico'))
  );
drop policy if exists cg_financeiro_competencias_write on public.financeiro_competencias;
create policy cg_financeiro_competencias_write on public.financeiro_competencias
  for all to authenticated using (
    public.has_role(auth.uid(), 'super_admin') or
    (condominio_id = public.current_condominio_id() and public.has_role(auth.uid(), 'sindico'))
  ) with check (
    public.has_role(auth.uid(), 'super_admin') or
    (condominio_id = public.current_condominio_id() and public.has_role(auth.uid(), 'sindico'))
  );

drop policy if exists cg_taxas_adicionais_select on public.taxas_adicionais;
create policy cg_taxas_adicionais_select on public.taxas_adicionais
  for select to authenticated using (
    public.has_role(auth.uid(), 'super_admin') or
    (condominio_id = public.current_condominio_id() and public.has_role(auth.uid(), 'sindico'))
  );
drop policy if exists cg_taxas_adicionais_write on public.taxas_adicionais;
create policy cg_taxas_adicionais_write on public.taxas_adicionais
  for all to authenticated using (
    public.has_role(auth.uid(), 'super_admin') or
    (condominio_id = public.current_condominio_id() and public.has_role(auth.uid(), 'sindico'))
  ) with check (
    public.has_role(auth.uid(), 'super_admin') or
    (condominio_id = public.current_condominio_id() and public.has_role(auth.uid(), 'sindico'))
  );

drop policy if exists cg_taxas_adicionais_unidades_all on public.taxas_adicionais_unidades;
create policy cg_taxas_adicionais_unidades_all on public.taxas_adicionais_unidades
  for all to authenticated using (
    public.has_role(auth.uid(), 'super_admin') or
    (condominio_id = public.current_condominio_id() and public.has_role(auth.uid(), 'sindico'))
  ) with check (
    public.has_role(auth.uid(), 'super_admin') or
    (condominio_id = public.current_condominio_id() and public.has_role(auth.uid(), 'sindico'))
  );

drop policy if exists cg_cobrancas_taxas_select on public.cobrancas_taxas_adicionais;
create policy cg_cobrancas_taxas_select on public.cobrancas_taxas_adicionais
  for select to authenticated using (
    public.has_role(auth.uid(), 'super_admin') or
    (condominio_id = public.current_condominio_id() and (
      public.has_role(auth.uid(), 'sindico') or exists (
        select 1 from public.moradores m
        where m.condominio_id = cobrancas_taxas_adicionais.condominio_id
          and m.unidade_id = cobrancas_taxas_adicionais.unidade_id
          and m.user_id = auth.uid()
      )
    ))
  );
drop policy if exists cg_cobrancas_taxas_write on public.cobrancas_taxas_adicionais;
create policy cg_cobrancas_taxas_write on public.cobrancas_taxas_adicionais
  for all to authenticated using (
    public.has_role(auth.uid(), 'super_admin') or
    (condominio_id = public.current_condominio_id() and public.has_role(auth.uid(), 'sindico'))
  ) with check (
    public.has_role(auth.uid(), 'super_admin') or
    (condominio_id = public.current_condominio_id() and public.has_role(auth.uid(), 'sindico'))
  );

drop policy if exists cg_meios_pagamento_select on public.meios_pagamento_condominio;
create policy cg_meios_pagamento_select on public.meios_pagamento_condominio
  for select to authenticated using (
    public.has_role(auth.uid(), 'super_admin') or condominio_id = public.current_condominio_id()
  );
drop policy if exists cg_meios_pagamento_write on public.meios_pagamento_condominio;
create policy cg_meios_pagamento_write on public.meios_pagamento_condominio
  for all to authenticated using (
    public.has_role(auth.uid(), 'super_admin') or
    (condominio_id = public.current_condominio_id() and public.has_role(auth.uid(), 'sindico'))
  ) with check (
    public.has_role(auth.uid(), 'super_admin') or
    (condominio_id = public.current_condominio_id() and public.has_role(auth.uid(), 'sindico'))
  );

drop policy if exists cg_pagamentos_select on public.pagamentos_morador;
create policy cg_pagamentos_select on public.pagamentos_morador
  for select to authenticated using (
    public.has_role(auth.uid(), 'super_admin') or
    (condominio_id = public.current_condominio_id() and (
      public.has_role(auth.uid(), 'sindico') or user_id = auth.uid()
    ))
  );
drop policy if exists cg_pagamentos_insert on public.pagamentos_morador;
create policy cg_pagamentos_insert on public.pagamentos_morador
  for insert to authenticated with check (
    user_id = auth.uid() and status = 'aguardando_conferencia' and
    condominio_id = public.current_condominio_id() and exists (
      select 1 from public.moradores m
      where m.id = pagamentos_morador.morador_id
        and m.user_id = auth.uid()
        and m.unidade_id = pagamentos_morador.unidade_id
        and m.condominio_id = pagamentos_morador.condominio_id
    )
  );
drop policy if exists cg_pagamentos_sindico_update on public.pagamentos_morador;
create policy cg_pagamentos_sindico_update on public.pagamentos_morador
  for update to authenticated using (
    public.has_role(auth.uid(), 'super_admin') or
    (condominio_id = public.current_condominio_id() and public.has_role(auth.uid(), 'sindico'))
  ) with check (
    public.has_role(auth.uid(), 'super_admin') or
    (condominio_id = public.current_condominio_id() and public.has_role(auth.uid(), 'sindico'))
  );

drop policy if exists cg_despesas_all on public.despesas_condominio;
create policy cg_despesas_all on public.despesas_condominio
  for all to authenticated using (
    public.has_role(auth.uid(), 'super_admin') or
    (condominio_id = public.current_condominio_id() and public.has_role(auth.uid(), 'sindico'))
  ) with check (
    public.has_role(auth.uid(), 'super_admin') or
    (condominio_id = public.current_condominio_id() and public.has_role(auth.uid(), 'sindico'))
  );

drop policy if exists cg_veiculos_select on public.veiculos_condominio;
create policy cg_veiculos_select on public.veiculos_condominio
  for select to authenticated using (
    public.has_role(auth.uid(), 'super_admin') or
    (condominio_id = public.current_condominio_id() and (
      public.has_role(auth.uid(), 'sindico') or public.has_role(auth.uid(), 'porteiro') or exists (
        select 1 from public.moradores m
        where m.condominio_id = veiculos_condominio.condominio_id
          and m.unidade_id = veiculos_condominio.unidade_id
          and m.user_id = auth.uid()
      )
    ))
  );
drop policy if exists cg_veiculos_write on public.veiculos_condominio;
create policy cg_veiculos_write on public.veiculos_condominio
  for all to authenticated using (
    public.has_role(auth.uid(), 'super_admin') or
    (condominio_id = public.current_condominio_id() and (
      public.has_role(auth.uid(), 'sindico') or public.has_role(auth.uid(), 'porteiro') or exists (
        select 1 from public.moradores m
        where m.condominio_id = veiculos_condominio.condominio_id
          and m.unidade_id = veiculos_condominio.unidade_id
          and m.user_id = auth.uid()
      )
    ))
  ) with check (
    public.has_role(auth.uid(), 'super_admin') or
    (condominio_id = public.current_condominio_id() and (
      public.has_role(auth.uid(), 'sindico') or public.has_role(auth.uid(), 'porteiro') or exists (
        select 1 from public.moradores m
        where m.condominio_id = veiculos_condominio.condominio_id
          and m.unidade_id = veiculos_condominio.unidade_id
          and m.user_id = auth.uid()
      )
    ))
  );

drop policy if exists cg_prestadores_select on public.acessos_prestadores;
create policy cg_prestadores_select on public.acessos_prestadores
  for select to authenticated using (
    public.has_role(auth.uid(), 'super_admin') or
    (condominio_id = public.current_condominio_id() and
      (public.has_role(auth.uid(), 'sindico') or public.has_role(auth.uid(), 'porteiro')))
  );
drop policy if exists cg_prestadores_write on public.acessos_prestadores;
create policy cg_prestadores_write on public.acessos_prestadores
  for all to authenticated using (
    public.has_role(auth.uid(), 'super_admin') or
    (condominio_id = public.current_condominio_id() and
      (public.has_role(auth.uid(), 'sindico') or public.has_role(auth.uid(), 'porteiro')))
  ) with check (
    public.has_role(auth.uid(), 'super_admin') or
    (condominio_id = public.current_condominio_id() and
      (public.has_role(auth.uid(), 'sindico') or public.has_role(auth.uid(), 'porteiro')))
  );

grant select, insert, update, delete on public.financeiro_competencias,
  public.taxas_adicionais, public.taxas_adicionais_unidades,
  public.cobrancas_taxas_adicionais, public.meios_pagamento_condominio,
  public.despesas_condominio, public.veiculos_condominio, public.acessos_prestadores
  to authenticated;
grant select, insert, update on public.pagamentos_morador to authenticated;
grant all on public.financeiro_competencias, public.taxas_adicionais,
  public.taxas_adicionais_unidades, public.cobrancas_taxas_adicionais,
  public.meios_pagamento_condominio, public.pagamentos_morador,
  public.despesas_condominio, public.veiculos_condominio, public.acessos_prestadores
  to service_role;

comment on table public.financeiro_competencias is
  'Valores de água e gás e regra de rateio por competência do CondoGestor.';
comment on table public.meios_pagamento_condominio is
  'Dados públicos dos meios de pagamento; não armazenar tokens ou segredos do gateway.';
comment on table public.pagamentos_morador is
  'Avisos de pagamento feitos pelo morador e confirmação pelo síndico.';

commit;
