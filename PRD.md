# PRD — Vanry Cam

Vanry Cam adalah web kamera disposable untuk pernikahan Evan & Inri. Tamu membuka satu QR/link acara, mengisi nama, memilih jumlah jepretan, memberikan izin kamera, mengambil foto melalui browser, lalu menunggu galeri dibuka penyelenggara.

## Aturan utama

- Gunakan Bahasa Indonesia untuk seluruh teks UI dan dokumentasi pengguna.
- Gunakan satu QR/link untuk seluruh acara.
- Jangan membuat QR per meja, `event_tables`, `table_id`, atau fitur pemilihan meja.
- Tamu tidak login manual; gunakan anonymous session HttpOnly cookie.
- Kuota foto harus divalidasi di server, bukan hanya di browser.
- Foto tetap di perangkat (IndexedDB) dan **tidak** diunggah ke server. Hanya kolase yang diunggah.
- Kolase disimpan di **Google Drive melalui Google Apps Script (GAS)**, bukan di MySQL sebagai biner.
- Jangan menyimpan kolase sebagai base64 atau biner di MySQL; MySQL hanya menyimpan metadata + `drive_file_url`.
- Jangan mengirim blob mentah selain melalui endpoint server yang memvalidasi sesi dan ownership.
- Download kolase hanya melalui endpoint server yang memvalidasi sesi, event, dan ownership.
- Jangan menaruh password database, `SESSION_SECRET`, kredensial database, atau secret lain dalam kode, Git, `AGENTS.md`, atau variable `NEXT_PUBLIC_*`.
- Jangan mengarang file, API, dependency, atau hasil test yang belum benar-benar ada/dijalankan.
- Jangan menggabungkan Tahap 1 dan Tahap 2 dalam satu respons.
- Sebelum mulai, baca PRD dan file project yang sudah ada. Jangan mengubah kontrak data/API tanpa menjelaskan dampaknya.

## Stack wajib

| Komponen | Teknologi |
|---|---|
| Framework | Next.js App Router |
| Frontend | React + TypeScript |
| Styling | Tailwind CSS |
| Komponen UI | shadcn/ui |
| Ikon | Lucide React |
| Disiplin kode | Ponytail principles |
| Backend | Next.js Route Handlers |
| Database | MySQL 8 |
| ORM | Prisma |
| File storage | MySQL `LONGBLOB` (`photos.fileData`) |
| Hosting | Vercel |

## Prinsip Ponytail

- Tulis kode sesedikit mungkin tetapi tetap lengkap dan berfungsi.
- Jangan membuat komponen, abstraksi, state, atau dependency yang belum dibutuhkan.
- Gunakan kemampuan browser dan platform yang sudah ada sebelum membuat solusi custom rumit.
- Prioritaskan kode yang mudah dibaca, diuji, dan dirawat.
- Jangan membuat fitur di luar PRD.
- Jangan membuat frontend React/Vite terpisah dari Next.js.
- Jangan membuat backend terpisah bila Route Handler sudah cukup.
- Bedakan dengan jelas antara “kode yang harus dijalankan” dan “hasil test yang sudah benar-benar dijalankan”.

## UI Vanry Cam

Gunakan shadcn/ui sebagai dasar komponen. Jangan menyalin Paper Kit PRO React; buat desain orisinal dengan nuansa modern, bersih, premium, dan mobile-first.

Palet warna:

```text
Background: #FAF7F2
Primary: #243B32
Accent: #B8945A
Surface: #FFFFFF
Muted: #68645E
Danger: #B63838
```

Aturan UI:

- Hero section besar dengan judul serif, subjudul, badge, dan tombol.
- Kartu putih rounded besar dengan border tipis dan soft shadow.
- Section tiga langkah: Jepret, Simpan, Tunggu.
- CTA section gelap dengan aksen gold blur.
- Navbar sticky dengan backdrop blur.
- Halaman tamu mobile-first, maksimal sekitar 480px.
- Admin memakai layout dashboard responsif.
- Gunakan komponen shadcn/ui: Button, Card, Input, Label, RadioGroup, Progress, Dialog, Alert, Skeleton, Separator, Badge.
- Sertakan state loading, error, empty, disabled, success.
- Hormati `prefers-reduced-motion`.
- Pastikan tombol utama mudah dijangkau di ponsel.

## Alur tamu

