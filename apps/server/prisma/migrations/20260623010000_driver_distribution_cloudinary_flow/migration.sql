DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'BatchDistributionStatus') THEN
    CREATE TYPE "public"."BatchDistributionStatus" AS ENUM ('DRAFT', 'DIKIRIM', 'SELESAI', 'BERMASALAH');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'BatchDistributionSchoolStatus') THEN
    CREATE TYPE "public"."BatchDistributionSchoolStatus" AS ENUM ('MENUNGGU', 'DITERIMA', 'DITOLAK');
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS "public"."drivers" (
  "id" UUID NOT NULL,
  "name" TEXT NOT NULL,
  "phone" TEXT,
  "vehicle_number" TEXT,
  "is_active" BOOLEAN NOT NULL DEFAULT true,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "drivers_pkey" PRIMARY KEY ("id")
);

INSERT INTO "public"."drivers" ("id", "name", "is_active", "created_at", "updated_at")
SELECT "id", "username", true, "created_at", CURRENT_TIMESTAMP
FROM "public"."users"
WHERE "role"::text = 'DRIVER'
ON CONFLICT ("id") DO NOTHING;

DO $$
DECLARE
  constraint_name text;
BEGIN
  FOR constraint_name IN
    SELECT con.conname
    FROM pg_constraint con
    JOIN pg_class rel ON rel.oid = con.conrelid
    JOIN pg_namespace nsp ON nsp.oid = rel.relnamespace
    JOIN unnest(con.conkey) key(attnum) ON true
    JOIN pg_attribute att ON att.attrelid = rel.oid AND att.attnum = key.attnum
    WHERE nsp.nspname = 'public'
      AND rel.relname = 'batch_produksi'
      AND con.contype = 'f'
      AND att.attname = 'driverId'
  LOOP
    EXECUTE format('ALTER TABLE "public"."batch_produksi" DROP CONSTRAINT %I', constraint_name);
  END LOOP;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'batch_produksi_driverId_fkey'
  ) THEN
    ALTER TABLE "public"."batch_produksi"
      ADD CONSTRAINT "batch_produksi_driverId_fkey"
      FOREIGN KEY ("driverId") REFERENCES "public"."drivers"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS "public"."batch_distributions" (
  "id" UUID NOT NULL,
  "batch_id" TEXT NOT NULL,
  "waktu_kirim" TIMESTAMP(3),
  "status" "public"."BatchDistributionStatus" NOT NULL DEFAULT 'DIKIRIM',
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "batch_distributions_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "public"."batch_distribution_schools" (
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

CREATE INDEX IF NOT EXISTS "batch_distributions_batch_id_idx" ON "public"."batch_distributions"("batch_id");
CREATE INDEX IF NOT EXISTS "batch_distribution_schools_school_id_idx" ON "public"."batch_distribution_schools"("school_id");
CREATE UNIQUE INDEX IF NOT EXISTS "batch_distribution_schools_distribution_id_school_id_key"
  ON "public"."batch_distribution_schools"("distribution_id", "school_id");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'batch_distributions_batch_id_fkey'
  ) THEN
    ALTER TABLE "public"."batch_distributions"
      ADD CONSTRAINT "batch_distributions_batch_id_fkey"
      FOREIGN KEY ("batch_id") REFERENCES "public"."batch_produksi"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'batch_distribution_schools_distribution_id_fkey'
  ) THEN
    ALTER TABLE "public"."batch_distribution_schools"
      ADD CONSTRAINT "batch_distribution_schools_distribution_id_fkey"
      FOREIGN KEY ("distribution_id") REFERENCES "public"."batch_distributions"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'batch_distribution_schools_school_id_fkey'
  ) THEN
    ALTER TABLE "public"."batch_distribution_schools"
      ADD CONSTRAINT "batch_distribution_schools_school_id_fkey"
      FOREIGN KEY ("school_id") REFERENCES "public"."schools"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;
