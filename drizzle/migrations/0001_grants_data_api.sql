grant select, insert, update, delete on public.condominios to authenticated;
grant select on public.profiles to authenticated;
grant select on public.user_roles to authenticated;
grant select, insert, update, delete on public.blocos to authenticated;
grant select, insert, update, delete on public.unidades to authenticated;
grant select, insert, update, delete on public.moradores to authenticated;
grant all on public.condominios, public.profiles, public.user_roles, public.blocos, public.unidades, public.moradores to service_role;