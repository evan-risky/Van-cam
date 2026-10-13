# AGENTS.md — Vanry Cam

Instruksi untuk agen OpenCode. Baca ini dulu, lalu baca `PRD.md` sebelum menulis kode.

## Status repo (verifikasi)

**Revisi kolase → Google Drive (GAS)** — foto tetap di IndexedDB dan tidak diunggah ke server. Hanya
kolase yang dikirim ke server lalu diteruskan ke Google Apps Script (`GAS_WEB_APP_URL`) untuk disimpan
di Google Drive; `collages` di MySQL hanya memuat metadata + `driveFileUrl` (bukan biner/base64).
Stack: Next.js 16 App Router (Cache Components), React 19, TypeScript, Tailwind v4, shadcn/ui
(style `base-nova`, `@base-ui/react`), MySQL 8 + Prisma 7 (`@prisma/adapter-mariadb`), `qrcode.react`,
Vitest. Tidak ada `googleapis`/Service Account; integrasi Drive murni lewat GAS Web App.

Sudah lolos: `npm run lint`, `npm run typecheck`, `npm run test`, `npm run build`.
Alur API diuji manual terhadap DB lokal: idempotensi reserve, kuota server (409), upload gagal `FAILED`
tidak mengurangi kuota, retry key sama mengembalikan foto yang sama, isolasi lintas sesi (404),
guard admin (401), rate limit (429).

**Alur utama (jangan diubah):** satu QR → isi nama → pilih 4/8/16/32 → kamera → foto disimpan ke
**IndexedDB** (bisa hapus/ambil ulang) → tekan **Buat Kolase** → susun grid di `/kolase` → preview &
download → unggah kolase via `POST /api/upload/collage` → Next.js teruskan ke GAS → GAS simpan ke
Google Drive + catat baris di Google Sheet → **galeri langsung terbuka**. Foto individual tidak
diunggah; hanya kolase (satu per sesi). Tidak ada reveal/`/menunggu`.

**BELUM TERVERIFIKASI:** alur end-to-end upload kolase → GAS → Drive → galeri belum diuji manual
(butuh `GAS_WEB_APP_URL` aktif). Jangan klaim teruji sampai alur itu dicek terhadap GAS nyata.

## Sumber kebenaran

- `PRD.md` memuat spesifikasi produk: aturan, stack, alur tamu, model data, penyimpanan MySQL,
  environment variables, scope + acceptance Tahap 1 dan Tahap 2.
- Jangan menyalin ulang isi PRD ke file lain. Perbarui `PRD.md` bila kontrak berubah.

## Aturan kerja yang tidak boleh dilanggar

- **Satu tahap per respons.** Jangan implementasi fitur di luar PRD.
- **Satu QR/link untuk seluruh acara.** Dilarang keras: QR per meja, `event_tables`, `table_id`, fitur pilih meja.
- **Kuota foto divalidasi di server** dengan transaksi MySQL (`SELECT ... FOR UPDATE` di `src/lib/quota.ts`).
  Upload gagal tidak mengurangi kuota (status `FAILED` tidak dihitung). Endpoint foto
  (`/api/sessions/me/photos*`, `/api/photos/[id]/*`) tetap ada untuk kompatibilitas, tetapi alur tamu
  tidak lagi mengunggah foto individual.
- **Foto tetap di IndexedDB** dan tidak diunggah ke server. Kolase dibuat di klien dari blob IndexedDB.
- **Kolase hanya disimpan di Google Drive via GAS.** MySQL (`collages`) hanya menyimpan metadata +
  `driveFileUrl` + `driveFileName`; **jangan** simpan biner/base64 kolase di MySQL. Satu kolase per sesi;
  retry `idempotencyKey` tidak menduplikasi. `reserveCollage` di `src/lib/collage-quota.ts`.
- **Panggilan GAS hanya dari server** (`src/lib/gas.ts`), memakai `GAS_WEB_APP_URL`, header
  `Content-Type: text/plain;charset=utf-8`, `redirect: "follow"`, `cache: "no-store"`. Jangan panggil
  GAS dari browser dan jangan taruh URL GAS di kode client/`NEXT_PUBLIC_*`.
- **Rahasia tidak masuk kode/Git/dokumen.** DB password, `SESSION_SECRET` hanya di
  `.env.local` (gitignored). `.env.example` tanpa nilai. Tidak boleh di variable `NEXT_PUBLIC_*`.
- **Tamu hanya melihat/mengunduh foto miliknya.** Admin wajib punya membership organisasi.
- **Jangan mengarang.** Jangan klaim file/API/test yang belum ada/dijalankan. Kode selalu lengkap, tanpa `...`.
- Bahasa UI dan dokumentasi: **Indonesia**. Jangan tambah komentar kode kecuali diminta.

## Stack & konvensi yang mudah keliru

- **Prisma 7 + adapter.** Schema `prisma/schema.prisma` **tidak** memuat `url`. URL ada di
  `prisma7.config.ts` (loads `.env.local`). Runtime membuat client dengan `new PrismaMariaDb(DATABASE_URL)`
  di `src/lib/prisma.ts`. Import client dari `@/generated/prisma/client` (di-*gitignore* di `src/generated`).
- **shadcn = Base UI.** `Button` pakai prop `render={<Link/>}` + `nativeButton={false}`, bukan `asChild`.
- **Cache Components.** Dilarang `export const runtime = "nodejs"` di route handler. Untuk layout/route
  authed yang pakai `cookies()`, set `export const instant = false` (lihat `src/app/admin/(panel)/layout.tsx`).
