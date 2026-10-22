-- Complementa a fundação existente. Cada conta pertence a um condomínio;
-- somente o super admin tem leitura global. Convites não enviam mensagens.

alter table public.moradores add constraint moradores_id_condominio_key unique (id, condominio_id);
create unique index moradores_cpf_normalizado on public.moradores(condominio_id, (regexp_replace(cpf, '[^0-9]', '', 'g'))) where cpf is not null;
alter table public.moradores add constraint morador_com_acesso_tem_unidade check (user_id is null or unidade_id is not null);
create unique index moradores_user_unique on public.moradores(user_id) where user_id is not null;

create table public.convites_acesso (
  id uuid primary key default gen_random_uuid(),
  condominio_id uuid not null references public.condominios(id) on delete cascade,
  email text not null,
  papel public.app_role not null check (papel in ('morador', 'porteiro')),
  morador_id uuid,
  token_hash text not null unique,
  criado_por uuid references auth.users(id) on delete set null,
  criado_em timestamptz not null default now(),
  expira_em timestamptz not null default (now() + interval '7 days'),
  aceito_em timestamptz,
  revogado_em timestamptz,
  check ((papel = 'morador' and morador_id is not null) or (papel = 'porteiro' and morador_id is null)),
  foreign key (morador_id, condominio_id) references public.moradores(id, condominio_id) on delete cascade
);
create index on public.convites_acesso(condominio_id);
alter table public.convites_acesso enable row level security;
create policy convites_select on public.convites_acesso for select to authenticated
  using (condominio_id = public.current_condominio_id() and public.has_role(auth.uid(), 'sindico'));
-- Nem o hash é exposto pela API. Toda escrita é feita nas funções abaixo.
revoke all on public.convites_acesso from anon, authenticated;
grant select (id, condominio_id, email, papel, morador_id, criado_em, expira_em, aceito_em, revogado_em)
  on public.convites_acesso to authenticated;
grant all on public.convites_acesso to service_role;

create table public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  condominio_id uuid references public.condominios(id) on delete cascade,
  usuario_id uuid references auth.users(id) on delete set null,
  tabela text not null,
  registro_id uuid not null,
  acao text not null,
  criado_em timestamptz not null default now()
);
create index on public.audit_logs(condominio_id, criado_em desc);
alter table public.audit_logs enable row level security;
revoke all on public.audit_logs from anon, authenticated;
grant select on public.audit_logs to authenticated;
grant all on public.audit_logs to service_role;
create policy audit_select on public.audit_logs for select to authenticated
  using (public.has_role(auth.uid(), 'super_admin') or
    (condominio_id = public.current_condominio_id() and public.has_role(auth.uid(), 'sindico')));

create function public.registrar_auditoria() returns trigger
language plpgsql security definer set search_path = public as $$
declare registro jsonb; cond uuid;
begin
  registro := case when TG_OP = 'DELETE' then to_jsonb(old) else to_jsonb(new) end;
  cond := case when TG_TABLE_NAME = 'condominios' then (registro->>'id')::uuid else (registro->>'condominio_id')::uuid end;
  -- Exclusão do condomínio não tenta recriar uma FK para o registro removido.
  if not exists (select 1 from public.condominios where id = cond) then return old; end if;
  insert into public.audit_logs(condominio_id, usuario_id, tabela, registro_id, acao)
  values (cond, auth.uid(), TG_TABLE_NAME, (registro->>'id')::uuid, TG_OP);
  return case when TG_OP = 'DELETE' then old else new end;
end $$;
revoke execute on function public.registrar_auditoria() from public, anon, authenticated;
create trigger auditar_moradores after insert or update or delete on public.moradores for each row execute function public.registrar_auditoria();
create trigger auditar_unidades after insert or update or delete on public.unidades for each row execute function public.registrar_auditoria();
create trigger auditar_blocos after insert or update or delete on public.blocos for each row execute function public.registrar_auditoria();
create trigger auditar_condominios after insert or update on public.condominios for each row execute function public.registrar_auditoria();
create trigger auditar_convites after insert or update on public.convites_acesso for each row execute function public.registrar_auditoria();

