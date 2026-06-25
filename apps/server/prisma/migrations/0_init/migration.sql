-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "public"."BatchDistributionSchoolStatus" AS ENUM ('MENUNGGU', 'DITERIMA', 'DITOLAK');

-- CreateEnum
CREATE TYPE "public"."BatchDistributionStatus" AS ENUM ('DRAFT', 'DIKIRIM', 'SELESAI', 'BERMASALAH');

-- CreateEnum
CREATE TYPE "public"."BatchStatus" AS ENUM ('DRAFT', 'DIPRODUKSI', 'SIAP_KIRIM', 'TERKIRIM');

-- CreateEnum
CREATE TYPE "public"."DistributionStatus" AS ENUM ('PENDING', 'IN_TRANSIT', 'DELIVERED', 'FAILED');

-- CreateEnum
CREATE TYPE "public"."FoodReportStatus" AS ENUM ('PENDING', 'REVIEWED', 'RESOLVED');

-- CreateEnum
CREATE TYPE "public"."FotoType" AS ENUM ('PROSES_MASAK', 'MAKANAN_JADI');

-- CreateEnum
CREATE TYPE "public"."KategoriKomposisi" AS ENUM ('MAKANAN_POKOK', 'LAUK_PAUK', 'SAYUR', 'BUAH', 'SUSU');

