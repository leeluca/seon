-- Current sql file was generated after introspecting the database
-- If you want to run this migration please uncomment this code before executing migrations
/*
DO $$ BEGIN
 CREATE TYPE "public"."UserStatus" AS ENUM('ACTIVE', 'PENDING', 'DISABLED');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "user" (
	"id" uuid PRIMARY KEY NOT NULL,
	"shortId" text,
	"name" text NOT NULL,
	"password" text NOT NULL,
	"email" text,
	"createdAt" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updatedAt" timestamp(3) NOT NULL,
	"status" "UserStatus" DEFAULT 'PENDING' NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "goal" (
	"id" uuid PRIMARY KEY NOT NULL,
	"shortId" text,
	"title" text NOT NULL,
	"description" text,
	"initialValue" integer DEFAULT 0 NOT NULL,
	"currentValue" integer DEFAULT 0 NOT NULL,
	"target" integer NOT NULL,
	"unit" text DEFAULT '' NOT NULL,
	"userId" uuid NOT NULL,
	"startDate" timestamp(3) NOT NULL,
	"targetDate" timestamp(3) NOT NULL,
	"createdAt" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updatedAt" timestamp(3) NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "entry" (
	"id" uuid PRIMARY KEY NOT NULL,
	"shortId" text,
	"goalId" uuid NOT NULL,
	"value" integer NOT NULL,
	"date" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"createdAt" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updatedAt" timestamp(3) NOT NULL
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "goal" ADD CONSTRAINT "goal_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."user"("id") ON DELETE restrict ON UPDATE cascade;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "entry" ADD CONSTRAINT "entry_goalId_fkey" FOREIGN KEY ("goalId") REFERENCES "public"."goal"("id") ON DELETE restrict ON UPDATE cascade;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "user_email_key" ON "user" USING btree ("email");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "user_name_key" ON "user" USING btree ("name");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "user_shortId_key" ON "user" USING btree ("shortId");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "goal_shortId_key" ON "goal" USING btree ("shortId");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "entry_shortId_key" ON "entry" USING btree ("shortId");
*/