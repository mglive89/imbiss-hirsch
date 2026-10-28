-- =====================================================================
-- Imbiss – Datenbank (Supabase / Postgres)
-- Stand des Projekts "imbiss-hirsch". Zum Neuaufsetzen einmal komplett
-- im SQL-Editor ausführen; danach die Speisekarte im Dashboard pflegen.
-- =====================================================================

-- ---------- Tabellen ----------
create table public.categories (
  id text primary key,
  sort int not null default 0,
  names jsonb not null,                 -- {"de":"…","en":"…","it":"…","tr":"…","fr":"…"}
  is_drink boolean not null default false
);

create table public.menu_items (
  id uuid primary key default gen_random_uuid(),
  category_id text not null references public.categories(id) on update cascade,
  sort int not null default 0,
  names jsonb not null,
  descs jsonb,
  price_pickup numeric(6,2),
  price_delivery numeric(6,2),
  tag text check (tag in ('veg','house')),
  available boolean not null default true,
  updated_at timestamptz not null default now()
);
create index on public.menu_items(category_id, sort);

create table public.staff (
  user_id uuid primary key references auth.users(id) on delete cascade,
  email text,
  is_admin boolean not null default false,
  created_at timestamptz not null default now()
);

create table public.orders (
  id bigint generated always as identity primary key,
  created_at timestamptz not null default now(),
  channel text not null check (channel in ('tisch','abholung','lieferung')),
  source text not null default 'qr' check (source in ('qr','telefon','whatsapp','theke')),
  table_no text,
  customer_name text,
  phone text,
  address text,
  note text,
  lang text,
  status text not null default 'neu' check (status in ('neu','zubereitung','fertig','abgeschlossen','storniert')),
  payment text not null default 'offen' check (payment in ('offen','bar','karte','bei_lieferung','online')),
  pay_method text,                      -- card, paypal, apple_pay, google_pay (Stripe)
  pay_ref text,                         -- Stripe Checkout Session
  paid_at timestamptz,
  total numeric(8,2) not null default 0,
  token uuid not null default gen_random_uuid(),   -- geheimer Schlüssel des Gastes für den Status
  updated_at timestamptz not null default now()
);
create index on public.orders(created_at desc);
create index on public.orders(status);
create index on public.orders(payment);

create table public.order_items (
  id bigint generated always as identity primary key,
  order_id bigint not null references public.orders(id) on delete cascade,
  item_id uuid references public.menu_items(id) on delete set null,
  name_de text not null,
  qty int not null check (qty between 1 and 50),
  unit_price numeric(6,2) not null,
  note text
);
create index on public.order_items(order_id);

-- ---------- Rollen ----------
create or replace function public.is_staff() returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.staff s where s.user_id = auth.uid());
$$;
create or replace function public.is_admin() returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.staff s where s.user_id = auth.uid() and s.is_admin);
$$;

-- ---------- Row Level Security ----------
alter table public.categories enable row level security;
alter table public.menu_items enable row level security;
alter table public.staff enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;

create policy "menu readable" on public.categories for select to anon, authenticated using (true);
create policy "menu readable" on public.menu_items for select to anon, authenticated using (true);
create policy "staff edit categories" on public.categories for all to authenticated using ((select public.is_staff())) with check ((select public.is_staff()));
create policy "staff edit items" on public.menu_items for all to authenticated using ((select public.is_staff())) with check ((select public.is_staff()));
create policy "staff read orders" on public.orders for select to authenticated using ((select public.is_staff()));
create policy "staff update orders" on public.orders for update to authenticated using ((select public.is_staff())) with check ((select public.is_staff()));
create policy "staff delete orders" on public.orders for delete to authenticated using ((select public.is_admin()));
create policy "staff read order items" on public.order_items for select to authenticated using ((select public.is_staff()));
create policy "see own staff row" on public.staff for select to authenticated using (user_id = (select auth.uid()) or (select public.is_staff()));
create policy "admin manages staff" on public.staff for all to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));

