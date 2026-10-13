# Pusat Pengaduan dan Aspirasi Mahasiswa — Advokesma KM ITERA

Platform resmi advokasi mahasiswa Institut Teknologi Sumatera (ITERA) untuk menampung laporan kekerasan, intimidasi, pelecehan, permasalahan akademik, pelayanan kampus, dan keluhan mahasiswa.

## 🚀 Fitur Utama
1. **Halaman Beranda Modern**: Desain profesional dengan identitas KM ITERA & Advokesma (warna biru tua, putih, dan aksen emas).
2. **Formulir Pengaduan & Aspirasi Bertahap**:
   - Kategori A: Kekerasan dan Keselamatan (fisik, verbal, psikologis, pelecehan seksual, perundungan, diskriminasi).
   - Kategori B: Keluhan Akademik (dosen, praktikum, transparansi nilai, pungutan liar, ketidakadilan kebijakan).
   - Kategori C: Keluhan Kampus dan Kemahasiswaan (fasilitas, organisasi, administrasi).
   - Kategori D: Aspirasi dan Saran (perbaikan kebijakan, kritik konstruktif, ide program).
   - Pilihan Identitas fleksibel: Identitas Asli, Nama Samaran (Pseudonym), atau Anonim.
   - Lampiran bukti opsional & penjelasan batas kerahasiaan.
3. **Pelacakan Laporan Mandiri**:
   - Penghasilan Nomor Tiket unik dan Kode Rahasia yang aman.
   - Tanpa kewajiban membuat akun beridentitas asli bagi pelapor anonim.
   - Riwayat perubahan status, pesan petugas, dan timeline penanganan.
4. **Dashboard Admin Advokesma**:
   - Autentikasi aman dengan enkripsi password (Bcrypt) dan manajemen sesi.
   - Daftar laporan lengkap dengan filter kategori & status serta pencarian.
   - Pembaruan status, pesan tanggapan kepada pelapor, dan penugasan petugas.
   - Catatan internal (internal notes) rahasia yang terpisah dari pelapor.
   - Statistik agregat laporan dan ekspor rekap ke format CSV.
   - Pembatasan akses khusus untuk laporan kekerasan (perlindungan data pribadi).
5. **Keamanan & Kerahasiaan**:
   - Validasi input, pembatasan akses berbasis peran (RBAC).
   - Penyimpanan aman pada basis data SQLite dengan direktori lampiran terlindungi (`/uploads`).
   - Panduan rujukan darurat & profesional (Satgas PPKS ITERA, Hotline Darurat, Layanan Psikologi).

---

## 📦 Instalasi & Konfigurasi

### Prasyarat
- [Node.js](https://nodejs.org/) (versi 16 atau lebih baru) terinstal di komputer Anda.

### 1. Instalasi Dependensi
Jalankan perintah berikut di terminal pada direktori proyek:
```bash
npm install
```

### 2. Konfigurasi Database & Admin
Aplikasi menggunakan database SQLite (`advokesma.db`) yang dibuat dan diinisialisasi secara otomatis saat server pertama kali dijalankan.
Akun Superadmin default yang dibuat secara otomatis:
- **Username**: `admin`
- **Password**: `AdvokesmaITERA2026!`

### 3. Menjalankan Aplikasi (Development / Production)
Jalankan perintah berikut untuk memulai server:
```bash
node server.js
```
Server akan berjalan di: **`http://localhost:3000`**

---

## 🔐 Panduan Penggunaan & Pengujian Keamanan

1. **Mengakses Website Pengaduan**:
   - Buka browser dan akses `http://localhost:3000`
   - Klik **Buat Pengaduan** untuk mengisi laporan pengaduan atau aspirasi.
   - Simpan **Nomor Tiket** dan **Kode Rahasia** setelah laporan berhasil dikirim.
2. **Melacak Laporan**:
   - Buka menu **Lacak Laporan** (`http://localhost:3000/tracking.html`).
   - Masukkan Nomor Tiket dan Kode Rahasia untuk melihat status dan pesan petugas.
3. **Mengakses Dashboard Admin**:
   - Buka `http://localhost:3000/admin-login.html`.
   - Masukkan username `admin` dan password `AdvokesmaITERA2026!`.
   - Di dashboard, Anda dapat mengelola laporan, memperbarui status, menulis catatan internal, melihat statistik, dan mengekspor rekap laporan ke format CSV.

---

## 🚢 Deployment (Contoh di VPS / Render / Heroku / Railway)
1. Unggah kode proyek ke server / repository Git.
2. Atur Environment Variables (opsional):
   - `PORT`: Nomor port server (default: `3000`)
3. Jalankan perintah instalasi dan start:
   ```bash
   npm install --production
   node server.js
   ```
4. Pastikan menggunakan sertifikat SSL/TLS (HTTPS) pada lingkungan produksi untuk menjamin enkripsi data dan kerahasiaan pelapor.
