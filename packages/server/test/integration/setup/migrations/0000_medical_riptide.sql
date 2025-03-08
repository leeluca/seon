CREATE TYPE "public"."GoalType" AS ENUM('COUNT', 'PROGRESS', 'BOOLEAN');--> statement-breakpoint
CREATE TYPE "public"."UserStatus" AS ENUM('ACTIVE', 'PENDING', 'DISABLED');--> statement-breakpoint
CREATE TABLE "entry" (
	"id" uuid PRIMARY KEY NOT NULL,
	"shortId" text,
	"goalId" uuid NOT NULL,
	"value" integer NOT NULL,
	"date" timestamp(3) DEFAULT now() NOT NULL,
	"createdAt" timestamp(3) DEFAULT now() NOT NULL,
	"updatedAt" timestamp(3) DEFAULT now() NOT NULL,
	"userId" uuid NOT NULL
);
--> statement-breakpoint
CREATE TABLE "goal" (
	"id" uuid PRIMARY KEY NOT NULL,
	"shortId" text,
	"title" text NOT NULL,
	"description" text,
	"initialValue" integer DEFAULT 0 NOT NULL,
	"target" integer NOT NULL,
	"unit" text DEFAULT '' NOT NULL,
	"userId" uuid NOT NULL,
	"startDate" timestamp(3) DEFAULT now() NOT NULL,
	"targetDate" timestamp(3) DEFAULT now() NOT NULL,
	"createdAt" timestamp(3) DEFAULT now() NOT NULL,
	"updatedAt" timestamp(3) NOT NULL,
	"type" "GoalType" DEFAULT 'COUNT' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "refresh_token" (
	"id" serial PRIMARY KEY NOT NULL,
	"token" text NOT NULL,
	"userId" uuid NOT NULL,
	"expiration" timestamp (3) NOT NULL,
	"createdAt" timestamp(3) DEFAULT now() NOT NULL,
	CONSTRAINT "refresh_token_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "user" (
	"id" uuid PRIMARY KEY NOT NULL,
	"shortId" text,
	"name" text NOT NULL,
	"password" text NOT NULL,
	"email" text,
	"createdAt" timestamp(3) DEFAULT now() NOT NULL,
	"updatedAt" timestamp(3) DEFAULT now() NOT NULL,
	"status" "UserStatus" DEFAULT 'PENDING' NOT NULL,
	"useSync" boolean,
	"preferences" jsonb
);
--> statement-breakpoint
ALTER TABLE "entry" ADD CONSTRAINT "entry_goalId_fkey" FOREIGN KEY ("goalId") REFERENCES "public"."goal"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "entry" ADD CONSTRAINT "entry_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "goal" ADD CONSTRAINT "goal_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "refresh_token" ADD CONSTRAINT "refresh_token_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
CREATE UNIQUE INDEX "entry_shortId_key" ON "entry" USING btree ("shortId");--> statement-breakpoint
CREATE UNIQUE INDEX "goal_shortId_key" ON "goal" USING btree ("shortId");--> statement-breakpoint
CREATE UNIQUE INDEX "user_email_key" ON "user" USING btree ("email");--> statement-breakpoint
CREATE UNIQUE INDEX "user_shortId_key" ON "user" USING btree ("shortId");