## Installation

### 1. Install dependencies

Jalankan dari folder masing-masing aplikasi:

```bash
cd apps/server
npm install

cd ../website
npm install
```

### 2. Setup environment server

Buat file `apps/server/.env` dari `apps/server/.env.example`, lalu isi konfigurasi database dan secret JWT.

### 3. Setup Prisma setelah clone pertama kali

Jalankan semua command Prisma dari folder `apps/server`.

```bash
cd apps/server
```

Generate Prisma Client agar TypeScript bisa membaca model dari `prisma/schema.prisma`:

```bash
npx prisma generate
```

Apply migration yang sudah ada di repo ke database lokal:

```bash
npx prisma migrate deploy
```

Cek status migration jika ingin memastikan database sudah sinkron:

```bash
npx prisma migrate status
```

Catatan penting:

- Jangan menjalankan `npx prisma init` lagi setelah clone, karena schema dan folder Prisma sudah ada di repo.
- Default koneksi lokal memakai database PostgreSQL `mbg_app` di `localhost:5432` dengan user/password `postgres`/`postgres`. Sesuaikan `apps/server/.env` jika konfigurasi PostgreSQL lokal berbeda.

Untuk development migration baru, gunakan:

```bash
npx prisma migrate dev
```

Setelah mengubah schema Prisma, generate ulang client:

```bash
npx prisma generate
```

### 4. Setup environment website

Website secara default mengarah ke API `http://localhost:4000`.

Jika perlu override, buat `apps/website/.env.local`:

### 5. Menjalankan aplikasi

Buka dua terminal.

Terminal backend:

```bash
cd apps/server
npm run dev
```

Terminal frontend:

```bash
cd apps/website
npm run dev
```

Port default:

- Website: `http://localhost:5173`
- Server API: `http://localhost:4000`

### 6. Quality check

Jalankan typecheck sesuai kebutuhan:

```bash
cd apps/server
npm run typecheck

cd ../website
npm run typecheck
```

### Catatan role

Aplikasi mendukung tiga role pengguna:

- `SUPER_ADMIN`: akses manajemen pengguna dan semua halaman fitur.
- `SPPG`: akses dashboard dan fitur operasional SPPG.
- `SEKOLAH`: akses dashboard dan fitur sekolah.
