-- Data contoh untuk pengembangan lokal. Ubah lewat Panel Admin > Pengaturan.
update public.settings set
  kos_name = 'Kos Keluarga',
  tagline = 'Hunian nyaman, aman, dan terasa seperti rumah sendiri',
  description = 'Kos Keluarga adalah kos yang dikelola langsung oleh keluarga kami. Lingkungan tenang, bersih, dan aman — cocok untuk mahasiswa, pekerja, maupun yang butuh tempat menginap harian.',
  address = 'Jl. Contoh No. 123, Kelurahan Contoh, Kota Contoh',
  maps_embed_url = null,
  whatsapp = '081234567890',
  email = 'kos@example.com',
  price_daily = 100000,
  price_weekly = 500000,
  price_monthly = 1200000,
  deposit = 500000,
  room_size = '3 x 4 meter',
  room_features = array['Kasur & bantal', 'Lemari pakaian', 'Meja & kursi belajar', 'Kipas angin', 'Kamar mandi dalam', 'Jendela & ventilasi baik'],
  bank_name = 'BCA',
  bank_account_number = '1234567890',
  bank_account_name = 'Nama Pemilik Kos',
  rules = array[
    'Jam malam pukul 22.00 WIB, tamu wajib lapor ke pengelola.',
    'Tamu lawan jenis tidak diperbolehkan masuk ke kamar.',
    'Tamu menginap wajib izin pengelola terlebih dahulu.',
    'Pembayaran sewa paling lambat pada tanggal jatuh tempo.',
    'Jaga kebersihan kamar dan area bersama.',
    'Dilarang membawa narkoba, minuman keras, dan senjata tajam.',
    'Matikan lampu, kipas, dan keran air saat tidak digunakan.',
    'Kerusakan akibat kelalaian penghuni menjadi tanggung jawab penghuni.'
  ]
where id = 1;

insert into public.rooms (number, floor) values
  ('101', 1), ('102', 1), ('103', 1), ('104', 1),
  ('201', 2), ('202', 2), ('203', 2), ('204', 2);

insert into public.facilities (name, description, icon, sort_order) values
  ('WiFi Cepat', 'Internet stabil di seluruh area kos', 'wifi', 1),
  ('Parkir Motor', 'Area parkir luas dan beratap', 'bike', 2),
  ('CCTV 24 Jam', 'Keamanan terpantau setiap saat', 'cctv', 3),
  ('Dapur Bersama', 'Kompor, kulkas, dan peralatan masak', 'cooking-pot', 4),
  ('Air Bersih', 'Air PDAM/sumur lancar setiap hari', 'droplets', 5),
  ('Area Jemur', 'Tempat jemur pakaian di lantai atas', 'shirt', 6),
  ('Ruang Tamu', 'Ruang bersama untuk menerima tamu', 'sofa', 7),
  ('Kebersihan', 'Area bersama dibersihkan rutin', 'sparkles', 8);

insert into public.testimonials (name, content, rating) values
  ('Rina, mahasiswi', 'Kamarnya bersih, ibu kos ramah sekali. Rasanya seperti tinggal di rumah sendiri.', 5),
  ('Budi, karyawan', 'Lokasi strategis, WiFi kencang, dan lingkungannya tenang. Cocok untuk yang kerja.', 5),
  ('Sari', 'Menginap harian untuk urusan kerja, prosesnya mudah dan cepat lewat WhatsApp.', 4);
