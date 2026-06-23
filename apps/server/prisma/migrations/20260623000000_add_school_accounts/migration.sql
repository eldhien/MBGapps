-- CreateEnum
ALTER TYPE "public"."UserRole" ADD VALUE IF NOT EXISTS 'DRIVER';

CREATE TYPE "public"."SchoolProgressStatus" AS ENUM (
  'BELUM_ADA',
  'MENUNGGU_PRODUKSI',
  'DIPRODUKSI',
  'SIAP_DIKIRIM',
  'DIKIRIM',
  'DITERIMA',
  'BERMASALAH'
);

-- CreateTable
CREATE TABLE "public"."schools" (
  "id" UUID NOT NULL,
  "name" TEXT NOT NULL,
  "npsn" TEXT,
  "address" TEXT,
  "sppg_id" UUID NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "schools_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."school_progress" (
  "id" UUID NOT NULL,
  "school_id" UUID NOT NULL,
  "status" "public"."SchoolProgressStatus" NOT NULL DEFAULT 'BELUM_ADA',
  "notes" TEXT,
  "updated_at" TIMESTAMP(3) NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "school_progress_pkey" PRIMARY KEY ("id")
);

-- AlterTable
ALTER TABLE "public"."users" ADD COLUMN "school_id" UUID;

-- CreateIndex
CREATE INDEX "schools_sppg_id_idx" ON "public"."schools"("sppg_id");

-- CreateIndex
CREATE UNIQUE INDEX "school_progress_school_id_key" ON "public"."school_progress"("school_id");

-- CreateIndex
CREATE UNIQUE INDEX "users_school_id_key" ON "public"."users"("school_id");

-- AddForeignKey
ALTER TABLE "public"."schools" ADD CONSTRAINT "schools_sppg_id_fkey" FOREIGN KEY ("sppg_id") REFERENCES "public"."users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."school_progress" ADD CONSTRAINT "school_progress_school_id_fkey" FOREIGN KEY ("school_id") REFERENCES "public"."schools"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."users" ADD CONSTRAINT "users_school_id_fkey" FOREIGN KEY ("school_id") REFERENCES "public"."schools"("id") ON DELETE SET NULL ON UPDATE CASCADE;