```text
Scan satu QR acara / buka link
        ↓
Halaman utama Vanry Cam
        ↓
Isi nama tamu
        ↓
Pilih 4 / 8 / 16 / 32 jepretan
        ↓
Tekan “Izinkan Kamera”
        ↓
Browser meminta izin kamera
        ↓
Ambil foto (disimpan lokal di IndexedDB, bisa hapus/ambil ulang)
        ↓
Tekan “Buat Kolase”
        ↓
Susun kolase (Canvas, grid 2x2/2x4/4x4/4x8) → preview & download
        ↓
Unggah kolase melalui Next.js API → GAS → Google Drive + Google Sheets
        ↓
Galeri langsung terbuka
        ↓
Tamu melihat dan mengunduh kolase miliknya
```

**Catatan (revisi kolase → Drive):** tidak ada tahap reveal. Foto disimpan dulu di perangkat
(IndexedDB) dan **tidak diunggah**. Hanya kolase (satu per sesi) yang dikirim ke server lalu diteruskan
ke Google Apps Script (`GAS_WEB_APP_URL`) untuk disimpan di Google Drive dan dicatat di Google Sheet.
Retry memakai `idempotencyKey` yang sama sehingga tidak ada duplikat. Galeri hanya menampilkan kolase
milik sesi tamu tersebut, bukan milik tamu lain.

## Model data

Gunakan MySQL 8 dan Prisma.

Tabel utama:

- `organizations`
- `users`
- `organization_members`
- `events`
- `guest_sessions`
- `photos`
- `collages`
- `audit_logs`

Aturan data:

- Satu organisasi memiliki banyak event.
- Satu event memiliki banyak sesi tamu.
- Satu sesi tamu memiliki banyak foto.
- Satu identitas anonim hanya memiliki satu sesi per event.
- `guest_sessions` unik pada `(event_id, anonymous_token_hash)`.
- `photos` unik pada `(session_id, idempotency_key)`.
- `photos` menyimpan file biner di `file_data` (`LONGBLOB`), bukan base64 dan bukan link eksternal.
- `photos` menyimpan metadata `mime_type`, `byte_size`, `width`, `height`, dan `uploaded_at`.
- Satu sesi tamu memiliki maksimal satu kolase (`collages` unik pada `session_id`).
- `collages` hanya menyimpan metadata (`photo_count`, `mime_type`, `byte_size`, `width`, `height`,
  `drive_file_url`, `drive_file_id`, `drive_file_name`, `status`); file kolase disimpan di Google Drive via GAS.
- Semua data relevan memiliki `organization_id` dan `event_id` untuk fondasi SaaS.
- Tidak ada `event_tables` dan tidak ada `table_id`.

## Penyimpanan foto (IndexedDB)

- Alur tamu menyimpan foto sementara di IndexedDB (`src/lib/photo-store.ts`); foto **tidak** diunggah.
  Tamu dapat menghapus atau mengambil ulang foto sebelum kolase dibuat.
- Endpoint foto lama (`/api/sessions/me/photos*`, `/api/photos/[id]/*`) dan validasi kuota server
  (`src/lib/quota.ts`) tetap ada untuk kompatibilitas, tetapi tidak dipakai alur tamu baru.
- Jangan menaruh kredensial database, `SESSION_SECRET`, atau secret lain di kode/Git/`NEXT_PUBLIC_*`.

## Penyimpanan kolase (Google Drive via GAS)

Satu sesi tamu memiliki maksimal satu kolase. Kolase dibuat di klien (Canvas) dari blob IndexedDB.

- Endpoint `POST /api/upload/collage` menerima FormData field `file` (JPEG/PNG, maksimal 25MB),
  memvalidasi sesi + `photoCount` ≤ kuota, lalu mengirim base64 ke GAS Web App (`GAS_WEB_APP_URL`).
- Panggilan GAS hanya dari server (`src/lib/gas.ts`): header `Content-Type: text/plain;charset=utf-8`,
  `redirect: "follow"`, `cache: "no-store"`, body JSON `{ fileName, mimeType, base64 }`.
- GAS mengunggah kolase ke Google Drive folder dan mencatat baris ke Google Sheet `up-foto`.
- MySQL menyimpan metadata + `drive_file_url` (`folderUrl`) + `drive_file_id` + `drive_file_name`
  (`fileNameFoto`). Jangan menyimpan biner/base64 kolase di MySQL, dan jangan memberi link Drive
  langsung ke tamu.
