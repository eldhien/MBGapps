# Docker Setup MBG App

Project ini terdiri dari:
- `postgres`: database PostgreSQL.
- `server`: Express API di port `4000`.
- `website`: React/Vite build statis dengan nginx di port `8080`.

## Menjalankan

```bash
copy .env.docker.example .env
docker compose up --build
```

Akses:
- Website: `http://localhost:8080`
- API healthcheck: `http://localhost:4000/health`

Saat container `server` start, Prisma migration akan dijalankan otomatis dengan `prisma migrate deploy`.

## Seed Data

Jika butuh mengisi data awal:

```bash
docker compose --profile seed run --rm server-seed
```

## Mengubah Port/API URL

Edit `.env`:

```env
SERVER_PORT=4000
WEBSITE_PORT=8080
VITE_API_URL=http://localhost:4000
CLIENT_ORIGIN=http://localhost:8080
```

Karena `VITE_API_URL` dibaca saat build frontend, jalankan ulang build website setelah mengubahnya:

```bash
docker compose up --build website
```

## Reset Database Lokal Docker

```bash
docker compose down -v
docker compose up --build
```
