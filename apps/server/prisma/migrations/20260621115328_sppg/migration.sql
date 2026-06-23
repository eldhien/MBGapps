DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'BatchStatus') THEN
    CREATE TYPE "BatchStatus" AS ENUM ('DRAFT', 'SCHEDULED', 'IN_PRODUCTION', 'DISTRIBUTED', 'CANCELLED');
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'DistributionStatus') THEN
    CREATE TYPE "DistributionStatus" AS ENUM ('PENDING', 'IN_TRANSIT', 'DELIVERED', 'FAILED');
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'FoodReportStatus') THEN
    CREATE TYPE "FoodReportStatus" AS ENUM ('PENDING', 'REVIEWED', 'RESOLVED');
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'ReportCategory') THEN
    CREATE TYPE "ReportCategory" AS ENUM ('BASI', 'RUSAK', 'TERLAMBAT', 'SUHU_TIDAK_SESUAI', 'LAINNYA');
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'ReceivingStatus') THEN
    CREATE TYPE "ReceivingStatus" AS ENUM ('PENDING', 'COMPLETED', 'REJECTED');
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS "batches" (
    "id" TEXT NOT NULL,
    "batch_id_unik" TEXT NOT NULL,
    "namaMenu" TEXT NOT NULL,
    "jumlahPorsi" INTEGER NOT NULL,
    "komposisi" TEXT NOT NULL,
    "waktu_produksi" TIMESTAMP(3) NOT NULL,
    "driverId" TEXT,
    "photoUrl" TEXT,
    "status" "BatchStatus" NOT NULL DEFAULT 'DRAFT',
    "sppgId" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "batches_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "distributions" (
    "id" TEXT NOT NULL,
    "batchId" TEXT NOT NULL,
    "sekolahId" TEXT NOT NULL,
    "waktu_kirim" TIMESTAMP(3),
    "jumlahPorsi" INTEGER NOT NULL,
    "status" "DistributionStatus" NOT NULL DEFAULT 'PENDING',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "distributions_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "food_reports" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
    "kategori" "ReportCategory" NOT NULL,
    "deskripsi" TEXT NOT NULL,
    "sekolahId" TEXT NOT NULL,
    "batchId" TEXT,
    "status" "FoodReportStatus" NOT NULL DEFAULT 'PENDING',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "food_reports_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "student_complaints" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
    "jumlahSiswa" INTEGER NOT NULL,
    "gejala" TEXT NOT NULL,
    "waktu_kejadian" TIMESTAMP(3) NOT NULL,
    "tindakan" TEXT NOT NULL,
    "sekolahId" TEXT NOT NULL,
    "batchId" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "student_complaints_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "receiving_receipts" (
    "id" TEXT NOT NULL,
    "distributionId" TEXT NOT NULL,
    "status" "ReceivingStatus" NOT NULL DEFAULT 'PENDING',
    "catatan" TEXT,
    "timestamp" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "receiving_receipts_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "batches_batch_id_unik_key" ON "batches"("batch_id_unik");
CREATE UNIQUE INDEX IF NOT EXISTS "receiving_receipts_distributionId_key" ON "receiving_receipts"("distributionId");
CREATE INDEX IF NOT EXISTS "food_reports_sekolah_id_idx" ON "food_reports"("sekolahId");
CREATE INDEX IF NOT EXISTS "food_reports_created_at_idx" ON "food_reports"("created_at");
CREATE INDEX IF NOT EXISTS "student_complaints_sekolah_id_idx" ON "student_complaints"("sekolahId");
CREATE INDEX IF NOT EXISTS "student_complaints_waktu_kejadian_idx" ON "student_complaints"("waktu_kejadian");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'distributions_batchId_fkey'
      AND conrelid = 'public.distributions'::regclass
  ) THEN
    ALTER TABLE "distributions"
      ADD CONSTRAINT "distributions_batchId_fkey"
      FOREIGN KEY ("batchId") REFERENCES "batches"("id")
      ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'receiving_receipts_distributionId_fkey'
      AND conrelid = 'public.receiving_receipts'::regclass
  ) THEN
    ALTER TABLE "receiving_receipts"
      ADD CONSTRAINT "receiving_receipts_distributionId_fkey"
      FOREIGN KEY ("distributionId") REFERENCES "distributions"("id")
      ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
END $$;
