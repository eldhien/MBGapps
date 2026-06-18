DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'UserRole') THEN
    CREATE TYPE "UserRole" AS ENUM ('SUPER_ADMIN', 'SPPG', 'SEKOLAH');
  END IF;
END $$;

DO $$
BEGIN
  IF to_regclass('public.users') IS NULL
     AND to_regclass('public.user_profiles') IS NOT NULL THEN
    ALTER TABLE "user_profiles" RENAME TO "users";
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS "users" (
    "id" UUID NOT NULL,
    "username" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "role" "UserRole" NOT NULL DEFAULT 'SPPG',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "users_username_key" ON "users"("username");
