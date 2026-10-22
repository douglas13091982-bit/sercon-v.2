-- Executar como administrador em uma transação: todos os cadastros são descartados.
begin;
insert into auth.users(id, email, email_confirmed_at, raw_user_meta_data) values
 ('a1000000-0000-4000-8000-000000000001', 'sindico-a@sercon-test.invalid', now(), '{"nome":"Síndico A","condominio_nome":"Teste A"}'),
 ('a1000000-0000-4000-8000-000000000002', 'sindico-b@sercon-test.invalid', now(), '{"nome":"Síndico B","condominio_nome":"Teste B"}'),
 ('a1000000-0000-4000-8000-000000000003', 'morador@sercon-test.invalid', now(), '{"nome":"Morador teste"}'),
 ('a1000000-0000-4000-8000-000000000004', 'outra-pessoa@sercon-test.invalid', now(), '{}'),
 ('a1000000-0000-4000-8000-000000000005', 'porteiro@sercon-test.invalid', now(), '{}'),
 ('a1000000-0000-4000-8000-000000000006', 'sem-confirmacao@sercon-test.invalid', null, '{}');
select set_config('test.cond_a', condominio_id::text, true) from public.profiles where id='a1000000-0000-4000-8000-000000000001';
select set_config('test.cond_b', condominio_id::text, true) from public.profiles where id='a1000000-0000-4000-8000-000000000002';
insert into public.blocos(id,condominio_id,nome) values
 ('b1000000-0000-4000-8000-000000000001',current_setting('test.cond_a')::uuid,'A'),
 ('b1000000-0000-4000-8000-000000000002',current_setting('test.cond_b')::uuid,'B');
insert into public.unidades(id,condominio_id,bloco_id,numero) values
 ('c1000000-0000-4000-8000-000000000001',current_setting('test.cond_a')::uuid,'b1000000-0000-4000-8000-000000000001','101'),
 ('c1000000-0000-4000-8000-000000000002',current_setting('test.cond_a')::uuid,'b1000000-0000-4000-8000-000000000001','102'),
 ('c1000000-0000-4000-8000-000000000003',current_setting('test.cond_b')::uuid,'b1000000-0000-4000-8000-000000000002','201');
insert into public.moradores(id,condominio_id,nome,email,unidade_id) values
 ('d1000000-0000-4000-8000-000000000001',current_setting('test.cond_a')::uuid,'Morador convidado','morador@sercon-test.invalid','c1000000-0000-4000-8000-000000000001'),
 ('d1000000-0000-4000-8000-000000000002',current_setting('test.cond_a')::uuid,'Outro morador','outro@sercon-test.invalid','c1000000-0000-4000-8000-000000000002'),
 ('d1000000-0000-4000-8000-000000000003',current_setting('test.cond_b')::uuid,'Morador B','b@sercon-test.invalid','c1000000-0000-4000-8000-000000000003');

set local role anon;
do $$ begin
  if exists(select 1 from public.moradores) then raise exception 'FALHA: acesso anônimo'; end if;
end $$;
set local role authenticated;
select set_config('request.jwt.claim.sub','a1000000-0000-4000-8000-000000000001',true);
do $$ begin
  if (select count(*) from public.condominios) <> 1 or (select count(*) from public.moradores) <> 2 then raise exception 'FALHA: isolamento síndico'; end if;
  begin
    insert into public.moradores(condominio_id,nome) values(current_setting('test.cond_b')::uuid,'Invasão');
    raise exception 'FALHA: gravação em outro condomínio';
  exception when insufficient_privilege then null; end;
  begin
    update public.profiles set condominio_id=current_setting('test.cond_b')::uuid where id=auth.uid();
    raise exception 'FALHA: troca de condomínio pelo cliente';
  exception when insufficient_privilege then null; end;
  begin
    insert into public.user_roles(user_id,role) values(auth.uid(),'super_admin');
    raise exception 'FALHA: promoção de privilégio';
  exception when insufficient_privilege then null; end;
  begin
    update public.moradores set user_id='a1000000-0000-4000-8000-000000000003';
    raise exception 'FALHA: vínculo de login direto';
  exception when insufficient_privilege then null; end;
  begin
    insert into public.moradores(condominio_id,nome,unidade_id) values(current_setting('test.cond_a')::uuid,'Unidade alheia','c1000000-0000-4000-8000-000000000003');
    raise exception 'FALHA: unidade de outro condomínio';
  exception when foreign_key_violation then null; end;
  begin
    perform public.criar_convite('admin@sercon-test.invalid','super_admin');
    raise exception 'FALHA: convite super admin';
  exception when raise_exception then if SQLERRM like 'FALHA:%' then raise; end if; end;
  perform set_config('test.token_residente',public.criar_convite('morador@sercon-test.invalid','morador','d1000000-0000-4000-8000-000000000001'),true);
  perform set_config('test.token_porteiro',public.criar_convite('porteiro@sercon-test.invalid','porteiro'),true);
  perform set_config('test.token_sem_confirmacao',public.criar_convite('sem-confirmacao@sercon-test.invalid','porteiro'),true);
  begin
    perform token_hash from public.convites_acesso;
    raise exception 'FALHA: leitura do hash de convite';
  exception when insufficient_privilege then null; end;