- **Prerender.** `next build` memblokir `new Date()`/`Date.now()` saat render. Hitung waktu di effect/handler.
- **Cookie.** Tamu: `vanry_guest` = opaque token (HttpOnly/Lax), DB simpan `sha256(token)`.
  Admin: `vanry_admin` = payload+HMAC (`SESSION_SECRET`). Ambil token via `next/headers cookies()`.

## Command

```text
npm run dev          # http://localhost:3000
npm run build
npm run lint
npm run typecheck
npm run test         # vitest (unit: crypto, config, rate-limit)
npm run db:generate  # prisma generate
npm run db:migrate   # prisma migrate dev (buat + apply migration)
npm run db:deploy    # prisma migrate deploy (produksi)
npm run db:seed      # seed org + admin + event
```

Prisma CLI butuh MySQL. Kredensial ada di `.env.local` (jangan dibaca/ditulis ke git).

## Struktur kunci

- Rute tamu: `/`, `/mulai`, `/izin-kamera`, `/kamera`, `/galeri`, `/kolase` (tanpa `/menunggu`).
- Admin: `src/app/admin/(panel)/*` (`/admin`, `/admin/tamu`, `/admin/qr`, `/admin/foto`,
  `/admin/pengaturan`) + `/admin/login`. Layout panel guard via `getAdminUserFromCookies()`.
- API tamu: `POST /api/sessions`, `GET /api/sessions/me`, `POST /api/sessions/me/photos/reserve`,
  `POST /api/photos/[id]/upload`, `GET /api/sessions/me/photos`, `GET /api/photos/[id]/download`.
- API kolase: `GET /api/sessions/me/collage`, `POST /api/sessions/me/collage/reserve`,
  `POST /api/upload/collage` (FormData `file` → GAS/Drive), `GET /api/collage/[id]/image`
  (proxy gambar dari Drive, divalidasi sesi/ownership), `GET /api/collages/[id]/download`
  (unduh ber-guard), `GET /api/collages/[id]/preview` (alias inline).
- API admin: `/api/admin/auth/{login,logout,me}`, `/api/admin/{overview,guests,photos,audit,event}`,
  `GET /api/admin/photos/[id]` (pratinjau biner dari MySQL).
- Lib server: `src/lib/{prisma,quota,collage-quota,image,collage-drive,gas,guest-guard,guest-session,admin-auth,admin-guard,event,crypto,audit,rate-limit}.ts`.
- Lib klien (browser-only): `src/lib/{photo-store,image-capture,api-client}.ts` (IndexedDB, kompresi, fetch).
- State tamu di klien: `src/components/session-provider.tsx` (fetch `/api/sessions/me`, bukan localStorage).
- Skema DB & tabel: lihat `PRD.md` (tanpa `event_tables`/`table_id`).

## Detail yang mudah terlewat

- **Kuota server** divalidasi `SELECT ... FOR UPDATE` (`src/lib/quota.ts`). `RESERVED` + `UPLOADED` dihitung;
  `FAILED` tidak. Upload klien mengirim blob via `POST /api/photos/:id/upload` (`Content-Type: image/*`).
- **IndexedDB** (`src/lib/photo-store.ts`) menyimpan blob sebelum upload. Idempotency key dibuat saat
  jepret (`newIdempotencyKey`) dan dipakai ulang saat retry, jadi foto gagal tetap bisa diunggah tanpa duplikat.
- **Batas ukuran**: `MAX_PHOTO_BYTES = 4MB`. Vercel membatasi body request serverless ~4.5MB, jadi jangan
  naikkan tanpa proxy/stream. Klien mengompres ke `CLIENT_PHOTO_TARGET_BYTES = 3MB` (`src/lib/image-capture.ts`).
- **Validasi gambar**: `src/lib/image.ts` membaca dimensi JPEG/PNG/WebP dari header dan menolak yang di
  luar `MIN_PHOTO_DIMENSION`/`MAX_PHOTO_DIMENSION`. Upload menyimpan `fileData` (Buffer) + `width`/`height`.
- **Penyimpanan MySQL**: `photos.fileData` = `LONGBLOB` (Buffer biner). Unduh/pratinjau mengembalikan
  `new NextResponse(new Uint8Array(fileData))`; jangan kirim blob mentah di luar endpoint ber-guard.
- **Kolase**: dibuat di klien (`src/lib/collage-compose.ts`) dari blob IndexedDB dengan grid tetap
  4=2x2, 8=2x4, 16=4x4, 32=4x8 (object-fit cover, background ivory `#FAF7F2`, satu file JPEG).
  `reserveCollage` (`src/lib/collage-quota.ts`) satu kolase per sesi. Unggah lewat
  `POST /api/upload/collage` → `uploadCollageToGas` (`src/lib/gas.ts`) → GAS simpan ke Drive.
  Galeri menampilkan kolase; preview/unduh diproksi dari Drive (`src/lib/collage-drive.ts`).
- **Kolase di MySQL bukan biner**: `collages` menyimpan `photoCount`, `mimeType`, `byteSize`,
  `width`, `height`, `driveFileUrl`, `driveFileId`, `driveFileName`, `status`, `uploadedAt`.
  Jangan simpan `fileData`. Gambar galeri diproksi dari Drive via `driveFileId`; jangan kirim link
  Drive langsung ke tamu.
- **iOS safe area**: layout memakai `viewportFit: "cover"` + padding `env(safe-area-inset-*)` di `guest-shell.tsx`.
- Rate limit in-memory (`src/lib/rate-limit.ts`) — best-effort per instance, bukan lintas-serverless.
- Audit log ditulis ke `audit_logs` untuk aksi penting (session, reserve, upload, login, event update).
- Kerjakan bertahap: bila output panjang, berhenti di akhir file utuh dan sebutkan file berikutnya.
  Setiap respons sertakan command, checklist pengujian, dan daftar file berikutnya.