-- Configuração das cobranças recorrentes e leituras individuais por unidade.
-- Os valores são cobrados por competência; editar a configuração não altera
-- lançamentos já gerados.

create table public.configuracoes_financeiras (
  condominio_id uuid primary key references public.condominios(id) on delete cascade,
  taxa_condominio numeric(12,2) not null default 0 check (taxa_condominio >= 0),
  vencimento_dia smallint not null default 10 check (vencimento_dia between 1 and 28),
  valor_m3_gas numeric(12,4) not null default 0 check (valor_m3_gas >= 0),
  agua_modo text not null default 'individual' check (agua_modo in ('individual', 'rateio')),
  valor_m3_agua numeric(12,4) not null default 0 check (valor_m3_agua >= 0),
  criterio_rateio_agua text not null default 'igual' check (criterio_rateio_agua in ('igual', 'fracao_ideal')),
  updated_at timestamptz not null default now()
);

alter table public.unidades
  add column aluguel_mensal numeric(12,2) check (aluguel_mensal is null or aluguel_mensal >= 0),
  add column gas_medidor text,
  add column agua_medidor text;

create table public.leituras_consumo (
  id uuid primary key default gen_random_uuid(),
  condominio_id uuid not null references public.condominios(id) on delete cascade,
  unidade_id uuid not null,
  tipo text not null check (tipo in ('gas', 'agua')),
  competencia date not null,
  leitura_anterior numeric(12,3) not null check (leitura_anterior >= 0),
  leitura_atual numeric(12,3) not null check (leitura_atual >= leitura_anterior),
  consumo numeric(12,3) generated always as (leitura_atual - leitura_anterior) stored,
  valor_unitario numeric(12,4) not null check (valor_unitario >= 0),
  valor_total numeric(12,2) generated always as (round((leitura_atual - leitura_anterior) * valor_unitario, 2)) stored,
  criado_por uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  unique (unidade_id, tipo, competencia),
  foreign key (unidade_id, condominio_id) references public.unidades(id, condominio_id) on delete cascade
);

create table public.cobrancas_unidade (
  id uuid primary key default gen_random_uuid(),
  condominio_id uuid not null references public.condominios(id) on delete cascade,
  unidade_id uuid not null,
  tipo text not null check (tipo in ('condominio', 'gas', 'agua')),
  descricao text not null,
  competencia date not null,
  valor numeric(12,2) not null check (valor >= 0),
  vencimento date not null,
  status text not null default 'pendente' check (status in ('pendente', 'pago', 'atrasado')),
  leitura_id uuid references public.leituras_consumo(id) on delete set null,
  created_at timestamptz not null default now(),
  unique (unidade_id, tipo, competencia),
  foreign key (unidade_id, condominio_id) references public.unidades(id, condominio_id) on delete cascade
);

create index cobrancas_condominio_competencia_idx on public.cobrancas_unidade(condominio_id, competencia desc);
create index leituras_condominio_competencia_idx on public.leituras_consumo(condominio_id, competencia desc);

alter table public.configuracoes_financeiras enable row level security;
alter table public.leituras_consumo enable row level security;
alter table public.cobrancas_unidade enable row level security;

create policy financeiro_config_select on public.configuracoes_financeiras for select to authenticated
  using (condominio_id = public.current_condominio_id() or public.has_role(auth.uid(), 'super_admin'));
create policy financeiro_config_write on public.configuracoes_financeiras for all to authenticated
  using ((condominio_id = public.current_condominio_id() and public.has_role(auth.uid(), 'sindico')) or public.has_role(auth.uid(), 'super_admin'))
  with check ((condominio_id = public.current_condominio_id() and public.has_role(auth.uid(), 'sindico')) or public.has_role(auth.uid(), 'super_admin'));

create policy leituras_select on public.leituras_consumo for select to authenticated
  using (public.has_role(auth.uid(), 'super_admin') or (condominio_id = public.current_condominio_id() and public.has_role(auth.uid(), 'sindico')));
create policy leituras_write on public.leituras_consumo for all to authenticated
  using ((condominio_id = public.current_condominio_id() and public.has_role(auth.uid(), 'sindico')) or public.has_role(auth.uid(), 'super_admin'))
  with check ((condominio_id = public.current_condominio_id() and public.has_role(auth.uid(), 'sindico')) or public.has_role(auth.uid(), 'super_admin'));

create policy cobrancas_select on public.cobrancas_unidade for select to authenticated
  using (public.has_role(auth.uid(), 'super_admin') or
    (condominio_id = public.current_condominio_id() and
      (public.has_role(auth.uid(), 'sindico') or exists (
        select 1 from public.moradores m where m.unidade_id = cobrancas_unidade.unidade_id and m.user_id = auth.uid()
      ))));
