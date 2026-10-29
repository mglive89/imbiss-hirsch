-- GallopaySystem · Mehrere Betriebe, Teil 2 (Zugriffsregeln pro Betrieb)
-- Einmal im Supabase SQL Editor ausführen. Es werden KEINE Daten gelöscht.
begin;
alter table public.menu_items drop constraint menu_items_category_id_fkey;
alter table public.categories drop constraint categories_pkey;
alter table public.categories add primary key (client_id, id);
alter table public.menu_items add constraint menu_items_category_fkey foreign key (client_id, category_id) references public.categories(client_id, id) on update cascade;
alter table public.settings drop constraint settings_pkey;
alter table public.settings add primary key (client_id, key);
alter table public.categories alter column client_id drop default;
alter table public.menu_items alter column client_id drop default;
alter table public.settings alter column client_id drop default;
alter table public.feedback alter column client_id drop default;
alter table public.orders alter column client_id drop default;
alter table public.staff alter column client_id drop default;
drop function if exists public.add_staff(text, boolean);

drop policy if exists "menu readable" on public.categories;
drop policy if exists "staff edit categories" on public.categories;
drop policy if exists "menu readable" on public.menu_items;
drop policy if exists "staff edit items" on public.menu_items;
drop policy if exists "staff read orders" on public.orders;
drop policy if exists "staff update orders" on public.orders;
drop policy if exists "staff delete orders" on public.orders;
drop policy if exists "staff read order items" on public.order_items;
drop policy if exists "see own staff row" on public.staff;
drop policy if exists "admin manages staff" on public.staff;
drop policy if exists "settings readable" on public.settings;
drop policy if exists "staff edit settings" on public.settings;
drop policy if exists "staff read feedback" on public.feedback;

create policy "menu public" on public.categories for select to anon, authenticated using (true);
create policy "menu edit" on public.categories for all to authenticated using ((select public.can_access(client_id))) with check ((select public.can_access(client_id)));
create policy "menu public" on public.menu_items for select to anon, authenticated using (true);
create policy "menu edit" on public.menu_items for all to authenticated using ((select public.can_access(client_id))) with check ((select public.can_access(client_id)));
create policy "orders read" on public.orders for select to authenticated using ((select public.can_access(client_id)));
create policy "orders update" on public.orders for update to authenticated using ((select public.can_access(client_id))) with check ((select public.can_access(client_id)));
create policy "orders delete" on public.orders for delete to authenticated using ((select public.is_platform_admin()) or ((select public.is_admin()) and client_id = (select public.my_client())));
create policy "order items read" on public.order_items for select to authenticated
  using (exists (select 1 from public.orders o where o.id = order_id and (select public.can_access(o.client_id))));
create policy "staff read" on public.staff for select to authenticated using (user_id = (select auth.uid()) or (select public.can_access(client_id)));
create policy "staff manage" on public.staff for all to authenticated
  using ((select public.is_platform_admin()) or ((select public.is_admin()) and client_id = (select public.my_client())))
  with check ((select public.is_platform_admin()) or ((select public.is_admin()) and client_id = (select public.my_client())));
create policy "settings public" on public.settings for select to anon, authenticated using (true);
create policy "settings edit" on public.settings for all to authenticated using ((select public.can_access(client_id))) with check ((select public.can_access(client_id)));
create policy "feedback read" on public.feedback for select to authenticated using ((select public.can_access(client_id)));
create policy "brand delete by platform" on storage.objects for delete to authenticated using (bucket_id = 'brand' and (select public.is_platform_admin()));
commit;