- Retry dengan `idempotencyKey` sama mengembalikan kolase yang sama tanpa duplikat.
- Galeri menampilkan gambar melalui `GET /api/collage/[id]/image` (proxy server yang memvalidasi
  sesi/ownership lalu mengambil file dari Drive memakai `drive_file_id`). Unduh kolase lewat
  `GET /api/collages/[id]/download`. Galeri langsung terbuka setelah kolase berhasil diunggah.
- Tamu hanya dapat melihat dan mengunduh kolase miliknya.

## Environment variables

Jangan pernah menyimpan password database, private key, atau secret dalam kode, Git, `AGENTS.md`, atau variable `NEXT_PUBLIC_*`.

Gunakan `.env.local` secara lokal dan `.env.example` sebagai template tanpa nilai rahasia.

`.env.example`:

```dotenv
DATABASE_URL="mysql://user:password@host:3306/vanry_cam"

# Google Apps Script Web App (unggah kolase ke Google Drive + Google Sheets). Server-only.
GAS_WEB_APP_URL=""

SESSION_SECRET=""
NEXT_PUBLIC_APP_URL="http://localhost:3000"

ADMIN_EMAIL="admin@vanrycam.local"
ADMIN_PASSWORD=""
```

`.gitignore` harus memuat:

```gitignore
.env
.env.local
.env*.local
```

## TAHAP 1 — UI/UX lengkap dan foundation

> **Status: SELESAI (verifikasi).** Scaffold Next.js 16 App Router + React 19 + TypeScript +
> Tailwind v4 + shadcn/ui (`base-nova`) + Lucide React + `qrcode.react`. `npm run lint`,
> `npm run build`, dan `npm run typecheck` lolos; seluruh rute mengembalikan 200. Data demo lengkap,
> tanpa backend. Lihat `AGENTS.md` untuk struktur dan konvensi nyata.

Tujuan Tahap 1: membuat seluruh tampilan dan alur pengguna menggunakan data demo, tanpa database, Google Drive, atau backend nyata.

### Scope Tahap 1

- Setup Next.js App Router, React, TypeScript, Tailwind CSS, shadcn/ui, dan Lucide React.
- Konfigurasi tema Vanry Cam.
- Struktur folder yang rapi.
- ESLint, TypeScript, dan build command.
- Halaman tamu lengkap dengan data demo.
- Halaman admin mock dengan data demo.

### Halaman tamu

1. Landing page.
2. Form nama dan pilihan jepretan.
3. Halaman izin kamera.
4. Halaman kamera demo.
5. Halaman waiting/reveal.
6. Halaman galeri demo.

### Landing page

- Navbar Vanry Cam.
- Badge `Disposable Camera`.
- Hero: judul, subjudul, tombol `Mulai Jepret`, dan tombol `Lihat Galeri`.
- Tiga kartu langkah: Jepret, Simpan, Tunggu.
- CTA section gelap dengan aksen gold.
- Footer sederhana.

### Form sesi

- Input nama tamu, 2–60 karakter.
- Pilihan kuota: 4, 8, 16, atau 32 foto.
- Kuota default: 8.
- Validasi nama dan kuota.
- Tombol `Lanjutkan`.

### Izin kamera

- Penjelasan bahwa hanya kamera yang digunakan.
- Tidak meminta mikrofon, lokasi, atau akses file.
- Tombol `Izinkan Kamera`.
- State izin ditolak.
- State browser tidak mendukung kamera.

### Kamera demo

- Preview kamera atau placeholder kamera yang jelas.
- Tombol shutter besar.
- Tombol ganti kamera depan/belakang.
- Counter sisa jepretan.
- Status `Menyimpan foto…`.
- State upload gagal dan retry.
- Setelah kuota habis, pindah ke halaman waiting.

### Waiting/reveal

- Jumlah foto tersimpan.
- Pesan galeri akan dibuka penyelenggara.
- Countdown hanya sebagai informasi bila reveal dijadwalkan.
- Countdown tidak boleh membuka galeri sendiri.
- Saran membuka kembali dari browser yang sama.

### Galeri demo

- Sebelum reveal: hanya waiting state.
- Setelah reveal: grid foto demo.
- Skeleton loading.
- Empty state.
- Error state.
- Lightbox.
- Tombol download per foto.

### Admin mock

- Login admin.
- Dashboard ringkasan.
- Daftar tamu.
- QR acara dan link acara.
- Daftar foto.
- Pengaturan upload dan reveal.
- Konfirmasi membuka galeri.

