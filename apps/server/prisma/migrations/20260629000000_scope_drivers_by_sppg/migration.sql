ALTER TABLE "public"."drivers"
ADD COLUMN "sppg_id" UUID;

CREATE INDEX "drivers_sppg_id_idx" ON "public"."drivers"("sppg_id");

ALTER TABLE "public"."drivers"
ADD CONSTRAINT "drivers_sppg_id_fkey"
FOREIGN KEY ("sppg_id") REFERENCES "public"."users"("id")
ON DELETE SET NULL ON UPDATE CASCADE;