-- Dados pessoais de moradores não podem ser usados para atribuir acesso pelo REST.
revoke insert, update on public.moradores from authenticated;
grant insert (condominio_id, nome, cpf, telefone, email, tipo, unidade_id, veiculos, pets, contrato) on public.moradores to authenticated;
grant update (nome, cpf, telefone, email, tipo, unidade_id, veiculos, pets, contrato) on public.moradores to authenticated;

create function public.proteger_morador_com_acesso() returns trigger
language plpgsql set search_path = public as $$
begin
  if old.user_id is not null then raise exception 'Revogue o acesso do morador antes de excluir o cadastro.'; end if;
  return old;
end $$;
revoke execute on function public.proteger_morador_com_acesso() from public, anon, authenticated;
create trigger proteger_exclusao_morador before delete on public.moradores for each row execute function public.proteger_morador_com_acesso();

-- Morador lê apenas sua unidade; porteiros e síndicos veem as unidades do condomínio.
drop policy unidades_select on public.unidades;
create policy unidades_select on public.unidades for select to authenticated using (
  public.has_role(auth.uid(), 'super_admin') or
  (condominio_id = public.current_condominio_id() and
    (public.has_role(auth.uid(), 'sindico') or public.has_role(auth.uid(), 'porteiro') or
     exists (select 1 from public.moradores m where m.unidade_id = unidades.id and m.user_id = auth.uid())))
);

create function public.criar_convite(_email text, _papel public.app_role, _morador_id uuid default null)
returns text language plpgsql security definer set search_path = public as $$
declare cond uuid := public.current_condominio_id(); token text; m public.moradores; endereco text := lower(btrim(_email));
begin
  if cond is null or not public.has_role(auth.uid(), 'sindico') then
    raise exception 'Somente o síndico pode gerar convites.' using errcode = '42501';
  end if;
  if endereco is null or endereco !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' or length(endereco) > 254 then
    raise exception 'Informe um e-mail válido.';
  end if;
  if _papel is null or _papel not in ('morador', 'porteiro') then raise exception 'Papel não permitido.'; end if;
  if _papel = 'morador' then
    select * into m from public.moradores where id = _morador_id and condominio_id = cond for update;
    if not found or m.unidade_id is null then raise exception 'Cadastre o morador e sua unidade primeiro.'; end if;
    if m.user_id is not null then raise exception 'Este morador já possui acesso.'; end if;
    if lower(btrim(coalesce(m.email, ''))) <> endereco then raise exception 'Use o e-mail cadastrado no morador.'; end if;
  elsif _morador_id is not null then raise exception 'Porteiro não deve ser vinculado a um morador.';
  end if;
  perform pg_advisory_xact_lock(hashtextextended(cond::text || endereco, 0));
  update public.convites_acesso set revogado_em = now()
    where condominio_id = cond and email = endereco and aceito_em is null and revogado_em is null;
  token := replace(gen_random_uuid()::text, '-', '') || replace(gen_random_uuid()::text, '-', '');
  insert into public.convites_acesso(condominio_id, email, papel, morador_id, token_hash, criado_por)
    values (cond, endereco, _papel, _morador_id, encode(sha256(convert_to(token, 'UTF8')), 'hex'), auth.uid());
  return token;
end $$;

create function public.aceitar_convite(_token text) returns void
language plpgsql security definer set search_path = public as $$
declare c public.convites_acesso; p public.profiles; endereco text; confirmado timestamptz; m public.moradores;
begin
  if auth.uid() is null then raise exception 'Entre na sua conta para aceitar o convite.' using errcode = '42501'; end if;
  select * into c from public.convites_acesso
    where token_hash = encode(sha256(convert_to(_token, 'UTF8')), 'hex') for update;
  if not found or c.aceito_em is not null or c.revogado_em is not null or c.expira_em <= now() then
    raise exception 'Convite inválido, expirado ou já utilizado.';
  end if;
  select lower(email), email_confirmed_at into endereco, confirmado from auth.users where id = auth.uid();
  if confirmado is null or endereco is distinct from c.email then
    raise exception 'Confirme e entre com o mesmo e-mail informado no convite.';
  end if;
  select * into p from public.profiles where id = auth.uid() for update;
  if not found then raise exception 'Perfil não encontrado.'; end if;
  if p.condominio_id is not null or exists (select 1 from public.user_roles where user_id = auth.uid()) then
    raise exception 'Esta conta já tem acesso. Use uma conta sem vínculo ou peça a revogação do acesso anterior.';
  end if;
  if c.papel = 'morador' then
    select * into m from public.moradores where id = c.morador_id and condominio_id = c.condominio_id for update;
    if not found or m.user_id is not null or m.unidade_id is null or lower(btrim(m.email)) is distinct from c.email then
      raise exception 'O cadastro do morador mudou. Peça um novo convite ao síndico.';
    end if;
  end if;
  update public.profiles set condominio_id = c.condominio_id where id = auth.uid();
  insert into public.user_roles(user_id, role) values(auth.uid(), c.papel);
  if c.papel = 'morador' then update public.moradores set user_id = auth.uid() where id = c.morador_id; end if;
  update public.convites_acesso set aceito_em = now() where id = c.id;
