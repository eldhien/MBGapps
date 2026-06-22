DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'FoodReportStatus') THEN
    CREATE TYPE public."FoodReportStatus" AS ENUM ('PENDING', 'REVIEWED', 'RESOLVED');
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'ReportCategory') THEN
    CREATE TYPE public."ReportCategory" AS ENUM ('BASI', 'RUSAK', 'TERLAMBAT', 'SUHU_TIDAK_SESUAI', 'LAINNYA');
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS public."kitchen_checklists" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
    "school_id" TEXT NOT NULL,
    "apd_photo" TEXT NOT NULL,
    "alat_photo" TEXT NOT NULL,
    "kebersihan_photo" TEXT NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL,
    "kondisi_dapur" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "kitchen_checklists_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS public."food_reports" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
    "kategori" public."ReportCategory" NOT NULL,
    "deskripsi" TEXT NOT NULL,
    "sekolahId" TEXT NOT NULL,
    "batchId" TEXT,
    "status" public."FoodReportStatus" NOT NULL DEFAULT 'PENDING',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "food_reports_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS public."student_complaints" (
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

CREATE INDEX IF NOT EXISTS "kitchen_checklists_school_id_idx" ON public."kitchen_checklists"("school_id");
CREATE INDEX IF NOT EXISTS "kitchen_checklists_timestamp_idx" ON public."kitchen_checklists"("timestamp");
CREATE INDEX IF NOT EXISTS "food_reports_sekolah_id_idx" ON public."food_reports"("sekolahId");
CREATE INDEX IF NOT EXISTS "food_reports_created_at_idx" ON public."food_reports"("created_at");
CREATE INDEX IF NOT EXISTS "student_complaints_sekolah_id_idx" ON public."student_complaints"("sekolahId");
CREATE INDEX IF NOT EXISTS "student_complaints_waktu_kejadian_idx" ON public."student_complaints"("waktu_kejadian");