end $$;

select set_config('request.jwt.claim.sub','a1000000-0000-4000-8000-000000000004',true);
do $$ begin
  begin
    perform public.aceitar_convite(current_setting('test.token_residente'));
    raise exception 'FALHA: e-mail diferente aceitou convite';
  exception when raise_exception then if SQLERRM like 'FALHA:%' then raise; end if; end;
end $$;
select set_config('request.jwt.claim.sub','a1000000-0000-4000-8000-000000000006',true);
do $$ begin
  begin
    perform public.aceitar_convite(current_setting('test.token_sem_confirmacao'));
    raise exception 'FALHA: e-mail sem confirmação aceitou convite';
  exception when raise_exception then if SQLERRM like 'FALHA:%' then raise; end if; end;
end $$;

select set_config('request.jwt.claim.sub','a1000000-0000-4000-8000-000000000003',true);
select public.aceitar_convite(current_setting('test.token_residente'));
do $$ begin
  if public.current_condominio_id() <> current_setting('test.cond_a')::uuid or not public.has_role(auth.uid(),'morador') then raise exception 'FALHA: vínculo do morador'; end if;
  if (select count(*) from public.moradores) <> 1 or (select count(*) from public.unidades) <> 1 then raise exception 'FALHA: privacidade do morador'; end if;
  begin
    perform public.aceitar_convite(current_setting('test.token_residente'));
    raise exception 'FALHA: reutilização do convite';
  exception when raise_exception then if SQLERRM like 'FALHA:%' then raise; end if; end;
  begin
    perform public.criar_convite('intruso@sercon-test.invalid','porteiro');
    raise exception 'FALHA: morador criou convite';
  exception when insufficient_privilege then null; end;
  begin
    insert into public.unidades(condominio_id,bloco_id,numero) values(current_setting('test.cond_a')::uuid,'b1000000-0000-4000-8000-000000000001','999');
    raise exception 'FALHA: morador gravou unidade';
  exception when insufficient_privilege then null; end;
end $$;

select set_config('request.jwt.claim.sub','a1000000-0000-4000-8000-000000000005',true);
select public.aceitar_convite(current_setting('test.token_porteiro'));
do $$ begin
  if (select count(*) from public.moradores) <> 2 or (select count(*) from public.unidades) <> 2 then raise exception 'FALHA: isolamento porteiro'; end if;
  begin
    insert into public.moradores(condominio_id,nome) values(current_setting('test.cond_a')::uuid,'Não autorizado');
    raise exception 'FALHA: porteiro cadastrou morador';
  exception when insufficient_privilege then null; end;
end $$;

select set_config('request.jwt.claim.sub','a1000000-0000-4000-8000-000000000002',true);
do $$ begin
  begin
    perform public.criar_convite('morador@sercon-test.invalid','morador','d1000000-0000-4000-8000-000000000001');
    raise exception 'FALHA: convite para morador de outro condomínio';
  exception when raise_exception then if SQLERRM like 'FALHA:%' then raise; end if; end;
end $$;

select set_config('request.jwt.claim.sub','a1000000-0000-4000-8000-000000000001',true);
do $$ begin
  begin
    delete from public.moradores where id='d1000000-0000-4000-8000-000000000001';
    raise exception 'FALHA: exclusão de cadastro com acesso';
  exception when raise_exception then if SQLERRM like 'FALHA:%' then raise; end if; end;
  if not exists(select 1 from public.audit_logs) or exists(select 1 from public.audit_logs where condominio_id <> current_setting('test.cond_a')::uuid) then raise exception 'FALHA: auditoria isolada'; end if;
  begin
    delete from public.audit_logs;
    raise exception 'FALHA: auditoria apagada pelo cliente';
  exception when insufficient_privilege then null; end;
  perform public.revogar_acesso('a1000000-0000-4000-8000-000000000003');
end $$;
select set_config('request.jwt.claim.sub','a1000000-0000-4000-8000-000000000003',true);
do $$ begin
  if public.current_condominio_id() is not null or exists(select 1 from public.moradores) or exists(select 1 from public.unidades) then raise exception 'FALHA: revogação não imediata'; end if;
end $$;
rollback;
select 'Fundação validada: isolamento, papéis, convites, vínculo, revogação e auditoria; todos os dados de teste revertidos.' as resultado;
