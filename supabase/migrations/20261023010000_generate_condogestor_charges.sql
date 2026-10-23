begin;

-- Permite exibir o aluguel como item separado quando o condomínio opta por
-- incluí-lo na cobrança mensal. A migration não modifica lançamentos existentes.
alter table public.cobrancas_unidade
  drop constraint if exists cobrancas_unidade_tipo_check;
alter table public.cobrancas_unidade
  add constraint cobrancas_unidade_tipo_check
  check (tipo in ('condominio', 'gas', 'agua', 'aluguel'));

-- Gera cobranças de uma competência em uma transação e preserva as já pagas.
create or replace function public.gerar_cobrancas_condominio(_competencia date)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_condominio uuid := public.current_condominio_id();
  v_cfg public.configuracoes_financeiras%rowtype;
  v_comp public.financeiro_competencias%rowtype;
  v_unidade public.unidades%rowtype;
  v_leitura_gas public.leituras_consumo%rowtype;
  v_leitura_agua public.leituras_consumo%rowtype;
  v_total_consumo_agua numeric := 0;
  v_ocupadas integer := 0;
  v_agua numeric := 0;
  v_gas numeric := 0;
  v_valor numeric := 0;
  v_vencimento date;
  v_taxa record;
  v_alvo_count integer;
  v_geradas integer := 0;