### Aturan penting Tahap 1

- Gunakan data demo bertipe, bukan data hardcode acak.
- Tampilkan badge `Mode Demo` pada area yang belum terhubung backend.
- Jangan membuat API nyata.
- Jangan membuat Prisma schema.
- Jangan membuat Google Drive integration.
- Jangan membuat upload nyata.
- Jangan menyimpan foto.
- Jangan membuat login admin nyata.
- Jangan mengubah alur satu QR acara.

### Deliverable Tahap 1

Berikan:

1. Struktur folder final.
2. Dependency dan versi yang dipilih.
3. Command membuat project dan install dependencies.
4. Kode lengkap setiap file baru atau yang berubah.
5. Command `dev`, `build`, `lint`, dan `typecheck`.
6. Checklist pengujian UI manual.
7. Daftar file yang akan dibuat pada Tahap 2.

### Acceptance Tahap 1

Tahap 1 selesai apabila:

- `npm run dev` berjalan.
- `npm run build` berhasil.
- Halaman tamu dapat dibuka dari satu link event.
- Tamu dapat mengisi nama dan memilih kuota.
- Kamera demo dapat dibuka.
- Waiting dan galeri demo dapat diakses.
- Admin mock dapat dibuka.
- Tidak ada QR per meja.
- Tidak ada klaim aplikasi sudah menyimpan foto.

---

## TAHAP 2 — Backend, MySQL, galeri langsung terbuka, dan admin nyata

> **Status: SELESAI (verifikasi).** Prisma 7 + adapter `@prisma/adapter-mariadb`, MySQL 8, anonymous
> session cookie, auth admin (scrypt + HMAC cookie), upload server ke MySQL `LONGBLOB`, kuota
> transaksional, download via server, audit log, rate limit. `lint`, `typecheck`, `test`, `build` lolos
> dan alur API diuji manual terhadap DB lokal. **Upload/unduh foto MySQL belum diuji ulang** setelah
> migrasi LONGBLOB.
>
> **Revisi produk:** reveal dihapus. Galeri langsung terbuka setelah roll tamu selesai; tidak ada
> halaman `/menunggu`, tidak ada reveal manual/terjadwal. Galeri hanya menampilkan foto sesi tamu sendiri.
>
> **Revisi penyimpanan:** foto disimpan di MySQL `photos.file_data` (`LONGBLOB`), bukan Google Drive.
> Tidak ada `googleapis`, Service Account, `drive_file_id`, atau env Google.

Tujuan Tahap 2: mengganti data demo menjadi aplikasi yang benar-benar menyimpan sesi, kuota, foto, dan galeri.

### Scope Tahap 2

- Setup Prisma + MySQL.
- Migration seluruh tabel.
- Anonymous session tamu dengan HttpOnly cookie.
- Auth admin email/password dengan password hash.
- Helper otorisasi admin berdasarkan membership organisasi.
- Middleware dan helper session.
- Rate limiting pada endpoint publik.

### Sesi dan kuota

- API create session.
- API get session.
- Validasi kuota 4, 8, 16, atau 32.
- Resume sesi dari browser yang sama.
- Transaksi MySQL untuk validasi kuota.
- Gunakan `SELECT ... FOR UPDATE` saat reserve upload.
- Upload gagal tidak mengurangi kuota.
- Retry memakai `idempotency_key` dan tidak menciptakan foto duplikat.

### Kamera nyata

- Integrasi `navigator.mediaDevices.getUserMedia`.
- Hanya minta kamera setelah tombol ditekan.
- Preview kamera mobile-first.
- Ganti kamera depan/belakang.
- Hentikan track kamera saat keluar halaman atau pindah kamera.
- Capture melalui canvas.
- Kompresi foto sebelum dikirim ke server.
- Penanganan izin ditolak, kamera tidak tersedia, dan error.

### Upload foto ke MySQL

- API `POST /api/sessions/me/photos/reserve`.
- API `POST /api/photos/:id/upload`.
- Server menyimpan Buffer biner langsung ke `photos.file_data` (`LONGBLOB`), bukan base64.
- Simpan `mime_type`, `byte_size`, `width`, `height`, dan `uploaded_at` di MySQL.
- Validasi MIME, ukuran, dan dimensi gambar (baca header JPEG/PNG/WebP).
- Jangan menyimpan foto sebagai base64.
- Jangan mengirim blob mentah atau metadata sensitif ke tamu di luar endpoint ber-guard.

