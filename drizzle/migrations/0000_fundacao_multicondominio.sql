-- Fundação multi-condomínio: papéis, perfis, condomínios, blocos, unidades, moradores + RLS

create type public.app_role as enum ('super_admin', 'sindico', 'porteiro', 'morador');

create table public.condominios (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  cnpj text,
  endereco text,
  telefone text,
  email text,
  created_at timestamptz not null default now()
);

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  nome text not null default '',
  email text not null default '',
  condominio_id uuid references public.condominios(id) on delete set null,
  created_at timestamptz not null default now()
);

create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  role public.app_role not null,
  unique (user_id, role)
);

create table public.blocos (
  id uuid primary key default gen_random_uuid(),
  condominio_id uuid not null references public.condominios(id) on delete cascade,
  nome text not null,
  created_at timestamptz not null default now(),
  unique (id, condominio_id),
  unique (condominio_id, nome)
);

create table public.unidades (
  id uuid primary key default gen_random_uuid(),
  condominio_id uuid not null references public.condominios(id) on delete cascade,
  bloco_id uuid not null,
  numero text not null,
  andar integer,
  metragem numeric(8,2),
  fracao_ideal numeric(6,3),
  status text not null default 'vago' check (status in ('ocupado', 'vago', 'venda')),
  created_at timestamptz not null default now(),
  unique (id, condominio_id),
  unique (bloco_id, numero),
  foreign key (bloco_id, condominio_id) references public.blocos (id, condominio_id) on delete cascade
);

create table public.moradores (
  id uuid primary key default gen_random_uuid(),
  condominio_id uuid not null references public.condominios(id) on delete cascade,
  user_id uuid references auth.users(id) on delete set null,
  nome text not null,
  cpf text,
  telefone text,
  email text,
  tipo text not null default 'proprietario' check (tipo in ('proprietario', 'inquilino', 'dependente')),
  unidade_id uuid,
  veiculos jsonb not null default '[]'::jsonb,
  pets jsonb not null default '[]'::jsonb,
  contrato jsonb,
  created_at timestamptz not null default now(),
  unique (condominio_id, cpf),
  foreign key (unidade_id, condominio_id) references public.unidades (id, condominio_id)
);

create index on public.moradores (condominio_id);
create index on public.moradores (user_id);
create index on public.unidades (condominio_id);
create index on public.blocos (condominio_id);
create index on public.profiles (condominio_id);

-- Funções auxiliares (security definer evita recursão de RLS)
create or replace function public.has_role(_user_id uuid, _role public.app_role)
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (select 1 from public.user_roles where user_id = _user_id and role = _role)
$$;

create or replace function public.current_condominio_id()
returns uuid
language sql stable security definer set search_path = public
as $$
  select condominio_id from public.profiles where id = auth.uid()
$$;

-- Novo usuário: cria perfil. Se informar condominio_nome, cria o condomínio e vira síndico.
-- Papel e condomínio nunca vêm do cliente, só o nome do novo condomínio.
create or replace function public.handle_new_user()
returns trigger
language plpgsql security definer set search_path = public
as $$
declare
  novo_condominio uuid;
  nome_cond text := nullif(btrim(new.raw_user_meta_data ->> 'condominio_nome'), '');
begin
  if nome_cond is not null then
    insert into public.condominios (nome) values (nome_cond) returning id into novo_condominio;
  end if;

  insert into public.profiles (id, nome, email, condominio_id)
  values (
    new.id,
    coalesce(nullif(btrim(new.raw_user_meta_data ->> 'nome'), ''), split_part(new.email, '@', 1)),
    coalesce(new.email, ''),
    novo_condominio
  );

  if novo_condominio is not null then
    insert into public.user_roles (user_id, role) values (new.id, 'sindico');
  end if;

  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

revoke execute on function public.handle_new_user() from public, anon, authenticated;
revoke execute on function public.has_role(uuid, public.app_role) from public, anon;
revoke execute on function public.current_condominio_id() from public, anon;
grant execute on function public.has_role(uuid, public.app_role) to authenticated;
grant execute on function public.current_condominio_id() to authenticated;

-- RLS
alter table public.condominios enable row level security;
alter table public.profiles enable row level security;
alter table public.user_roles enable row level security;
alter table public.blocos enable row level security;
alter table public.unidades enable row level security;
alter table public.moradores enable row level security;

create policy condominios_select on public.condominios for select to authenticated
  using (id = public.current_condominio_id() or public.has_role(auth.uid(), 'super_admin'));
create policy condominios_update on public.condominios for update to authenticated
  using ((id = public.current_condominio_id() and public.has_role(auth.uid(), 'sindico')) or public.has_role(auth.uid(), 'super_admin'))
  with check ((id = public.current_condominio_id() and public.has_role(auth.uid(), 'sindico')) or public.has_role(auth.uid(), 'super_admin'));
create policy condominios_admin_insert on public.condominios for insert to authenticated
  with check (public.has_role(auth.uid(), 'super_admin'));
create policy condominios_admin_delete on public.condominios for delete to authenticated
  using (public.has_role(auth.uid(), 'super_admin'));

create policy profiles_select on public.profiles for select to authenticated
  using (
    id = auth.uid()
    or public.has_role(auth.uid(), 'super_admin')
    or (condominio_id = public.current_condominio_id() and public.has_role(auth.uid(), 'sindico'))
  );
create policy profiles_update_own on public.profiles for update to authenticated
  using (id = auth.uid()) with check (id = auth.uid());
-- usuário só pode alterar o próprio nome (não condomínio nem e-mail)
revoke update on public.profiles from authenticated;
grant update (nome) on public.profiles to authenticated;

create policy user_roles_select on public.user_roles for select to authenticated
  using (user_id = auth.uid() or public.has_role(auth.uid(), 'super_admin'));

create policy blocos_select on public.blocos for select to authenticated
  using (condominio_id = public.current_condominio_id() or public.has_role(auth.uid(), 'super_admin'));
create policy blocos_write on public.blocos for all to authenticated
  using ((condominio_id = public.current_condominio_id() and public.has_role(auth.uid(), 'sindico')) or public.has_role(auth.uid(), 'super_admin'))
  with check ((condominio_id = public.current_condominio_id() and public.has_role(auth.uid(), 'sindico')) or public.has_role(auth.uid(), 'super_admin'));

create policy unidades_select on public.unidades for select to authenticated
  using (condominio_id = public.current_condominio_id() or public.has_role(auth.uid(), 'super_admin'));
create policy unidades_write on public.unidades for all to authenticated
  using ((condominio_id = public.current_condominio_id() and public.has_role(auth.uid(), 'sindico')) or public.has_role(auth.uid(), 'super_admin'))
  with check ((condominio_id = public.current_condominio_id() and public.has_role(auth.uid(), 'sindico')) or public.has_role(auth.uid(), 'super_admin'));

create policy moradores_select on public.moradores for select to authenticated
  using (
    public.has_role(auth.uid(), 'super_admin')
    or (condominio_id = public.current_condominio_id() and (public.has_role(auth.uid(), 'sindico') or public.has_role(auth.uid(), 'porteiro')))
    or user_id = auth.uid()
  );
create policy moradores_write on public.moradores for all to authenticated
  using ((condominio_id = public.current_condominio_id() and public.has_role(auth.uid(), 'sindico')) or public.has_role(auth.uid(), 'super_admin'))
  with check ((condominio_id = public.current_condominio_id() and public.has_role(auth.uid(), 'sindico')) or public.has_role(auth.uid(), 'super_admin'));
