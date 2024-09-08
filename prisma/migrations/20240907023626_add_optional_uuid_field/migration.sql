/*
  Warnings:

  - A unique constraint covering the columns `[uuid]` on the table `entry` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[uuid]` on the table `goal` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[uuid]` on the table `user` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "entry" ADD COLUMN     "uuid" UUID;

-- AlterTable
ALTER TABLE "goal" ADD COLUMN     "uuid" UUID;

-- AlterTable
ALTER TABLE "user" ADD COLUMN     "uuid" UUID;

-- CreateIndex
CREATE UNIQUE INDEX "entry_uuid_key" ON "entry"("uuid");

-- CreateIndex
CREATE UNIQUE INDEX "goal_uuid_key" ON "goal"("uuid");

-- CreateIndex
CREATE UNIQUE INDEX "user_uuid_key" ON "user"("uuid");
