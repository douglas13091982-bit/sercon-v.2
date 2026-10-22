-- Vincular um inquilino marca a unidade como ocupada. Assim a cobrança
-- condominial configurada pode ser gerada pelo gatilho já existente.
create or replace function public.aplicar_taxa_ao_inquilino()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.tipo = 'inquilino' and new.unidade_id is not null then
    update public.unidades
      set status = 'ocupado'
      where id = new.unidade_id
        and condominio_id = new.condominio_id
        and status <> 'ocupado';

    perform public.aplicar_taxa_condominial_atual(new.condominio_id, new.unidade_id);
  end if;
  return new;
end
$$;

revoke execute on function public.aplicar_taxa_ao_inquilino()
  from public, anon, authenticated;

-- Corrige unidades já vinculadas a inquilinos antes desta migração.
update public.unidades u
  set status = 'ocupado'
  where u.status <> 'ocupado'
    and exists (
      select 1
      from public.moradores m
      where m.unidade_id = u.id
        and m.condominio_id = u.condominio_id
        and m.tipo = 'inquilino'
    );
