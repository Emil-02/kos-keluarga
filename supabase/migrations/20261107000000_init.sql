-- =====================================================================
-- Kos Keluarga - skema awal
-- =====================================================================

-- ---------- Enum ----------
create type public.user_role as enum ('admin', 'penghuni');
create type public.room_status as enum ('aktif', 'perbaikan');
create type public.rent_period as enum ('harian', 'mingguan', 'bulanan');
create type public.booking_status as enum ('menunggu', 'disetujui', 'ditolak', 'dibatalkan');
create type public.tenancy_status as enum ('aktif', 'selesai');
create type public.invoice_type as enum ('sewa', 'deposit', 'listrik', 'denda', 'lainnya');
create type public.invoice_status as enum ('belum_bayar', 'menunggu_verifikasi', 'lunas', 'dibatalkan');
create type public.payment_method as enum ('transfer', 'qris', 'tunai');
create type public.payment_status as enum ('menunggu', 'diterima', 'ditolak');
create type public.complaint_status as enum ('baru', 'diproses', 'selesai');

-- ---------- Helper ----------
create or replace function public.period_add(d date, p public.rent_period, n integer)
returns date
language sql
immutable
as $$
  select case p
    when 'harian' then d + n
    when 'mingguan' then d + (n * 7)
    when 'bulanan' then (d + make_interval(months => n))::date
  end;
$$;

create or replace function public.today_wib()
returns date
language sql
stable
as $$
  select (now() at time zone 'Asia/Jakarta')::date;
$$;

-- ---------- Profiles ----------
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text not null default '',
  email text,
  phone text,
  address text,
  id_card_path text,
  role public.user_role not null default 'penghuni',
  created_at timestamptz not null default now()
);

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin'
  );
$$;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, full_name, email, phone)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', ''),
    new.email,
    new.raw_user_meta_data ->> 'phone'
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------- Settings (satu baris) ----------
create table public.settings (
  id integer primary key default 1 check (id = 1),
  kos_name text not null default 'Kos Keluarga',
  tagline text not null default 'Hunian nyaman, aman, dan terasa seperti rumah sendiri',
  description text not null default '',
  address text not null default '',
  maps_embed_url text,
  whatsapp text not null default '',
  email text,
  price_daily bigint not null default 0 check (price_daily >= 0),
  price_weekly bigint not null default 0 check (price_weekly >= 0),
  price_monthly bigint not null default 0 check (price_monthly >= 0),
  deposit bigint not null default 0 check (deposit >= 0),
  room_size text,
  room_features text[] not null default '{}',
  bank_name text,
  bank_account_number text,
  bank_account_name text,
  qris_path text,
  rules text[] not null default '{}',
  updated_at timestamptz not null default now()
);

insert into public.settings (id) values (1);

-- ---------- Rooms ----------
create table public.rooms (
  id uuid primary key default gen_random_uuid(),
  number text not null unique,
  floor integer not null default 1,
  status public.room_status not null default 'aktif',
  notes text,
  created_at timestamptz not null default now()
);