-- ---------- Bestellung anlegen (Gäste per QR, Personal per Kasse) ----------
-- Preise rechnet die Datenbank; Gäste können weder Preise noch Zahlstatus setzen.
create or replace function public.place_order(p jsonb) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  v_channel text := p->>'channel';
  v_source  text := coalesce(p->>'source','qr');
  v_payment text := 'offen';
  v_id bigint; v_token uuid; v_total numeric := 0;
  it jsonb; m public.menu_items%rowtype; v_qty int; v_price numeric;
begin
  if v_channel not in ('tisch','abholung','lieferung') then raise exception 'Ungültige Bestellart'; end if;
  if public.is_staff() then
    if coalesce(p->>'payment','offen') in ('offen','bar','karte','bei_lieferung') then v_payment := coalesce(p->>'payment','offen'); end if;
  else
    v_source := 'qr';
  end if;
  if v_source not in ('qr','telefon','whatsapp','theke') then v_source := 'qr'; end if;
  if v_payment = 'bei_lieferung' and v_channel <> 'lieferung' then v_payment := 'offen'; end if;
  if v_channel = 'tisch' and coalesce(trim(p->>'table_no'),'') = '' then raise exception 'Tischnummer fehlt'; end if;
  if v_channel = 'lieferung' and (coalesce(trim(p->>'name'),'') = '' or coalesce(trim(p->>'phone'),'') = '' or coalesce(trim(p->>'address'),'') = '') then
    raise exception 'Für die Lieferung fehlen Name, Telefon oder Adresse'; end if;
  if jsonb_typeof(p->'items') <> 'array' or jsonb_array_length(p->'items') = 0 then raise exception 'Warenkorb ist leer'; end if;
  if jsonb_array_length(p->'items') > 40 then raise exception 'Zu viele Positionen'; end if;

  insert into public.orders(channel, source, table_no, customer_name, phone, address, note, lang, payment)
  values (v_channel, v_source, left(trim(p->>'table_no'),10), left(trim(p->>'name'),80), left(trim(p->>'phone'),40),
          left(trim(p->>'address'),200), left(trim(p->>'note'),300), left(p->>'lang',5), v_payment)
  returning id, token into v_id, v_token;

  for it in select * from jsonb_array_elements(p->'items') loop
    select * into m from public.menu_items where id = (it->>'id')::uuid;
    if not found or not m.available or m.price_pickup is null then raise exception 'Ein Gericht ist gerade nicht verfügbar'; end if;
    v_qty := greatest(1, least(20, coalesce((it->>'qty')::int, 1)));
    v_price := case when v_channel = 'lieferung' then coalesce(m.price_delivery, m.price_pickup) else m.price_pickup end;
    insert into public.order_items(order_id, item_id, name_de, qty, unit_price, note)
    values (v_id, m.id, m.names->>'de', v_qty, v_price, left(trim(it->>'note'),120));
    v_total := v_total + v_qty * v_price;
  end loop;

  update public.orders set total = v_total where id = v_id;
  return jsonb_build_object('id', v_id, 'token', v_token, 'total', v_total);
end $$;

-- Gast fragt den Status seiner eigenen Bestellung ab (Nummer + Schlüssel)
create or replace function public.order_status(p_id bigint, p_token uuid) returns jsonb
language sql stable security definer set search_path = '' as $$
  select jsonb_build_object('id', o.id, 'status', o.status, 'payment', o.payment, 'pay_method', o.pay_method,
    'total', o.total, 'channel', o.channel, 'table_no', o.table_no, 'created_at', o.created_at)
  from public.orders o where o.id = p_id and o.token = p_token;
$$;

