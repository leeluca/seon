-- Existing values are signed refresh JWTs, not opaque-session hashes. They
-- cannot be migrated safely, so this release intentionally requires one new
-- sign-in while preserving every user and domain-data row.
DELETE FROM "refresh_token";--> statement-breakpoint
ALTER TABLE "refresh_token" RENAME COLUMN "token" TO "tokenHash";--> statement-breakpoint
ALTER TABLE "refresh_token" DROP CONSTRAINT "refresh_token_token_unique";--> statement-breakpoint
ALTER TABLE "goal" ADD COLUMN IF NOT EXISTS "archivedAt" timestamp(3) with time zone;--> statement-breakpoint
ALTER TABLE "refresh_token" ADD CONSTRAINT "refresh_token_tokenHash_unique" UNIQUE("tokenHash");
