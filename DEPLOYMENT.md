# Deployment Vanry Cam (Vercel + MySQL)

Dokumen operasional produksi. Rahasia hanya di Environment Variables Vercel, jangan di Git.

## 1. Prasyarat

- MySQL 8 terkelola (PlanetScale/Vercel Postgres bukan opsi karena stack MySQL; gunakan Railway,
  Aiven, atau RDS MySQL) dengan koneksi TLS.
- Ruang disk MySQL cukup untuk foto `LONGBLOB` (perkirakan ~3MB × jumlah jepretan × jumlah tamu).
- Repo terhubung ke Vercel.

## 2. Penyimpanan foto & kolase

Foto tamu tetap di perangkat (IndexedDB) dan tidak diunggah ke server. Kolase dikirim ke Next.js
(`POST /api/upload/collage`) lalu diteruskan dari server ke Google Apps Script (`GAS_WEB_APP_URL`).
GAS menyimpan kolase ke Google Drive dan mencatat baris ke Google Sheet `up-foto`.

MySQL hanya menyimpan metadata kolase + `drive_file_url` + `drive_file_name`. Tidak ada biner kolase di
MySQL. Endpoint foto lama (`photos.file_data` LONGBLOB) dan validasi kuota server tetap ada untuk
kompatibilitas tetapi tidak dipakai alur tamu baru.

Pastikan `GAS_WEB_APP_URL` menunjuk ke deployment GAS yang benar dan boleh diakses server (deploy
sebagai Web App yang dapat diakses siapa saja). Panggilan GAS memakai header
`Content-Type: text/plain;charset=utf-8`, `redirect: "follow"`, `cache: "no-store"`.

## 3. Environment Variables (Vercel → Settings → Environment Variables)

| Variable | Nilai | Scope |
|---|---|---|
| `DATABASE_URL` | `mysql://user:pass@host:3306/vanry_cam` (TLS aktif) | Production/Preview |
| `GAS_WEB_APP_URL` | URL Web App Google Apps Script (unggah kolase ke Drive) | Production/Preview |
| `SESSION_SECRET` | string acak panjang (≥32 byte) | Production/Preview |
| `NEXT_PUBLIC_APP_URL` | `https://domain-acara` | Production |
| `ADMIN_EMAIL` / `ADMIN_PASSWORD` | hanya untuk seeding awal | jaga tetap lokal |

Catatan: jangan pernah menaruh secret di `NEXT_PUBLIC_*`.

## 4. Migrasi & Seed

Jalankan dari mesin dengan akses DB produksi (set `DATABASE_URL` di `.env.local` lokal atau pakai
terowongan), bukan dari runtime Vercel:

```text
npm run db:deploy   # prisma migrate deploy
npm run db:seed     # buat org + admin + event
```

## 5. Deploy

```text
npm run lint
npm run typecheck
npm run test
npm run build
```

Setelah semua hijau, dorong ke branch produksi (Vercel build otomatis). Pastikan domain memakai
**HTTPS** (cookie `Secure` aktif saat `NODE_ENV=production`).

## 6. Rate limiting

`src/lib/rate-limit.ts` bersifat in-memory (per instance serverless). Untuk produksi trafik tinggi,
ganti ke store bersama (Upstash Redis/Vercel KV) tanpa mengubah tanda tangan fungsi `rateLimit`.

## 7. Backup & retensi

- **Backup DB harian** (snapshot penyedia + `mysqldump` terjadwal, termasuk `photos.file_data`). Uji
  restore berkala; perhatikan ukuran dump karena foto ikut tersimpan sebagai biner.
- **Retensi foto**: tentukan kebijakan (mis. hapus foto setelah 90 hari). Karena file ada di MySQL,
  cukup hapus baris `photos` (atau set `file_data = NULL` lalu hapus baris).
- Simpan `audit_logs` minimal selama masa retensi untuk jejak akses.

## 8. Uji perangkat

Lihat checklist Android/iOS pada laporan Tahap 3. Wajib uji di perangkat fisik: izin kamera,
kualitas foto, upload jaringan lambat, dan safe area notch.
