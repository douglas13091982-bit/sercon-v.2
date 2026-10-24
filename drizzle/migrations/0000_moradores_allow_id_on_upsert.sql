-- The resident form upserts rows with a client-generated id and the condo id.
-- Column-level grants omitted these columns, so INSERT/ON CONFLICT UPDATE failed with
-- "permission denied for table moradores". user_id stays write-protected (set only by invite RPCs).
-- RLS (moradores_write) still restricts writes to the syndic's own condominium.
grant insert (id) on public.moradores to authenticated;
grant update (id, condominio_id) on public.moradores to authenticated;