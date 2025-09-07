CREATE TYPE "public"."GoalType" AS ENUM('COUNT', 'PROGRESS', 'BOOLEAN');--> statement-breakpoint
ALTER TABLE "refresh_token" RENAME COLUMN "expires" TO "expiresAt";--> statement-breakpoint
ALTER TABLE "entry" DROP CONSTRAINT "entry_goalId_fkey";
--> statement-breakpoint
ALTER TABLE "goal" DROP CONSTRAINT "goal_userId_fkey";
--> statement-breakpoint
DROP INDEX "user_name_key";--> statement-breakpoint
ALTER TABLE "entry" ALTER COLUMN "date" SET DATA TYPE timestamp(3) with time zone;--> statement-breakpoint
ALTER TABLE "entry" ALTER COLUMN "date" SET DEFAULT now();--> statement-breakpoint
ALTER TABLE "entry" ALTER COLUMN "userId" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "entry" ALTER COLUMN "createdAt" SET DATA TYPE timestamp(3) with time zone;--> statement-breakpoint
ALTER TABLE "entry" ALTER COLUMN "createdAt" SET DEFAULT now();--> statement-breakpoint
ALTER TABLE "entry" ALTER COLUMN "updatedAt" SET DATA TYPE timestamp(3) with time zone;--> statement-breakpoint
ALTER TABLE "entry" ALTER COLUMN "updatedAt" SET DEFAULT now();--> statement-breakpoint
ALTER TABLE "goal" ALTER COLUMN "startDate" SET DATA TYPE timestamp(3) with time zone;--> statement-breakpoint
ALTER TABLE "goal" ALTER COLUMN "startDate" SET DEFAULT now();--> statement-breakpoint
ALTER TABLE "goal" ALTER COLUMN "targetDate" SET DATA TYPE timestamp(3) with time zone;--> statement-breakpoint
ALTER TABLE "goal" ALTER COLUMN "targetDate" SET DEFAULT now();--> statement-breakpoint
ALTER TABLE "goal" ALTER COLUMN "createdAt" SET DATA TYPE timestamp(3) with time zone;--> statement-breakpoint
ALTER TABLE "goal" ALTER COLUMN "createdAt" SET DEFAULT now();--> statement-breakpoint
ALTER TABLE "goal" ALTER COLUMN "updatedAt" SET DATA TYPE timestamp(3) with time zone;--> statement-breakpoint
ALTER TABLE "refresh_token" ALTER COLUMN "createdAt" SET DATA TYPE timestamp(3) with time zone;--> statement-breakpoint
ALTER TABLE "refresh_token" ALTER COLUMN "createdAt" SET DEFAULT now();--> statement-breakpoint
ALTER TABLE "user" ALTER COLUMN "createdAt" SET DATA TYPE timestamp(3) with time zone;--> statement-breakpoint
ALTER TABLE "user" ALTER COLUMN "createdAt" SET DEFAULT now();--> statement-breakpoint
ALTER TABLE "user" ALTER COLUMN "updatedAt" SET DATA TYPE timestamp(3) with time zone;--> statement-breakpoint
ALTER TABLE "user" ALTER COLUMN "updatedAt" SET DEFAULT now();--> statement-breakpoint
ALTER TABLE "goal" ADD COLUMN "completionDate" timestamp(3) with time zone;--> statement-breakpoint
ALTER TABLE "goal" ADD COLUMN "type" "GoalType" DEFAULT 'COUNT' NOT NULL;--> statement-breakpoint
ALTER TABLE "refresh_token" ADD COLUMN "revokedAt" timestamp(3) with time zone;--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "useSync" boolean;--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "preferences" jsonb;--> statement-breakpoint
ALTER TABLE "entry" ADD CONSTRAINT "entry_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "entry" ADD CONSTRAINT "entry_goalId_fkey" FOREIGN KEY ("goalId") REFERENCES "public"."goal"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "goal" ADD CONSTRAINT "goal_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE cascade;