begin
  if v_condominio is null or not public.has_role(auth.uid(), 'sindico') then
    raise exception 'Apenas o síndico vinculado pode gerar cobranças.' using errcode = '42501';
  end if;
  if _competencia is null or extract(day from _competencia) <> 1 then
    raise exception 'A competência deve ser o primeiro dia do mês.' using errcode = '22023';
  end if;

  select * into v_cfg from public.configuracoes_financeiras
    where condominio_id = v_condominio;
  if not found then
    raise exception 'Configure os valores financeiros do condomínio antes de gerar cobranças.';
  end if;
  select * into v_comp from public.financeiro_competencias
    where condominio_id = v_condominio and competencia = _competencia;
  if not found then
    v_comp.conta_agua := 0;
    v_comp.tarifa_gas_m3 := v_cfg.valor_m3_gas;
    v_comp.modo_rateio_agua := case when v_cfg.criterio_rateio_agua = 'igual' then 'igual' else 'consumo' end;
    v_comp.incluir_aluguel_na_cobranca := false;
  end if;

  v_vencimento := make_date(extract(year from _competencia)::int,
    extract(month from _competencia)::int, v_cfg.vencimento_dia);
  select count(*)::int into v_ocupadas from public.unidades u
    where u.condominio_id = v_condominio and u.status = 'ocupado';
  select coalesce(sum(l.consumo), 0) into v_total_consumo_agua
    from public.leituras_consumo l join public.unidades u on u.id = l.unidade_id
    where l.condominio_id = v_condominio and l.competencia = _competencia
      and l.tipo = 'agua' and u.status = 'ocupado';

  for v_unidade in select * from public.unidades u
    where u.condominio_id = v_condominio
  loop
    -- Taxa condominial padrão para todos os apartamentos ocupados.
    if v_unidade.status = 'ocupado' and v_cfg.taxa_condominio > 0 then
      insert into public.cobrancas_unidade
        (condominio_id, unidade_id, tipo, descricao, competencia, valor, vencimento)
      values (v_condominio, v_unidade.id, 'condominio', 'Taxa de condomínio', _competencia,
        v_cfg.taxa_condominio, v_vencimento)
      on conflict (unidade_id, tipo, competencia) do update set
        descricao = excluded.descricao,
        valor = excluded.valor,
        vencimento = excluded.vencimento,
        status = case when cobrancas_unidade.status = 'pago' then 'pago' else 'pendente' end;
      v_geradas := v_geradas + 1;
    end if;

    select * into v_leitura_gas from public.leituras_consumo l
      where l.condominio_id = v_condominio and l.unidade_id = v_unidade.id
        and l.tipo = 'gas' and l.competencia = _competencia;
    if found and v_leitura_gas.consumo > 0 then
      v_gas := round(v_leitura_gas.consumo * coalesce(v_comp.tarifa_gas_m3, v_cfg.valor_m3_gas), 2);
      insert into public.cobrancas_unidade
        (condominio_id, unidade_id, tipo, descricao, competencia, valor, vencimento, leitura_id)
      values (v_condominio, v_unidade.id, 'gas', 'Consumo de gás', _competencia,
        v_gas, v_vencimento, v_leitura_gas.id)
      on conflict (unidade_id, tipo, competencia) do update set
        descricao = excluded.descricao,
        valor = excluded.valor,
        vencimento = excluded.vencimento,
        leitura_id = excluded.leitura_id,
        status = case when cobrancas_unidade.status = 'pago' then 'pago' else 'pendente' end;
      v_geradas := v_geradas + 1;
    end if;

    select * into v_leitura_agua from public.leituras_consumo l
      where l.condominio_id = v_condominio and l.unidade_id = v_unidade.id
        and l.tipo = 'agua' and l.competencia = _competencia;
    if found then
      if v_cfg.agua_modo = 'individual' then
        v_agua := round(v_leitura_agua.consumo * v_cfg.valor_m3_agua, 2);
      elsif v_comp.modo_rateio_agua = 'igual' then
        v_agua := case when v_ocupadas > 0 then round(v_comp.conta_agua / v_ocupadas, 2) else 0 end;
      else
        v_agua := case when v_total_consumo_agua > 0
          then round(v_comp.conta_agua * v_leitura_agua.consumo / v_total_consumo_agua, 2)
          else 0 end;
      end if;
      if v_agua > 0 then
        insert into public.cobrancas_unidade
          (condominio_id, unidade_id, tipo, descricao, competencia, valor, vencimento, leitura_id)
        values (v_condominio, v_unidade.id, 'agua',
          case when v_cfg.agua_modo = 'individual' then 'Consumo individual de água' else 'Rateio de água' end,
          _competencia, v_agua, v_vencimento, v_leitura_agua.id)
        on conflict (unidade_id, tipo, competencia) do update set
          descricao = excluded.descricao,
          valor = excluded.valor,
          vencimento = excluded.vencimento,
          leitura_id = excluded.leitura_id,
          status = case when cobrancas_unidade.status = 'pago' then 'pago' else 'pendente' end;
        v_geradas := v_geradas + 1;
      end if;
    end if;

    if v_comp.incluir_aluguel_na_cobranca and coalesce(v_unidade.aluguel_mensal, 0) > 0 then
      insert into public.cobrancas_unidade
        (condominio_id, unidade_id, tipo, descricao, competencia, valor, vencimento)
      values (v_condominio, v_unidade.id, 'aluguel', 'Aluguel mensal', _competencia,
        v_unidade.aluguel_mensal, v_vencimento)
      on conflict (unidade_id, tipo, competencia) do update set
        descricao = excluded.descricao,
        valor = excluded.valor,
        vencimento = excluded.vencimento,
        status = case when cobrancas_unidade.status = 'pago' then 'pago' else 'pendente' end;
      v_geradas := v_geradas + 1;
    end if;

    for v_taxa in select t.* from public.taxas_adicionais t
      where t.condominio_id = v_condominio and t.ativa
        and t.inicio <= _competencia and (t.fim is null or t.fim >= _competencia)
        and (t.aplica_a = 'todas'
          or (t.aplica_a = 'ocupadas' and v_unidade.status = 'ocupado')
          or (t.aplica_a = 'selecionadas' and exists (
            select 1 from public.taxas_adicionais_unidades tu
            where tu.taxa_id = t.id and tu.unidade_id = v_unidade.id
              and tu.condominio_id = v_condominio)))
    loop
      if v_taxa.modo = 'rateio' then
        select count(*)::int into v_alvo_count from public.unidades u
          where u.condominio_id = v_condominio and u.status = 'ocupado'
            and (v_taxa.aplica_a <> 'selecionadas' or exists (
              select 1 from public.taxas_adicionais_unidades tu
              where tu.taxa_id = v_taxa.id and tu.unidade_id = u.id));
        v_valor := case when v_alvo_count > 0 then round(v_taxa.valor / v_alvo_count, 2) else 0 end;
      else
        v_valor := v_taxa.valor;
      end if;
      if v_valor > 0 then
        insert into public.cobrancas_taxas_adicionais
          (condominio_id, unidade_id, taxa_id, competencia, descricao, valor, vencimento)
        values (v_condominio, v_unidade.id, v_taxa.id, _competencia, v_taxa.nome, v_valor, v_vencimento)
        on conflict (unidade_id, taxa_id, competencia) do update set
          descricao = excluded.descricao,
          valor = excluded.valor,
          vencimento = excluded.vencimento,
          status = case when cobrancas_taxas_adicionais.status = 'pago' then 'pago' else 'pendente' end;
        v_geradas := v_geradas + 1;
      end if;
    end loop;
  end loop;

  return jsonb_build_object('competencia', _competencia, 'itens_gerados', v_geradas);
end;
$$;

revoke execute on function public.gerar_cobrancas_condominio(date) from public, anon;
grant execute on function public.gerar_cobrancas_condominio(date) to authenticated;
comment on function public.gerar_cobrancas_condominio(date) is
  'Gera cobranças mensais de condomínio, água, gás, aluguel opcional e taxas adicionais de forma idempotente.';

commit;
