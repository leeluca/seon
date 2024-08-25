-- DropForeignKey
ALTER TABLE "Entry" DROP CONSTRAINT "Entry_goalId_fkey";

-- DropForeignKey
ALTER TABLE "Goal" DROP CONSTRAINT "Goal_userId_fkey";

-- RenameTable
ALTER TABLE "Entry" RENAME TO "entry";

-- RenameTable
ALTER TABLE "Goal" RENAME TO "goal";

-- RenameTable
ALTER TABLE "User" RENAME TO "user"; ;

-- AddForeignKey
ALTER TABLE "goal" ADD CONSTRAINT "goal_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "entry" ADD CONSTRAINT "entry_goalId_fkey" FOREIGN KEY ("goalId") REFERENCES "goal"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