-- ---------- Konten website ----------
create table public.gallery (
  id uuid primary key default gen_random_uuid(),
  image_path text not null,
  caption text,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create table public.facilities (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  icon text not null default 'check',
  is_room_facility boolean not null default false,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create table public.testimonials (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  content text not null,
  rating integer not null default 5 check (rating between 1 and 5),
  is_published boolean not null default true,
  created_at timestamptz not null default now()
);

-- ---------- Booking ----------
create table public.bookings (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  full_name text not null,
  phone text not null,
  email text not null,
  id_card_path text,
  period public.rent_period not null,
  start_date date not null,
  duration integer not null check (duration between 1 and 365),
  end_date date generated always as (public.period_add(start_date, period, duration)) stored,
  occupants integer not null default 1 check (occupants between 1 and 10),
  note text,
  status public.booking_status not null default 'menunggu',
  admin_note text,
  room_id uuid references public.rooms (id) on delete set null,
  tenancy_id uuid,
  created_at timestamptz not null default now(),
  decided_at timestamptz
);

create index bookings_status_idx on public.bookings (status, created_at desc);

-- ---------- Tenancy (masa sewa) ----------
create table public.tenancies (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.profiles (id) on delete restrict,
  room_id uuid not null references public.rooms (id) on delete restrict,
  booking_id uuid references public.bookings (id) on delete set null,
  period public.rent_period not null,
  price bigint not null check (price >= 0),
  deposit bigint not null default 0,
  start_date date not null,
  -- null = berjalan terus sampai check-out (mingguan/bulanan)
  end_date date,
  -- tanggal sampai kapan sewa sudah lunas dibayar
  paid_until date not null,
  auto_renew boolean not null default true,
  status public.tenancy_status not null default 'aktif',
  notes text,
  created_at timestamptz not null default now(),
  ended_at timestamptz,
  check (end_date is null or end_date > start_date)
);

create index tenancies_room_idx on public.tenancies (room_id) where status = 'aktif';
create index tenancies_tenant_idx on public.tenancies (tenant_id);

alter table public.bookings
  add constraint bookings_tenancy_fk foreign key (tenancy_id) references public.tenancies (id) on delete set null;

-- ---------- Invoices ----------
create sequence public.invoice_seq;

create table public.invoices (
  id uuid primary key default gen_random_uuid(),
  number text not null unique default (
    'INV-' || to_char(now() at time zone 'Asia/Jakarta', 'YYYYMM') || '-' || lpad(nextval('public.invoice_seq')::text, 5, '0')
  ),
  tenancy_id uuid not null references public.tenancies (id) on delete cascade,
  type public.invoice_type not null default 'sewa',
  description text not null,
  amount bigint not null check (amount > 0),
  period_start date,
  period_end date,
  due_date date not null,
  status public.invoice_status not null default 'belum_bayar',
  paid_at timestamptz,
  created_at timestamptz not null default now(),
  check (type <> 'sewa' or (period_start is not null and period_end is not null and period_end > period_start))
);

create index invoices_tenancy_idx on public.invoices (tenancy_id);
create index invoices_status_due_idx on public.invoices (status, due_date);

-- ---------- Payments ----------
create table public.payments (
  id uuid primary key default gen_random_uuid(),
  invoice_id uuid not null references public.invoices (id) on delete cascade,
  amount bigint not null check (amount > 0),
  method public.payment_method not null default 'transfer',
  proof_path text,
  paid_on date not null default public.today_wib(),
  status public.payment_status not null default 'menunggu',
  note text,
  admin_note text,
  submitted_by uuid references public.profiles (id) on delete set null,
  verified_by uuid references public.profiles (id) on delete set null,
  verified_at timestamptz,
  created_at timestamptz not null default now()
);

create index payments_invoice_idx on public.payments (invoice_id);
create index payments_status_idx on public.payments (status, created_at desc);

-- ---------- Complaints ----------
create table public.complaints (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.profiles (id) on delete cascade,
  room_id uuid references public.rooms (id) on delete set null,
  title text not null,
  description text not null,
  photo_path text,
  status public.complaint_status not null default 'baru',
  admin_response text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------- Announcements ----------
create table public.announcements (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  body text not null,
  sent_notification boolean not null default false,
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now()
);

-- ---------- Expenses ----------
create table public.expenses (
  id uuid primary key default gen_random_uuid(),
  category text not null,
  amount bigint not null check (amount > 0),
  spent_on date not null default public.today_wib(),
  description text,
  created_at timestamptz not null default now()
);

-- ---------- Notification log ----------
create table public.notifications_log (
  id uuid primary key default gen_random_uuid(),
  channel text not null check (channel in ('email', 'whatsapp')),
  recipient text not null,
  kind text not null,
  subject text,
  body text not null,
  status text not null check (status in ('terkirim', 'gagal', 'dilewati')),
  error text,
  invoice_id uuid references public.invoices (id) on delete set null,
  created_at timestamptz not null default now()
);

create index notifications_log_invoice_kind_idx on public.notifications_log (invoice_id, kind);

-- =====================================================================
-- Fungsi bisnis
-- =====================================================================

-- Kamar yang bebas pada rentang [p_start, p_end). p_end null = tanpa batas akhir.
create or replace function public.available_rooms(p_start date, p_end date)
returns table (id uuid, number text, floor integer)
language sql
stable
security definer
set search_path = ''
as $$
  select r.id, r.number, r.floor
  from public.rooms r
  where r.status = 'aktif'
    and not exists (
      select 1 from public.tenancies t
      where t.room_id = r.id
        and t.status = 'aktif'
        and (p_end is null or t.start_date < p_end)
        and (t.end_date is null or t.end_date > p_start)
    )
  order by r.floor, r.number;
$$;

create or replace function public.count_available_rooms(p_start date, p_end date)
returns integer
language sql
stable
security definer
set search_path = ''
as $$
  select count(*)::integer from public.available_rooms(p_start, p_end);
$$;

-- Admin menyetujui booking: membuat masa sewa + tagihan pertama (+ deposit).
create or replace function public.approve_booking(
  p_booking_id uuid,
  p_room_id uuid,
  p_tenant_id uuid,
  p_admin_note text default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  b public.bookings;
  s public.settings;
  v_price bigint;
  v_deposit bigint := 0;
  v_end date;
  v_tenancy_id uuid;
begin
  if not public.is_admin() then
    raise exception 'Hanya admin yang dapat menyetujui booking';
  end if;

  select * into b from public.bookings where id = p_booking_id for update;
  if not found then
    raise exception 'Booking tidak ditemukan';
  end if;
  if b.status <> 'menunggu' then
    raise exception 'Booking sudah diproses sebelumnya';
  end if;

  select * into s from public.settings where id = 1;

  v_price := case b.period
    when 'harian' then s.price_daily
    when 'mingguan' then s.price_weekly
    else s.price_monthly
  end;
  if v_price <= 0 then
    raise exception 'Harga sewa % belum diatur', b.period;
  end if;

  v_end := case when b.period = 'harian' then b.end_date else null end;

  perform 1 from public.rooms where id = p_room_id for update;
  if not exists (
    select 1 from public.available_rooms(b.start_date, v_end) ar where ar.id = p_room_id
  ) then
    raise exception 'Kamar tidak tersedia untuk tanggal tersebut';
  end if;

  if b.period = 'bulanan' then
    v_deposit := s.deposit;
  end if;

  insert into public.tenancies (
    tenant_id, room_id, booking_id, period, price, deposit,
    start_date, end_date, paid_until, auto_renew
  ) values (
    p_tenant_id, p_room_id, b.id, b.period, v_price, v_deposit,
    b.start_date, v_end, b.start_date, b.period <> 'harian'
  ) returning id into v_tenancy_id;

  insert into public.invoices (tenancy_id, type, description, amount, period_start, period_end, due_date)
  values (
    v_tenancy_id, 'sewa',
    'Sewa ' || b.duration || ' ' || case b.period when 'harian' then 'hari' when 'mingguan' then 'minggu' else 'bulan' end,
    v_price * b.duration, b.start_date, b.end_date, b.start_date
  );

  if v_deposit > 0 then
    insert into public.invoices (tenancy_id, type, description, amount, due_date)
    values (v_tenancy_id, 'deposit', 'Deposit (dikembalikan saat keluar)', v_deposit, b.start_date);
  end if;

  update public.bookings
  set status = 'disetujui', room_id = p_room_id, tenancy_id = v_tenancy_id,
      admin_note = p_admin_note, decided_at = now()
  where id = b.id;

  update public.profiles
  set id_card_path = coalesce(id_card_path, b.id_card_path),
      phone = coalesce(nullif(phone, ''), b.phone),
      full_name = coalesce(nullif(full_name, ''), b.full_name)
  where id = p_tenant_id;

  return v_tenancy_id;
end;
$$;

-- Penghuni mengirim bukti pembayaran.
create or replace function public.submit_payment(
  p_invoice_id uuid,
  p_method public.payment_method,
  p_proof_path text,
  p_paid_on date,
  p_note text default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  inv public.invoices;
  v_owner uuid;
  v_payment_id uuid;
begin
  select i.* into inv from public.invoices i where i.id = p_invoice_id for update;
  if not found then
    raise exception 'Tagihan tidak ditemukan';
  end if;

  select t.tenant_id into v_owner from public.tenancies t where t.id = inv.tenancy_id;
  if v_owner is distinct from auth.uid() and not public.is_admin() then
    raise exception 'Tidak diizinkan';
  end if;

  if inv.status <> 'belum_bayar' then
    raise exception 'Tagihan ini tidak menunggu pembayaran';
  end if;

  if p_method = 'tunai' or coalesce(p_proof_path, '') = '' then
    raise exception 'Bukti transfer/QRIS wajib diunggah';
  end if;

  insert into public.payments (invoice_id, amount, method, proof_path, paid_on, note, submitted_by)
  values (inv.id, inv.amount, p_method, p_proof_path, coalesce(p_paid_on, public.today_wib()), p_note, auth.uid())
  returning id into v_payment_id;

  update public.invoices set status = 'menunggu_verifikasi' where id = inv.id;

  return v_payment_id;
end;
$$;

-- Tandai tagihan lunas (dipanggil internal).
create or replace function public.mark_invoice_paid(p_invoice_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  inv public.invoices;
begin
  update public.invoices set status = 'lunas', paid_at = now()
  where id = p_invoice_id
  returning * into inv;

  if inv.type = 'sewa' then
    update public.tenancies
    set paid_until = greatest(paid_until, inv.period_end)
    where id = inv.tenancy_id;
  end if;
end;
$$;

revoke execute on function public.mark_invoice_paid(uuid) from public, anon, authenticated;

-- Admin memverifikasi bukti pembayaran.
create or replace function public.verify_payment(p_payment_id uuid, p_approve boolean, p_admin_note text default null)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  pay public.payments;
begin
  if not public.is_admin() then
    raise exception 'Hanya admin yang dapat memverifikasi pembayaran';
  end if;

  select * into pay from public.payments where id = p_payment_id for update;
  if not found then
    raise exception 'Pembayaran tidak ditemukan';
  end if;
  if pay.status <> 'menunggu' then
    raise exception 'Pembayaran sudah diverifikasi';
  end if;

  update public.payments
  set status = case when p_approve then 'diterima'::public.payment_status else 'ditolak'::public.payment_status end,
      admin_note = p_admin_note, verified_by = auth.uid(), verified_at = now()
  where id = pay.id;

  if p_approve then
    perform public.mark_invoice_paid(pay.invoice_id);
  else
    update public.invoices set status = 'belum_bayar'
    where id = pay.invoice_id and status = 'menunggu_verifikasi';
  end if;
end;
$$;

-- Admin mencatat pembayaran langsung (tunai / transfer yang sudah dicek).
create or replace function public.record_payment(
  p_invoice_id uuid,
  p_method public.payment_method,
  p_paid_on date,
  p_note text default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  inv public.invoices;
  v_payment_id uuid;
begin
  if not public.is_admin() then
    raise exception 'Hanya admin yang dapat mencatat pembayaran';
  end if;

  select * into inv from public.invoices where id = p_invoice_id for update;
  if not found then
    raise exception 'Tagihan tidak ditemukan';
  end if;
  if inv.status not in ('belum_bayar', 'menunggu_verifikasi') then
    raise exception 'Tagihan tidak dapat dibayar';
  end if;

  -- bukti lain yang masih menunggu digantikan oleh catatan admin ini
  update public.payments
  set status = 'ditolak', admin_note = 'Digantikan pencatatan manual admin',
      verified_by = auth.uid(), verified_at = now()
  where invoice_id = inv.id and status = 'menunggu';

  insert into public.payments (invoice_id, amount, method, paid_on, note, status, submitted_by, verified_by, verified_at)
  values (inv.id, inv.amount, p_method, coalesce(p_paid_on, public.today_wib()), p_note, 'diterima', auth.uid(), auth.uid(), now())
  returning id into v_payment_id;

  perform public.mark_invoice_paid(inv.id);
  return v_payment_id;
end;
$$;

-- Tanggal mulai periode sewa berikutnya yang belum ditagih.
-- Batas periode ke-n setelah p_from, dihitung dari tanggal mulai sewa (p_anchor)
-- agar sewa bulanan yang mulai tgl 29-31 tidak bergeser ke tgl 28 setelah Februari.
create or replace function public.period_end_after(p_anchor date, p_period public.rent_period, p_from date, p_count integer)
returns date
language plpgsql
immutable
as $$
declare
  k integer;
begin
  if p_period <> 'bulanan' then
    return public.period_add(p_from, p_period, p_count);
  end if;
  k := greatest(((extract(year from p_from) - extract(year from p_anchor)) * 12
        + extract(month from p_from) - extract(month from p_anchor))::integer - 1, 0);
  while public.period_add(p_anchor, p_period, k) <= p_from loop
    k := k + 1;
  end loop;
  return public.period_add(p_anchor, p_period, k + p_count - 1);
end;
$$;

create or replace function public.next_billing_start(p_tenancy_id uuid)
returns date
language sql
stable
security definer
set search_path = ''
as $$
  select greatest(
    t.paid_until,
    coalesce((
      select max(i.period_end) from public.invoices i
      where i.tenancy_id = t.id and i.type = 'sewa' and i.status <> 'dibatalkan'
    ), t.start_date)
  )
  from public.tenancies t
  where t.id = p_tenancy_id;
$$;

-- Penghuni (atau admin) memperpanjang / membayar di muka sebanyak n periode.
create or replace function public.extend_tenancy(p_tenancy_id uuid, p_periods integer)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  t public.tenancies;
  v_start date;
  v_end date;
  v_invoice_id uuid;
begin
  if p_periods is null or p_periods < 1 or p_periods > 60 then
    raise exception 'Jumlah periode tidak valid';
  end if;

  select * into t from public.tenancies where id = p_tenancy_id for update;
  if not found then
    raise exception 'Masa sewa tidak ditemukan';
  end if;
  if t.tenant_id is distinct from auth.uid() and not public.is_admin() then
    raise exception 'Tidak diizinkan';
  end if;
  if t.status <> 'aktif' then
    raise exception 'Masa sewa sudah berakhir';
  end if;

  v_start := public.next_billing_start(t.id);
  v_end := public.period_end_after(t.start_date, t.period, v_start, p_periods);

  -- sewa dengan tanggal akhir: pastikan kamar tidak dipakai orang lain di rentang tambahan
  if t.end_date is not null then
    if exists (
      select 1 from public.tenancies o
      where o.room_id = t.room_id and o.id <> t.id and o.status = 'aktif'
        and o.start_date < v_end and (o.end_date is null or o.end_date > t.end_date)
    ) then
      raise exception 'Kamar sudah dipesan orang lain pada tanggal perpanjangan';
    end if;
    update public.tenancies set end_date = greatest(end_date, v_end) where id = t.id;
  end if;

  insert into public.invoices (tenancy_id, type, description, amount, period_start, period_end, due_date)
  values (
    t.id, 'sewa',
    'Perpanjangan sewa ' || p_periods || ' ' || case t.period when 'harian' then 'hari' when 'mingguan' then 'minggu' else 'bulan' end,
    t.price * p_periods, v_start, v_end, greatest(v_start - 1, public.today_wib())
  ) returning id into v_invoice_id;

  return v_invoice_id;
end;
$$;

-- Admin melakukan check-out penghuni.
create or replace function public.checkout_tenancy(p_tenancy_id uuid, p_date date)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  t public.tenancies;
begin
  if not public.is_admin() then
    raise exception 'Hanya admin yang dapat melakukan check-out';
  end if;

  select * into t from public.tenancies where id = p_tenancy_id for update;
  if not found or t.status <> 'aktif' then
    raise exception 'Masa sewa aktif tidak ditemukan';
  end if;
  if p_date <= t.start_date then
    raise exception 'Tanggal check-out harus setelah tanggal masuk';
  end if;

  update public.tenancies
  set status = 'selesai', end_date = p_date, auto_renew = false, ended_at = now()
  where id = t.id;

  update public.invoices
  set status = 'dibatalkan'
  where tenancy_id = t.id and type = 'sewa'
    and status in ('belum_bayar', 'menunggu_verifikasi')
    and period_start >= p_date;
end;
$$;

-- Membuat tagihan periode berikutnya untuk sewa yang diperpanjang otomatis.
-- Tagihan dibuat beberapa hari sebelum periode baru dimulai.
create or replace function public.generate_recurring_invoices()
returns setof uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  t public.tenancies;
  v_start date;
  v_end date;
  v_lead integer;
  v_id uuid;
begin
  if not (public.is_admin() or coalesce(auth.role(), '') = 'service_role' or session_user = 'postgres') then
    raise exception 'Tidak diizinkan';
  end if;

  for t in
    select * from public.tenancies where status = 'aktif' and auto_renew for update
  loop
    v_lead := case t.period when 'bulanan' then 7 when 'mingguan' then 3 else 1 end;
    -- loop agar sewa yang tertinggal beberapa periode tetap tertagih
    loop
      v_start := public.next_billing_start(t.id);
      exit when v_start - public.today_wib() > v_lead;
      exit when t.end_date is not null and v_start >= t.end_date;
      v_end := public.period_end_after(t.start_date, t.period, v_start, 1);

      insert into public.invoices (tenancy_id, type, description, amount, period_start, period_end, due_date)
      values (
        t.id, 'sewa',
        'Sewa ' || t.period::text || ' ' || to_char(v_start, 'DD/MM/YYYY') || ' - ' || to_char(v_end - 1, 'DD/MM/YYYY'),
        t.price, v_start, v_end, v_start
      ) returning id into v_id;

      return next v_id;
    end loop;
  end loop;
end;
$$;

-- =====================================================================
-- Row Level Security
-- =====================================================================
alter table public.profiles enable row level security;
alter table public.settings enable row level security;
alter table public.rooms enable row level security;
alter table public.gallery enable row level security;
alter table public.facilities enable row level security;
alter table public.testimonials enable row level security;
alter table public.bookings enable row level security;
alter table public.tenancies enable row level security;
alter table public.invoices enable row level security;
alter table public.payments enable row level security;
alter table public.complaints enable row level security;
alter table public.announcements enable row level security;
alter table public.expenses enable row level security;
alter table public.notifications_log enable row level security;

-- profiles
create policy "profil: baca milik sendiri atau admin" on public.profiles
  for select to authenticated using (id = auth.uid() or public.is_admin());
create policy "profil: ubah milik sendiri atau admin" on public.profiles
  for update to authenticated using (id = auth.uid() or public.is_admin())
  with check (id = auth.uid() or public.is_admin());
-- pengguna hanya boleh mengubah kolom tertentu (role tidak bisa diubah sendiri)
revoke insert, update, delete on public.profiles from authenticated, anon;
grant update (full_name, phone, address) on public.profiles to authenticated;

-- settings & konten publik
create policy "settings: publik baca" on public.settings for select to anon, authenticated using (true);
create policy "settings: admin ubah" on public.settings for update to authenticated using (public.is_admin()) with check (public.is_admin());

create policy "rooms: publik baca" on public.rooms for select to anon, authenticated using (true);
create policy "rooms: admin kelola" on public.rooms for all to authenticated using (public.is_admin()) with check (public.is_admin());

create policy "gallery: publik baca" on public.gallery for select to anon, authenticated using (true);
create policy "gallery: admin kelola" on public.gallery for all to authenticated using (public.is_admin()) with check (public.is_admin());

create policy "facilities: publik baca" on public.facilities for select to anon, authenticated using (true);
create policy "facilities: admin kelola" on public.facilities for all to authenticated using (public.is_admin()) with check (public.is_admin());

create policy "testimonials: publik baca yang tayang" on public.testimonials for select to anon, authenticated using (is_published or public.is_admin());
create policy "testimonials: admin kelola" on public.testimonials for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- bookings (dibuat lewat server dengan service role; dikelola admin)
create policy "bookings: admin kelola" on public.bookings for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- tenancies
create policy "tenancies: baca milik sendiri atau admin" on public.tenancies
  for select to authenticated using (tenant_id = auth.uid() or public.is_admin());
create policy "tenancies: admin kelola" on public.tenancies
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- invoices
create policy "invoices: baca milik sendiri atau admin" on public.invoices
  for select to authenticated using (
    public.is_admin() or exists (
      select 1 from public.tenancies t where t.id = invoices.tenancy_id and t.tenant_id = auth.uid()
    )
  );
create policy "invoices: admin kelola" on public.invoices
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- payments
create policy "payments: baca milik sendiri atau admin" on public.payments
  for select to authenticated using (
    public.is_admin() or exists (
      select 1 from public.invoices i join public.tenancies t on t.id = i.tenancy_id
      where i.id = payments.invoice_id and t.tenant_id = auth.uid()
    )
  );
create policy "payments: admin kelola" on public.payments
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- complaints
create policy "complaints: baca milik sendiri atau admin" on public.complaints
  for select to authenticated using (tenant_id = auth.uid() or public.is_admin());
create policy "complaints: penghuni membuat" on public.complaints
  for insert to authenticated with check (tenant_id = auth.uid() and status = 'baru' and admin_response is null);
create policy "complaints: admin kelola" on public.complaints
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- announcements
create policy "announcements: login baca" on public.announcements for select to authenticated using (true);
create policy "announcements: admin kelola" on public.announcements for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- expenses & log: admin saja
create policy "expenses: admin kelola" on public.expenses for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "notifications_log: admin baca" on public.notifications_log for select to authenticated using (public.is_admin());

-- Fungsi yang hanya untuk pengguna login
revoke execute on function public.approve_booking(uuid, uuid, uuid, text) from public, anon;
revoke execute on function public.submit_payment(uuid, public.payment_method, text, date, text) from public, anon;
revoke execute on function public.verify_payment(uuid, boolean, text) from public, anon;
revoke execute on function public.record_payment(uuid, public.payment_method, date, text) from public, anon;
revoke execute on function public.extend_tenancy(uuid, integer) from public, anon;
revoke execute on function public.checkout_tenancy(uuid, date) from public, anon;
revoke execute on function public.next_billing_start(uuid) from public, anon;
revoke execute on function public.generate_recurring_invoices() from public, anon;
grant execute on function public.approve_booking(uuid, uuid, uuid, text) to authenticated;
grant execute on function public.submit_payment(uuid, public.payment_method, text, date, text) to authenticated;
grant execute on function public.verify_payment(uuid, boolean, text) to authenticated;
grant execute on function public.record_payment(uuid, public.payment_method, date, text) to authenticated;
grant execute on function public.extend_tenancy(uuid, integer) to authenticated;
grant execute on function public.checkout_tenancy(uuid, date) to authenticated;
grant execute on function public.next_billing_start(uuid) to authenticated;
grant execute on function public.generate_recurring_invoices() to authenticated, service_role;

-- =====================================================================
-- Storage buckets
-- =====================================================================
-- "public-images": foto galeri & QRIS (publik)
-- "documents": KTP, bukti bayar, foto keluhan (privat, diakses lewat signed URL dari server)
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('public-images', 'public-images', true, 5242880, array['image/jpeg', 'image/png', 'image/webp']),
  ('documents', 'documents', false, 5242880, array['image/jpeg', 'image/png', 'image/webp', 'application/pdf'])
on conflict (id) do nothing;