create policy cobrancas_write on public.cobrancas_unidade for all to authenticated
  using ((condominio_id = public.current_condominio_id() and public.has_role(auth.uid(), 'sindico')) or public.has_role(auth.uid(), 'super_admin'))
  with check ((condominio_id = public.current_condominio_id() and public.has_role(auth.uid(), 'sindico')) or public.has_role(auth.uid(), 'super_admin'));

grant select, insert, update, delete on public.configuracoes_financeiras, public.leituras_consumo, public.cobrancas_unidade to authenticated;
grant all on public.configuracoes_financeiras, public.leituras_consumo, public.cobrancas_unidade to service_role;
grant select, insert, update on public.unidades to authenticated;
grant update (aluguel_mensal, gas_medidor, agua_medidor) on public.unidades to authenticated;

create trigger auditar_configuracoes_financeiras after insert or update or delete on public.configuracoes_financeiras for each row execute function public.registrar_auditoria();
create trigger auditar_leituras_consumo after insert or update or delete on public.leituras_consumo for each row execute function public.registrar_auditoria();
create trigger auditar_cobrancas_unidade after insert or update or delete on public.cobrancas_unidade for each row execute function public.registrar_auditoria();

-- Ao configurar a taxa ou cadastrar/vincular um inquilino, inclui a cobrança
-- da competência atual automaticamente. A geração dos meses seguintes pode
-- ser iniciada pelo síndico no Financeiro e é idempotente.
create function public.aplicar_taxa_condominial_atual(_condominio_id uuid, _unidade_id uuid)
returns void language plpgsql security definer set search_path = public as $$
declare cfg public.configuracoes_financeiras;
begin
  select * into cfg from public.configuracoes_financeiras where condominio_id = _condominio_id;
  if not found or cfg.taxa_condominio <= 0 then return; end if;
  if not exists (select 1 from public.unidades where id = _unidade_id and condominio_id = _condominio_id and status = 'ocupado') then return; end if;
  insert into public.cobrancas_unidade(condominio_id, unidade_id, tipo, descricao, competencia, valor, vencimento)
  values (_condominio_id, _unidade_id, 'condominio', 'Taxa condominial', date_trunc('month', (now() at time zone 'America/Sao_Paulo')::date)::date,
    cfg.taxa_condominio,
    make_date(extract(year from (now() at time zone 'America/Sao_Paulo'))::int, extract(month from (now() at time zone 'America/Sao_Paulo'))::int, cfg.vencimento_dia))
  on conflict (unidade_id, tipo, competencia) do nothing;
end $$;
revoke execute on function public.aplicar_taxa_condominial_atual(uuid, uuid) from public, anon, authenticated;

create function public.aplicar_taxa_ao_inquilino() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.tipo = 'inquilino' and new.unidade_id is not null then
    perform public.aplicar_taxa_condominial_atual(new.condominio_id, new.unidade_id);
  end if;
  return new;
end $$;
revoke execute on function public.aplicar_taxa_ao_inquilino() from public, anon, authenticated;
create trigger taxa_condominial_ao_cadastrar_inquilino after insert or update of tipo, unidade_id on public.moradores
  for each row execute function public.aplicar_taxa_ao_inquilino();

create function public.aplicar_taxa_ao_ocupar_unidade() returns trigger
language plpgsql security definer set search_path = public as $$
declare morador_unidade uuid;
begin
  if new.status = 'ocupado' then
    for morador_unidade in select distinct unidade_id from public.moradores
      where condominio_id = new.condominio_id and unidade_id = new.id and tipo = 'inquilino'
    loop
      perform public.aplicar_taxa_condominial_atual(new.condominio_id, morador_unidade);
    end loop;
  end if;
  return new;
end $$;
revoke execute on function public.aplicar_taxa_ao_ocupar_unidade() from public, anon, authenticated;
create trigger taxa_condominial_ao_ocupar_unidade after insert or update of status on public.unidades
  for each row execute function public.aplicar_taxa_ao_ocupar_unidade();

create function public.aplicar_taxa_ao_configurar_condominio() returns trigger
language plpgsql security definer set search_path = public as $$
declare unidade uuid;
begin
  if new.taxa_condominio <= 0 then return new; end if;
  for unidade in
    select distinct m.unidade_id from public.moradores m join public.unidades u on u.id = m.unidade_id
    where m.condominio_id = new.condominio_id and m.tipo = 'inquilino' and u.status = 'ocupado'
  loop
    perform public.aplicar_taxa_condominial_atual(new.condominio_id, unidade);
  end loop;
  return new;
end $$;
revoke execute on function public.aplicar_taxa_ao_configurar_condominio() from public, anon, authenticated;
create trigger taxa_condominial_ao_configurar after insert on public.configuracoes_financeiras
  for each row execute function public.aplicar_taxa_ao_configurar_condominio();
