-- Allow the authenticated syndic flow to upsert resident rows with client-generated IDs.
-- RLS policies still scope writes to the user's own condominium.
-- user_id remains write-protected and is set only through the invitation flow.
grant insert (id) on public.moradores to authenticated;
grant update (id, condominio_id) on public.moradores to authenticated;
