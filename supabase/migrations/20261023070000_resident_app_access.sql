begin;

-- Campos usados pelo cadastro de locação, ausentes em bancos criados antes deste fluxo.
alter table public.unidades
  add column if not exists aluguel_mensal numeric(12,2) not null default 0,
  add column if not exists gas_medidor text,
  add column if not exists agua_medidor text,
  add column if not exists contrato_storage_path text,
  add column if not exists contrato_nome text,
  add column if not exists contrato_inicio date,
  add column if not exists contrato_fim date;

-- Residents may download only the current lease file attached to their own unit.
drop policy if exists "sindico_ler_contratos_locacao" on storage.objects;
create policy "sindico_ler_contratos_locacao" on storage.objects
for select to authenticated
using (
  bucket_id = 'contratos-locacao'
  and (
    public.has_role(auth.uid(), 'super_admin')
    or (
      public.has_role(auth.uid(), 'sindico')
      and (storage.foldername(objects.name))[1] = public.current_condominio_id()::text
    )
    or exists (
      select 1
      from public.moradores m
      join public.unidades u on u.id = m.unidade_id and u.condominio_id = m.condominio_id
      where m.user_id = auth.uid()
        and m.tipo = 'inquilino'
        and m.condominio_id = public.current_condominio_id()
        and u.contrato_storage_path = objects.name
    )
  )
);

-- A profile's condo and role are controlled by the invitation RPCs, never by a client update.
revoke update on public.profiles from authenticated;
grant update (nome) on public.profiles to authenticated;

grant execute on function public.criar_convite(text, public.app_role, uuid) to authenticated;
grant execute on function public.aceitar_convite(text) to authenticated;

commit;
notify pgrst, 'reload schema';
