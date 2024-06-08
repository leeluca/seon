/*
  Warnings:

  - Made the column `initialValue` on table `Goal` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "Goal" ALTER COLUMN "initialValue" SET NOT NULL;
