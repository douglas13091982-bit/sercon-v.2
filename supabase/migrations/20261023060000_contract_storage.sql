begin;

-- Bucket privado dos contratos de locação. Os caminhos seguem:
-- <condominio_id>/<unidade_id>/<arquivo>, como usado pela aplicação.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'contratos-locacao',
  'contratos-locacao',
  false,
  10485760,
  array['application/pdf', 'image/jpeg', 'image/png']
)
on conflict (id) do update set
  name = excluded.name,
  public = false,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "sindico_ler_contratos_locacao" on storage.objects;
create policy "sindico_ler_contratos_locacao" on storage.objects
for select to authenticated
using (
  bucket_id = 'contratos-locacao'
  and (
    public.has_role(auth.uid(), 'super_admin')
    or (
      public.has_role(auth.uid(), 'sindico')
      and (storage.foldername(name))[1] = public.current_condominio_id()::text
    )
  )
);

drop policy if exists "sindico_enviar_contratos_locacao" on storage.objects;
create policy "sindico_enviar_contratos_locacao" on storage.objects
for insert to authenticated
with check (
  bucket_id = 'contratos-locacao'
  and (
    public.has_role(auth.uid(), 'super_admin')
    or (
      public.has_role(auth.uid(), 'sindico')
      and (storage.foldername(name))[1] = public.current_condominio_id()::text
    )
  )
);

drop policy if exists "sindico_atualizar_contratos_locacao" on storage.objects;
create policy "sindico_atualizar_contratos_locacao" on storage.objects
for update to authenticated
using (
  bucket_id = 'contratos-locacao'
  and (
    public.has_role(auth.uid(), 'super_admin')
    or (
      public.has_role(auth.uid(), 'sindico')
      and (storage.foldername(name))[1] = public.current_condominio_id()::text
    )
  )
)
with check (
  bucket_id = 'contratos-locacao'
  and (
    public.has_role(auth.uid(), 'super_admin')
    or (
      public.has_role(auth.uid(), 'sindico')
      and (storage.foldername(name))[1] = public.current_condominio_id()::text
    )
  )
);

drop policy if exists "sindico_excluir_contratos_locacao" on storage.objects;
create policy "sindico_excluir_contratos_locacao" on storage.objects
for delete to authenticated
using (
  bucket_id = 'contratos-locacao'
  and (
    public.has_role(auth.uid(), 'super_admin')
    or (
      public.has_role(auth.uid(), 'sindico')
      and (storage.foldername(name))[1] = public.current_condominio_id()::text
    )
  )
);

commit;
