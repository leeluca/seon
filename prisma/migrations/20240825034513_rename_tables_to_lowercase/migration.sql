-- AlterTable
ALTER TABLE "entry" RENAME CONSTRAINT "Entry_pkey" TO "entry_pkey";

-- AlterTable
ALTER TABLE "goal" RENAME CONSTRAINT "Goal_pkey" TO "goal_pkey";

-- AlterTable
ALTER TABLE "user" RENAME CONSTRAINT "User_pkey" TO "user_pkey";

-- RenameIndex
ALTER INDEX "User_email_key" RENAME TO "user_email_key";

-- RenameIndex
ALTER INDEX "User_name_key" RENAME TO "user_name_key";