-- Abhol-Anzeige: nur Nummern und Tische, keine Namen
create or replace function public.ready_board() returns jsonb
language sql stable security definer set search_path = '' as $$
  select coalesce(jsonb_agg(jsonb_build_object('id', o.id, 'status', o.status, 'channel', o.channel, 'table_no', o.table_no, 'since', o.updated_at)
         order by o.updated_at), '[]'::jsonb)
  from public.orders o
  where o.payment <> 'offen' and o.status in ('neu','zubereitung','fertig')
    and o.created_at > now() - interval '12 hours';
$$;

-- Erstes Konto wird Admin; Admins schalten weitere Mitarbeiter frei
create or replace function public.claim_first_admin() returns boolean
language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is null then return false; end if;
  if exists (select 1 from public.staff) then return false; end if;
  insert into public.staff(user_id, email, is_admin) values (auth.uid(), auth.jwt()->>'email', true);
  return true;
end $$;
create or replace function public.add_staff(p_email text, p_admin boolean default false) returns boolean
language plpgsql security definer set search_path = '' as $$
declare v_uid uuid;
begin
  if not public.is_admin() then raise exception 'Nur Admins'; end if;
  select id into v_uid from auth.users where lower(email) = lower(trim(p_email));
  if v_uid is null then raise exception 'Kein Konto mit dieser E-Mail. Die Person muss sich zuerst registrieren.'; end if;
  insert into public.staff(user_id, email, is_admin) values (v_uid, lower(trim(p_email)), p_admin)
  on conflict (user_id) do update set is_admin = excluded.is_admin;
  return true;
end $$;

-- ---------- Trigger ----------
create or replace function public.touch_updated_at() returns trigger
language plpgsql set search_path = '' as $$ begin new.updated_at := now(); return new; end $$;
create trigger t_orders_upd before update on public.orders for each row execute function public.touch_updated_at();
create trigger t_items_upd before update on public.menu_items for each row execute function public.touch_updated_at();

create or replace function public.stamp_paid() returns trigger
language plpgsql set search_path = '' as $$
begin
  if new.payment <> 'offen' and (tg_op = 'INSERT' or old.payment = 'offen') then new.paid_at := now(); end if;
  if new.payment = 'offen' then new.paid_at := null; end if;
  return new;
end $$;
create trigger t_orders_paid before insert or update of payment on public.orders for each row execute function public.stamp_paid();

-- Spam-Bremse für Gäste-Bestellungen
create or replace function public.guard_guest_orders() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if new.source = 'qr' then
    if (select count(*) from public.orders o where o.created_at > now() - interval '10 minutes') >= 60 then
      raise exception 'Gerade sehr viele Bestellungen, bitte an der Theke bestellen';
    end if;
    if new.table_no is not null and (select count(*) from public.orders o
        where o.source = 'qr' and o.table_no = new.table_no and o.created_at > now() - interval '3 minutes') >= 3 then
      raise exception 'Bitte einen Moment warten, bevor du erneut bestellst';
    end if;
    if new.phone is not null and (select count(*) from public.orders o
        where o.source = 'qr' and o.phone = new.phone and o.created_at > now() - interval '3 minutes') >= 3 then
      raise exception 'Bitte einen Moment warten, bevor du erneut bestellst';
    end if;
  end if;
  return new;
end $$;
create trigger t_orders_guard before insert on public.orders for each row execute function public.guard_guest_orders();

-- ---------- Rechte ----------
revoke execute on function public.is_staff(), public.is_admin(), public.claim_first_admin(), public.add_staff(text, boolean) from public, anon;
revoke execute on function public.place_order(jsonb), public.order_status(bigint, uuid), public.ready_board() from public;
revoke execute on function public.stamp_paid(), public.guard_guest_orders() from public, anon, authenticated;
grant execute on function public.is_staff(), public.is_admin(), public.claim_first_admin(), public.add_staff(text, boolean) to authenticated;
grant execute on function public.place_order(jsonb), public.order_status(bigint, uuid), public.ready_board() to anon, authenticated;

-- ---------- Live-Updates ----------
alter publication supabase_realtime add table public.orders, public.order_items, public.menu_items;
