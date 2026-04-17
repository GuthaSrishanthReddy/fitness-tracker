/*
  Warnings:

  - Added the required column `calories` to the `Plan` table without a default value. This is not possible if the table is not empty.
  - Added the required column `carbs` to the `Plan` table without a default value. This is not possible if the table is not empty.
  - Added the required column `fats` to the `Plan` table without a default value. This is not possible if the table is not empty.
  - Added the required column `protein` to the `Plan` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Plan" ADD COLUMN     "calories" INTEGER NOT NULL,
ADD COLUMN     "carbs" INTEGER NOT NULL,
ADD COLUMN     "fats" INTEGER NOT NULL,
ADD COLUMN     "protein" INTEGER NOT NULL;
