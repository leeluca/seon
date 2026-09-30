ALTER TABLE "goal" ALTER COLUMN "target" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "goal" ALTER COLUMN "targetDate" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "goal" ALTER COLUMN "targetDate" DROP NOT NULL;