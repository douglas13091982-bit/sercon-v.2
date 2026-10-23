begin;

-- Cria o condomínio e sua configuração inicial junto da conta do síndico.
-- Isso também funciona quando o Supabase exige confirmação de e-mail antes do login.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  novo_condominio uuid;
  nome_cond text := nullif(btrim(new.raw_user_meta_data ->> 'condominio_nome'), '');
  taxa numeric := greatest(0, coalesce(nullif(new.raw_user_meta_data ->> 'taxa_condominio', '')::numeric, 0));
  dia integer := least(28, greatest(1, coalesce(nullif(new.raw_user_meta_data ->> 'vencimento_dia', '')::integer, 10)));
  modo_agua text := case when new.raw_user_meta_data ->> 'agua_modo' = 'individual' then 'individual' else 'rateio' end;
  tarifa_agua numeric := greatest(0, coalesce(nullif(new.raw_user_meta_data ->> 'valor_m3_agua', '')::numeric, 0));
  tarifa_gas numeric := greatest(0, coalesce(nullif(new.raw_user_meta_data ->> 'valor_m3_gas', '')::numeric, 0));
begin
  if nome_cond is not null then
    insert into public.condominios (nome, cnpj, endereco, telefone, email)
    values (
      nome_cond,
      nullif(btrim(new.raw_user_meta_data ->> 'condominio_cnpj'), ''),
      nullif(btrim(new.raw_user_meta_data ->> 'condominio_endereco'), ''),
      nullif(btrim(new.raw_user_meta_data ->> 'condominio_telefone'), ''),
      coalesce(nullif(btrim(new.raw_user_meta_data ->> 'condominio_email'), ''), new.email)
    ) returning id into novo_condominio;
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
    insert into public.configuracoes_financeiras
      (condominio_id, taxa_condominio, vencimento_dia, valor_m3_gas, agua_modo, valor_m3_agua, criterio_rateio_agua)
    values (novo_condominio, taxa, dia, tarifa_gas, modo_agua, tarifa_agua, 'fracao_ideal');
  end if;

  return new;
end;
$$;

revoke execute on function public.handle_new_user() from public, anon, authenticated;

commit;