end $$;

create function public.revogar_convite(_id uuid) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not public.has_role(auth.uid(), 'sindico') then raise exception 'Acesso negado.' using errcode='42501'; end if;
  update public.convites_acesso set revogado_em = now() where id = _id and condominio_id = public.current_condominio_id()
    and aceito_em is null and revogado_em is null;
  if not found then raise exception 'Convite não encontrado ou já encerrado.'; end if;
end $$;

create function public.listar_acessos()
returns table(user_id uuid, nome text, email text, papel public.app_role)
language sql stable security definer set search_path = public as $$
  select p.id, p.nome, p.email, r.role from public.profiles p join public.user_roles r on r.user_id = p.id
  where p.condominio_id = public.current_condominio_id() and public.has_role(auth.uid(), 'sindico')
  order by p.nome
$$;

create function public.revogar_acesso(_user_id uuid) returns void
language plpgsql security definer set search_path = public as $$
declare cond uuid := public.current_condominio_id(); p public.profiles;
begin
  if cond is null or not public.has_role(auth.uid(), 'sindico') or _user_id = auth.uid() then
    raise exception 'Acesso negado.' using errcode = '42501';
  end if;
  select * into p from public.profiles where id = _user_id and condominio_id = cond for update;
  if not found or exists (select 1 from public.user_roles where user_id = _user_id and role in ('sindico', 'super_admin')) then
    raise exception 'Somente acessos de porteiro e morador podem ser revogados.';
  end if;
  update public.moradores set user_id = null where user_id = _user_id and condominio_id = cond;
  delete from public.user_roles where user_id = _user_id;
  update public.profiles set condominio_id = null where id = _user_id;
  update public.convites_acesso set revogado_em = now() where condominio_id = cond and email = lower(p.email) and revogado_em is null;
  insert into public.audit_logs(condominio_id, usuario_id, tabela, registro_id, acao)
    values (cond, auth.uid(), 'profiles', _user_id, 'REVOKE_ACCESS');
end $$;

revoke execute on function public.criar_convite(text, public.app_role, uuid) from public, anon;
revoke execute on function public.aceitar_convite(text) from public, anon;
revoke execute on function public.revogar_convite(uuid) from public, anon;
revoke execute on function public.listar_acessos() from public, anon;
revoke execute on function public.revogar_acesso(uuid) from public, anon;
grant execute on function public.criar_convite(text, public.app_role, uuid), public.aceitar_convite(text),
  public.revogar_convite(uuid), public.listar_acessos(), public.revogar_acesso(uuid) to authenticated;

-- Validações também no banco: chamadas diretas não podem ignorar o formulário.
alter table public.blocos add constraint bloco_nome_preenchido check (btrim(nome) <> '');
alter table public.condominios add constraint condominio_nome_preenchido check (btrim(nome) <> '');
alter table public.moradores add constraint morador_nome_preenchido check (btrim(nome) <> '');
alter table public.unidades add constraint unidade_numero_preenchido check (btrim(numero) <> '');
alter table public.unidades add constraint unidade_medidas_validas check (
  (metragem is null or metragem > 0) and (fracao_ideal is null or (fracao_ideal > 0 and fracao_ideal <= 100))
);
notify pgrst, 'reload schema';