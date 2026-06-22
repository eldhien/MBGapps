ALTER TABLE public."food_reports"
  ADD COLUMN IF NOT EXISTS "kategori_lainnya" TEXT;

UPDATE public."food_reports"
SET
  "kategori_lainnya" = COALESCE(
    "kategori_lainnya",
    substring("deskripsi" from '^Kategori lainnya: ([^\r\n]+)')
  ),
  "deskripsi" = regexp_replace(
    "deskripsi",
    '^Kategori lainnya: [^\r\n]+(\r?\n){2}',
    ''
  )
WHERE "kategori"::text = 'LAINNYA'
  AND "deskripsi" ~ '^Kategori lainnya: ';
