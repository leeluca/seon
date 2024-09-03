/*
  Warnings:

  - A unique constraint covering the columns `[shortId]` on the table `entry` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[shortId]` on the table `goal` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[shortId]` on the table `user` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "entry" ADD COLUMN     "shortId" TEXT;

-- AlterTable
ALTER TABLE "goal" ADD COLUMN     "shortId" TEXT;

-- AlterTable
ALTER TABLE "user" ADD COLUMN     "shortId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "entry_shortId_key" ON "entry"("shortId");

-- CreateIndex
CREATE UNIQUE INDEX "goal_shortId_key" ON "goal"("shortId");

-- CreateIndex
CREATE UNIQUE INDEX "user_shortId_key" ON "user"("shortId");
