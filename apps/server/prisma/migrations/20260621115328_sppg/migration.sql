/*
  Warnings:

  - You are about to drop the column `alat_photo` on the `kitchen_checklists` table. All the data in the column will be lost.
  - You are about to drop the column `apd_photo` on the `kitchen_checklists` table. All the data in the column will be lost.
  - You are about to drop the column `kebersihan_photo` on the `kitchen_checklists` table. All the data in the column will be lost.
  - You are about to drop the column `kondisi_dapur` on the `kitchen_checklists` table. All the data in the column will be lost.
  - You are about to drop the column `school_id` on the `kitchen_checklists` table. All the data in the column will be lost.
  - The primary key for the `users` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - Added the required column `alatPhoto` to the `kitchen_checklists` table without a default value. This is not possible if the table is not empty.
  - Added the required column `apdPhoto` to the `kitchen_checklists` table without a default value. This is not possible if the table is not empty.
  - Added the required column `kebersihanPhoto` to the `kitchen_checklists` table without a default value. This is not possible if the table is not empty.
  - Added the required column `kondisiDapur` to the `kitchen_checklists` table without a default value. This is not possible if the table is not empty.
  - Added the required column `schoolId` to the `kitchen_checklists` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "BatchStatus" AS ENUM ('DRAFT', 'SCHEDULED', 'IN_PRODUCTION', 'DISTRIBUTED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "DistributionStatus" AS ENUM ('PENDING', 'IN_TRANSIT', 'DELIVERED', 'FAILED');

-- CreateEnum
CREATE TYPE "FoodReportStatus" AS ENUM ('PENDING', 'REVIEWED', 'RESOLVED');

-- CreateEnum
CREATE TYPE "ReportCategory" AS ENUM ('BASI', 'RUSAK', 'TERLAMBAT', 'SUHU_TIDAK_SESUAI', 'LAINNYA');

-- CreateEnum
CREATE TYPE "ReceivingStatus" AS ENUM ('PENDING', 'COMPLETED', 'REJECTED');

-- DropIndex
DROP INDEX IF EXISTS "kitchen_checklists_school_id_idx";

-- DropIndex
DROP INDEX IF EXISTS "kitchen_checklists_timestamp_idx";

-- AlterTable
ALTER TABLE "kitchen_checklists" DROP COLUMN "alat_photo",
DROP COLUMN "apd_photo",
DROP COLUMN "kebersihan_photo",
DROP COLUMN "kondisi_dapur",
DROP COLUMN "school_id",
ADD COLUMN     "alatPhoto" TEXT NOT NULL,
ADD COLUMN     "apdPhoto" TEXT NOT NULL,
ADD COLUMN     "kebersihanPhoto" TEXT NOT NULL,
ADD COLUMN     "kondisiDapur" TEXT NOT NULL,
ADD COLUMN     "schoolId" TEXT NOT NULL,
ALTER COLUMN "id" DROP DEFAULT;

-- AlterTable
ALTER TABLE "users" DROP CONSTRAINT "users_pkey",
ALTER COLUMN "id" SET DATA TYPE TEXT,
ADD CONSTRAINT "users_pkey" PRIMARY KEY ("id");

-- CreateTable
CREATE TABLE "batches" (
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

-- CreateTable
CREATE TABLE "distributions" (
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

-- CreateTable
CREATE TABLE "food_reports" (
    "id" TEXT NOT NULL,
    "kategori" "ReportCategory" NOT NULL,
    "deskripsi" TEXT NOT NULL,
    "sekolahId" TEXT NOT NULL,
    "batchId" TEXT,
    "status" "FoodReportStatus" NOT NULL DEFAULT 'PENDING',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "food_reports_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "student_complaints" (
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
CREATE TABLE "receiving_receipts" (
    "id" TEXT NOT NULL,
    "distributionId" TEXT NOT NULL,
    "status" "ReceivingStatus" NOT NULL DEFAULT 'PENDING',
    "catatan" TEXT,
    "timestamp" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "receiving_receipts_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "batches_batch_id_unik_key" ON "batches"("batch_id_unik");

-- CreateIndex
CREATE UNIQUE INDEX "receiving_receipts_distributionId_key" ON "receiving_receipts"("distributionId");

-- AddForeignKey
ALTER TABLE "distributions" ADD CONSTRAINT "distributions_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "batches"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "receiving_receipts" ADD CONSTRAINT "receiving_receipts_distributionId_fkey" FOREIGN KEY ("distributionId") REFERENCES "distributions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;