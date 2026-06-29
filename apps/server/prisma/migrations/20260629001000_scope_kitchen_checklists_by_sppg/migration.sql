ALTER TABLE "public"."kitchen_checklists"
ADD COLUMN "sppg_id" UUID;

CREATE INDEX "kitchen_checklists_sppg_id_idx" ON "public"."kitchen_checklists"("sppg_id");

ALTER TABLE "public"."kitchen_checklists"
ADD CONSTRAINT "kitchen_checklists_sppg_id_fkey"
FOREIGN KEY ("sppg_id") REFERENCES "public"."users"("id")
ON DELETE SET NULL ON UPDATE CASCADE;
