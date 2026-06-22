CREATE TABLE IF NOT EXISTS "kitchen_checklists" (
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

CREATE INDEX IF NOT EXISTS "kitchen_checklists_school_id_idx" ON "kitchen_checklists"("school_id");
CREATE INDEX IF NOT EXISTS "kitchen_checklists_timestamp_idx" ON "kitchen_checklists"("timestamp");