### Galeri (langsung terbuka)

- Tidak ada reveal; galeri terbuka setelah roll tamu selesai.
- Galeri hanya menampilkan foto milik sesi tamu (filter `session_id` di server).
- Download foto melalui `GET /api/photos/:id/download`.
- Server mengambil Buffer dari MySQL lalu mengirimnya sebagai `image/*`.
- Tidak ada blob, URL eksternal, atau metadata sensitif yang dikirim selain lewat endpoint server.

### Admin nyata

- Login admin nyata.
- Dashboard dengan data nyata.
- Daftar tamu dan pencarian.
- QR acara dan link acara.
- Daftar foto dan status upload.
- Pengaturan informasi acara.
- Audit log untuk aksi penting.

### Deployment

- Environment variables Vercel.
- Domain HTTPS.
- Rate limiting.
- Pengujian Android Chrome dan iOS Safari.
- Pengujian jaringan lambat.
- Backup dan retensi.

### Deliverable Tahap 2

Berikan:

1. Prisma schema lengkap.
2. Migration Prisma.
3. Kode lengkap setiap file baru atau yang berubah.
4. Parser/validator gambar server-only (`src/lib/image.ts`).
5. API contract dan implementasi.
6. Environment variables yang diperlukan.
7. Command migration, dev, build, lint, typecheck, dan test.
8. Checklist pengujian keamanan dan fungsional.
9. Penjelasan perubahan terhadap UI Tahap 1.

### Acceptance Tahap 2

Tahap 2 selesai apabila:

- Tamu dapat membuka satu QR/link acara.
- Tamu dapat mengisi nama dan memilih kuota.
- Tamu dapat memberikan izin kamera dan mengambil foto.
- Foto tersimpan di MySQL `photos.file_data` (`LONGBLOB`) melalui server.
- Kuota tidak dapat dilewati dari browser.
- Galeri hanya menampilkan foto milik sesi tamu.
- Tamu dapat melihat dan mengunduh foto miliknya.
- Tidak ada akses lintas sesi, lintas event, atau lintas organisasi.
- Seluruh alur diuji pada Android dan iOS perangkat fisik.

---

## Prompt memulai Tahap 1

```text
Baca AGENTS.md dan PRD Vanry Cam.

Mulai TAHAP 1 SAJA: foundation dan UI/UX lengkap menggunakan data demo.

Jangan membuat MySQL, Prisma, Google Drive, API upload, atau backend nyata.
Jangan membuat frontend React/Vite terpisah dari Next.js.
Jangan membuat QR per meja.

Buat UI tamu lengkap:
- Landing page.
- Form nama dan pilihan 4/8/16/32 jepretan.
- Halaman izin kamera.
- Kamera demo.
- Waiting/reveal.
- Galeri demo.

Buat admin mock:
- Dashboard.
- Daftar tamu.
- QR acara.
- Daftar foto.
- Pengaturan reveal.

Gunakan Next.js App Router, React, TypeScript, Tailwind CSS, shadcn/ui, Lucide React, dan Ponytail principles.

Berikan struktur folder, dependency, kode lengkap setiap file, command, dan checklist pengujian.
Jangan mengerjakan Tahap 2.
```

## Prompt memulai Tahap 2

```text
Tahap 1 sudah selesai dan UI Vanry Cam sudah berjalan.

Sekarang kerjakan TAHAP 2 SAJA: backend, MySQL, Prisma, penyimpanan foto MySQL, reveal, galeri, dan admin nyata.

Pertahankan seluruh UI dan alur Tahap 1.
Jangan mengubah satu QR/link acara menjadi QR per meja.
Jangan membuat event_tables atau table_id.

Buat:
- Prisma schema dan migration MySQL.
- Anonymous session tamu.
- Auth admin.
- API sesi dan kuota.
- Kamera nyata.
- Upload dan simpan foto ke MySQL (`photos.file_data` LONGBLOB) melalui server.
- Reveal dan galeri private.
- Download melalui server.
- Admin nyata.
- Audit log.
- Rate limiting.

Simpan foto sebagai Buffer biner di MySQL. Jangan memakai Google Drive.
Berikan Prisma schema, migration, kode lengkap, environment variables, command, dan checklist pengujian.
Jangan menggabungkan pekerjaan di luar Tahap 2.
```