-- CreateEnum
CREATE TYPE "public"."LegacyBatchStatus" AS ENUM ('DRAFT', 'SCHEDULED', 'IN_PRODUCTION', 'DISTRIBUTED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "public"."MenuCategory" AS ENUM ('MENU_UTAMA', 'LAUK', 'SAYUR', 'BUAH', 'SUSU_SNACK');

-- CreateEnum
CREATE TYPE "public"."ReceivingStatus" AS ENUM ('PENDING', 'COMPLETED', 'REJECTED');

-- CreateEnum
CREATE TYPE "public"."ReportCategory" AS ENUM ('BASI', 'RUSAK', 'TERLAMBAT', 'SUHU_TIDAK_SESUAI', 'LAINNYA');

-- CreateEnum
CREATE TYPE "public"."SchoolProgressStatus" AS ENUM ('BELUM_ADA', 'MENUNGGU_PRODUKSI', 'DIPRODUKSI', 'SIAP_DIKIRIM', 'DIKIRIM', 'DITERIMA', 'BERMASALAH');

-- CreateEnum
CREATE TYPE "public"."UserRole" AS ENUM ('SUPER_ADMIN', 'SPPG', 'SEKOLAH', 'DRIVER');

-- CreateTable
CREATE TABLE "public"."batch_bahan" (
    "id" UUID NOT NULL,
    "varianId" UUID NOT NULL,
    "kategori" "public"."KategoriKomposisi",
    "namaBahan" TEXT NOT NULL,
    "jumlah" DOUBLE PRECISION NOT NULL,
    "satuan" TEXT NOT NULL,
    "harga" DOUBLE PRECISION,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "batch_bahan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."batch_distribution_schools" (
    "id" UUID NOT NULL,
    "distribution_id" UUID NOT NULL,
    "school_id" UUID NOT NULL,
    "jumlah_porsi" INTEGER NOT NULL,
    "status" "public"."BatchDistributionSchoolStatus" NOT NULL DEFAULT 'MENUNGGU',
    "received_at" TIMESTAMP(3),
    "rejected_reason" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "batch_distribution_schools_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."batch_distributions" (
    "id" UUID NOT NULL,
    "batch_id" TEXT NOT NULL,
    "waktu_kirim" TIMESTAMP(3),
    "status" "public"."BatchDistributionStatus" NOT NULL DEFAULT 'DIKIRIM',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "batch_distributions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."batch_foto" (
    "id" UUID NOT NULL,
    "batchId" TEXT NOT NULL,
    "jenis" "public"."FotoType" NOT NULL,
    "url" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "batch_foto_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."batch_produksi" (
    "id" TEXT NOT NULL,
    "menuId" UUID NOT NULL,
    "totalPorsi" INTEGER NOT NULL,
    "waktuMulai" TIMESTAMP(3),
    "waktuSelesai" TIMESTAMP(3),
    "petugasId" UUID,
    "driverId" UUID,
    "noKendaraan" TEXT,
    "ruteDistribusi" TEXT,
    "jamKeberangkatan" TIMESTAMP(3),
    "status" "public"."BatchStatus" NOT NULL DEFAULT 'DRAFT',
    "catatanKualitas" TEXT,
    "isApproved" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "batch_produksi_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."batch_sekolah" (
    "id" UUID NOT NULL,
    "batchId" TEXT NOT NULL,
    "sekolahId" UUID,
    "porsi" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "batch_sekolah_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."batch_varian" (
    "id" UUID NOT NULL,
    "batchId" TEXT NOT NULL,
    "namaVarian" TEXT NOT NULL,
    "jumlahPorsi" INTEGER NOT NULL,
    "energi" DOUBLE PRECISION,
    "protein" DOUBLE PRECISION,
    "lemak" DOUBLE PRECISION,
    "karbohidrat" DOUBLE PRECISION,
    "serat" DOUBLE PRECISION,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "batch_varian_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."batches" (
    "id" TEXT NOT NULL,
    "batch_id_unik" TEXT NOT NULL,
    "namaMenu" TEXT NOT NULL,
    "jumlahPorsi" INTEGER NOT NULL,
    "komposisi" TEXT NOT NULL,
    "waktu_produksi" TIMESTAMP(3) NOT NULL,
    "driverId" TEXT,
    "photoUrl" TEXT,
    "status" "public"."LegacyBatchStatus" NOT NULL DEFAULT 'DRAFT',
    "sppgId" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "batches_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."dapur_daily_capacities" (
    "id" UUID NOT NULL,
    "date" DATE NOT NULL,
    "capacity" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "dapur_daily_capacities_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."distributions" (
    "id" TEXT NOT NULL,
    "batchId" TEXT NOT NULL,
    "sekolahId" TEXT NOT NULL,
    "waktu_kirim" TIMESTAMP(3),
    "jumlahPorsi" INTEGER NOT NULL,
    "status" "public"."DistributionStatus" NOT NULL DEFAULT 'PENDING',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "distributions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."drivers" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "phone" TEXT,
    "vehicle_number" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "drivers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."food_reports" (
    "id" TEXT NOT NULL,
    "kategori" "public"."ReportCategory" NOT NULL,
    "kategori_lainnya" TEXT,
    "deskripsi" TEXT NOT NULL,
    "sekolahId" TEXT NOT NULL,
    "batchId" TEXT,
    "status" "public"."FoodReportStatus" NOT NULL DEFAULT 'PENDING',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "food_reports_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."kitchen_checklists" (
    "id" TEXT NOT NULL,
    "apd_photo" TEXT NOT NULL,
    "alat_photo" TEXT NOT NULL,
    "kebersihan_photo" TEXT NOT NULL,
    "kondisi_dapur" TEXT NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "kitchen_checklists_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."menu_masters" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "category" "public"."MenuCategory" NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "menu_masters_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."receiving_receipts" (
    "id" TEXT NOT NULL,
    "distributionId" TEXT NOT NULL,
    "status" "public"."ReceivingStatus" NOT NULL DEFAULT 'PENDING',
    "catatan" TEXT,
    "timestamp" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "receiving_receipts_pkey" PRIMARY KEY ("id")
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
CREATE TABLE "public"."student_complaints" (
    "id" TEXT NOT NULL,
    "jumlahSiswa" INTEGER NOT NULL,
    "gejala" TEXT NOT NULL,
    "waktu_kejadian" TIMESTAMP(3) NOT NULL,
    "tindakan" TEXT NOT NULL,
    "sekolahId" TEXT NOT NULL,
    "batchId" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "student_complaints_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."users" (
    "id" UUID NOT NULL,
    "username" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "role" "public"."UserRole" NOT NULL DEFAULT 'SPPG',
    "school_id" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "batch_distribution_schools_distribution_id_school_id_key" ON "public"."batch_distribution_schools"("distribution_id" ASC, "school_id" ASC);

-- CreateIndex
CREATE INDEX "batch_distribution_schools_school_id_idx" ON "public"."batch_distribution_schools"("school_id" ASC);

-- CreateIndex
CREATE INDEX "batch_distributions_batch_id_idx" ON "public"."batch_distributions"("batch_id" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "batches_batch_id_unik_key" ON "public"."batches"("batch_id_unik" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "dapur_daily_capacities_date_key" ON "public"."dapur_daily_capacities"("date" ASC);

-- CreateIndex
CREATE INDEX "food_reports_created_at_idx" ON "public"."food_reports"("created_at" ASC);

-- CreateIndex
CREATE INDEX "food_reports_sekolah_id_idx" ON "public"."food_reports"("sekolahId" ASC);

-- CreateIndex
CREATE INDEX "kitchen_checklists_timestamp_idx" ON "public"."kitchen_checklists"("timestamp" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "receiving_receipts_distributionId_key" ON "public"."receiving_receipts"("distributionId" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "school_progress_school_id_key" ON "public"."school_progress"("school_id" ASC);

-- CreateIndex
CREATE INDEX "schools_sppg_id_idx" ON "public"."schools"("sppg_id" ASC);

-- CreateIndex
CREATE INDEX "student_complaints_sekolah_id_idx" ON "public"."student_complaints"("sekolahId" ASC);

-- CreateIndex
CREATE INDEX "student_complaints_waktu_kejadian_idx" ON "public"."student_complaints"("waktu_kejadian" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "user_profiles_username_key" ON "public"."users"("username" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "users_school_id_key" ON "public"."users"("school_id" ASC);

-- AddForeignKey
ALTER TABLE "public"."batch_bahan" ADD CONSTRAINT "batch_bahan_varianId_fkey" FOREIGN KEY ("varianId") REFERENCES "public"."batch_varian"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."batch_distribution_schools" ADD CONSTRAINT "batch_distribution_schools_distribution_id_fkey" FOREIGN KEY ("distribution_id") REFERENCES "public"."batch_distributions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."batch_distribution_schools" ADD CONSTRAINT "batch_distribution_schools_school_id_fkey" FOREIGN KEY ("school_id") REFERENCES "public"."schools"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."batch_distributions" ADD CONSTRAINT "batch_distributions_batch_id_fkey" FOREIGN KEY ("batch_id") REFERENCES "public"."batch_produksi"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."batch_foto" ADD CONSTRAINT "batch_foto_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "public"."batch_produksi"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."batch_produksi" ADD CONSTRAINT "batch_produksi_driverId_fkey" FOREIGN KEY ("driverId") REFERENCES "public"."drivers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."batch_produksi" ADD CONSTRAINT "batch_produksi_menuId_fkey" FOREIGN KEY ("menuId") REFERENCES "public"."menu_masters"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."batch_produksi" ADD CONSTRAINT "batch_produksi_petugasId_fkey" FOREIGN KEY ("petugasId") REFERENCES "public"."users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."batch_sekolah" ADD CONSTRAINT "batch_sekolah_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "public"."batch_produksi"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."batch_sekolah" ADD CONSTRAINT "batch_sekolah_sekolahId_fkey" FOREIGN KEY ("sekolahId") REFERENCES "public"."users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."batch_varian" ADD CONSTRAINT "batch_varian_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "public"."batch_produksi"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."distributions" ADD CONSTRAINT "distributions_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "public"."batches"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."receiving_receipts" ADD CONSTRAINT "receiving_receipts_distributionId_fkey" FOREIGN KEY ("distributionId") REFERENCES "public"."distributions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."school_progress" ADD CONSTRAINT "school_progress_school_id_fkey" FOREIGN KEY ("school_id") REFERENCES "public"."schools"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."schools" ADD CONSTRAINT "schools_sppg_id_fkey" FOREIGN KEY ("sppg_id") REFERENCES "public"."users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."users" ADD CONSTRAINT "users_school_id_fkey" FOREIGN KEY ("school_id") REFERENCES "public"."schools"("id") ON DELETE SET NULL ON UPDATE CASCADE;

