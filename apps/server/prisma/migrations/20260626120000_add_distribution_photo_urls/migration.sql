-- Add photo URL columns for batch distribution records
ALTER TABLE "public"."batch_distributions"
  ADD COLUMN IF NOT EXISTS "foto_dikemas_url" TEXT;

ALTER TABLE "public"."batch_distribution_schools"
  ADD COLUMN IF NOT EXISTS "bukti_terima_foto_url" TEXT;
