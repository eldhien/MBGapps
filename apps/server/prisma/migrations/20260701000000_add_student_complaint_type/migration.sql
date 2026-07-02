CREATE TYPE "public"."StudentComplaintType" AS ENUM ('KELUHAN_MEDIS', 'KELUHAN_UMUM', 'PUJIAN', 'LAINNYA');

ALTER TABLE "public"."student_complaints"
ADD COLUMN "jenis_laporan" "public"."StudentComplaintType" NOT NULL DEFAULT 'KELUHAN_MEDIS';
