# Kos Keluarga — Website & Sistem Pengelolaan Kos

Website kos lengkap untuk satu lokasi dengan sewa **harian, mingguan, dan bulanan**:

- **Website publik**: beranda, info kamar, fasilitas, peraturan, kontak, tombol WhatsApp.
- **Booking online**: calon penghuni mengisi data + foto KTP, sistem cek ketersediaan kamar.
- **Panel admin** (`/admin`): kelola kamar, booking, penghuni, tagihan, verifikasi bukti bayar, keluhan, pengumuman, keuangan (ekspor CSV), konten website, dan pengaturan harga/rekening/QRIS.
- **Portal penghuni** (`/penghuni`): lihat tagihan, unggah bukti transfer/QRIS, unduh kwitansi, perpanjang sewa, lapor kerusakan, baca pengumuman.
- **Otomatis**: tagihan periode berikutnya dibuat sendiri, pengingat jatuh tempo (H-3, H-1, hari H, lalu tiap 3 hari saat terlambat) via **WhatsApp (Fonnte)** dan **email (Resend)**.

Teknologi: Next.js 16 (App Router) · Tailwind CSS 4 · Supabase (Postgres, Auth, Storage, RLS) · Vercel (hosting + cron).

---

## Menjalankan di komputer (development)

Prasyarat: Node.js 20.9+, Docker (untuk Supabase lokal).

```bash
npm install
npm run db:start        # menjalankan Supabase lokal (port 55421-55424)
npm run db:reset        # membuat tabel + data contoh (supabase/seed.sql)
cp .env.example .env.local   # lalu isi dengan nilai dari output `npm run db:start`
npm run create-admin -- admin@kos.test PasswordKuat123 "Nama Pengelola"
npm run dev             # buka http://localhost:3000
```

- Studio database: http://127.0.0.1:55423
- Email lokal (reset password, dll.): http://127.0.0.1:55424
- Setelah mengubah migrasi: `npm run db:reset && npm run db:types`

Login admin di `/login`, lalu buka **Pengaturan** untuk mengisi nama kos, alamat, harga, nomor WhatsApp, rekening, dan QRIS.

## Alur kerja

1. Calon penghuni booking di `/booking` → admin mendapat notifikasi.
2. Admin membuka **Booking**, memilih kamar kosong, lalu **Setujui** → sistem membuat akun portal (password sementara), masa sewa, tagihan pertama (+ deposit untuk bulanan), dan mengirimkannya via WhatsApp/email.
3. Penghuni login, membayar via transfer/QRIS, lalu mengunggah bukti di **Tagihan**.
4. Admin memverifikasi di **Tagihan & Bayar** → tagihan lunas, kwitansi tersedia.
5. Untuk sewa mingguan/bulanan, cron harian membuat tagihan periode berikutnya dan mengirim pengingat.
6. Saat penghuni keluar, admin melakukan **Check-out** di halaman penghuni.

Penghuni lama / yang datang langsung bisa ditambahkan dari **Penghuni → Tambah penghuni manual**, lalu pembayaran tunai dicatat dengan **Kelola → Tandai lunas**.

## Deploy ke produksi (Vercel + Supabase Cloud)

1. **Supabase**: buat project di https://supabase.com, lalu:
   ```bash
   npx supabase login
   npx supabase link --project-ref <ref-project>
   npx supabase db push          # menerapkan migrasi
   ```
   Data contoh (`seed.sql`) **tidak** ikut ter-push; isi data asli lewat panel admin (tambah kamar di menu Kamar).
   Di dashboard Supabase → Authentication → URL Configuration: set **Site URL** ke domain Anda dan tambahkan `https://domain-anda/**` ke Redirect URLs.
2. **Vercel**: import repository, lalu isi Environment Variables sesuai `.env.example`:
   - `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_SECRET_KEY`
   - `NEXT_PUBLIC_SITE_URL` (mis. `https://kos-anda.vercel.app`)
   - `CRON_SECRET` (string acak panjang)
   - `FONNTE_TOKEN` (WhatsApp), `RESEND_API_KEY` + `EMAIL_FROM` (email) — opsional, tanpa ini notifikasi dicatat sebagai "dilewati".
3. Buat akun admin pertama ke database produksi:
   ```bash
   NEXT_PUBLIC_SUPABASE_URL=... SUPABASE_SECRET_KEY=... node scripts/create-admin.mjs email@anda.com PasswordKuat "Nama"
   ```
4. Cron harian sudah dikonfigurasi di `vercel.json` (pukul 08.00 WIB) dan memanggil `/api/cron/daily`.
   Admin juga bisa menjalankannya manual lewat tombol **Jalankan penagihan sekarang** di dashboard.

## Struktur proyek

```
src/
├─ app/
│  ├─ (public)/        # beranda, kamar, fasilitas, peraturan, kontak, booking
│  ├─ admin/           # panel admin
│  ├─ penghuni/        # portal penghuni
│  ├─ kwitansi/[id]/   # kwitansi siap cetak
│  ├─ login, lupa-password, akun/password, auth/callback
│  └─ api/             # cron harian, ekspor CSV
├─ actions/            # Server Actions (booking, tenant, admin/*)
├─ components/         # ui/, public/, admin/, tenant/
├─ lib/                # supabase clients, auth, billing, notifications, storage, format
└─ proxy.ts            # penyegaran sesi + proteksi rute
supabase/
├─ migrations/         # skema, fungsi bisnis (RPC), RLS, storage bucket
└─ seed.sql            # data contoh untuk lokal
```

## Keamanan

- Row Level Security aktif di semua tabel: penghuni hanya bisa melihat data miliknya; admin melihat semua.
- Operasi penting (setujui booking, verifikasi pembayaran, check-out, perpanjang) dijalankan sebagai fungsi database yang memeriksa hak akses.
- KTP, bukti bayar, dan foto keluhan disimpan di bucket privat dan hanya ditampilkan lewat tautan sementara.
- Penghuni tidak bisa mengubah role-nya sendiri (hanya kolom nama, HP, alamat).
