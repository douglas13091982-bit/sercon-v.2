begin;

create table if not exists public.portaria_configuracoes (
  condominio_id uuid primary key references public.condominios(id) on delete cascade,
  habilitada boolean not null default false,
  updated_by uuid references auth.users(id) on delete set null,
  updated_at timestamptz not null default now()
);

alter table public.portaria_configuracoes enable row level security;

drop policy if exists portaria_config_sindico_all on public.portaria_configuracoes;
create policy portaria_config_sindico_all on public.portaria_configuracoes
  for all to authenticated
  using (
    public.has_role(auth.uid(), 'super_admin') or
    (condominio_id = public.current_condominio_id() and public.has_role(auth.uid(), 'sindico'))
  )
  with check (
    public.has_role(auth.uid(), 'super_admin') or
    (condominio_id = public.current_condominio_id() and public.has_role(auth.uid(), 'sindico'))
  );

grant select, insert, update, delete on public.portaria_configuracoes to authenticated;
grant all on public.portaria_configuracoes to service_role;

create or replace function public.portaria_module_habilitado(_condominio_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1 from public.portaria_configuracoes pc
    where pc.condominio_id = _condominio_id and pc.habilitada
  );
$$;

revoke all on function public.portaria_module_habilitado(uuid) from public, anon;
grant execute on function public.portaria_module_habilitado(uuid) to authenticated, service_role;

-- Restrictive policies also gate any older permissive policies on these tables.
-- This prevents direct PostgREST access from bypassing the module toggle.
drop policy if exists portaria_module_gate on public.veiculos_condominio;
create policy portaria_module_gate on public.veiculos_condominio
  as restrictive for all to authenticated
  using (not public.has_role(auth.uid(), 'porteiro') or public.portaria_module_habilitado(public.current_condominio_id()))
  with check (not public.has_role(auth.uid(), 'porteiro') or public.portaria_module_habilitado(public.current_condominio_id()));

drop policy if exists portaria_module_gate on public.acessos_prestadores;
create policy portaria_module_gate on public.acessos_prestadores
  as restrictive for all to authenticated
  using (not public.has_role(auth.uid(), 'porteiro') or public.portaria_module_habilitado(public.current_condominio_id()))
  with check (not public.has_role(auth.uid(), 'porteiro') or public.portaria_module_habilitado(public.current_condominio_id()));

drop policy if exists portaria_module_gate on public.visitantes;
create policy portaria_module_gate on public.visitantes
  as restrictive for all to authenticated
  using (not public.has_role(auth.uid(), 'porteiro') or public.portaria_module_habilitado(public.current_condominio_id()))
  with check (not public.has_role(auth.uid(), 'porteiro') or public.portaria_module_habilitado(public.current_condominio_id()));

drop policy if exists portaria_module_gate on public.encomendas;
create policy portaria_module_gate on public.encomendas
  as restrictive for all to authenticated
  using (not public.has_role(auth.uid(), 'porteiro') or public.portaria_module_habilitado(public.current_condominio_id()))
  with check (not public.has_role(auth.uid(), 'porteiro') or public.portaria_module_habilitado(public.current_condominio_id()));

comment on table public.portaria_configuracoes is
  'Ativação do módulo Portaria por condomínio. Desabilitado por padrão.';

commit;
