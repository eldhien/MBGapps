DROP INDEX IF EXISTS "kitchen_checklists_school_id_idx";

DO $$
BEGIN
  IF to_regclass('public.kitchen_checklists') IS NOT NULL THEN
    ALTER TABLE public."kitchen_checklists"
      DROP COLUMN IF EXISTS "school_id",
      DROP COLUMN IF EXISTS "schoolId";
  END IF;
END $$;
