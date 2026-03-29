/*
  Warnings:

  - You are about to drop the column `calories` on the `Plan` table. All the data in the column will be lost.
  - You are about to drop the column `carbs` on the `Plan` table. All the data in the column will be lost.
  - You are about to drop the column `fats` on the `Plan` table. All the data in the column will be lost.
  - You are about to drop the column `protein` on the `Plan` table. All the data in the column will be lost.
  - You are about to drop the column `creatineIntake` on the `Progress` table. All the data in the column will be lost.
  - You are about to drop the column `creatinine` on the `Progress` table. All the data in the column will be lost.
  - You are about to drop the column `fastingSugar` on the `Progress` table. All the data in the column will be lost.
  - You are about to drop the column `hba1c` on the `Progress` table. All the data in the column will be lost.
  - You are about to drop the column `hdl` on the `Progress` table. All the data in the column will be lost.
  - You are about to drop the column `ldl` on the `Progress` table. All the data in the column will be lost.
  - You are about to drop the column `postPrandialSugar` on the `Progress` table. All the data in the column will be lost.
  - You are about to drop the column `totalCholesterol` on the `Progress` table. All the data in the column will be lost.
  - You are about to drop the column `triglycerides` on the `Progress` table. All the data in the column will be lost.
  - You are about to drop the column `urea` on the `Progress` table. All the data in the column will be lost.
  - You are about to drop the column `uricAcid` on the `Progress` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Plan" DROP COLUMN "calories",
DROP COLUMN "carbs",
DROP COLUMN "fats",
DROP COLUMN "protein";

-- AlterTable
ALTER TABLE "Progress" DROP COLUMN "creatineIntake",
DROP COLUMN "creatinine",
DROP COLUMN "fastingSugar",
DROP COLUMN "hba1c",
DROP COLUMN "hdl",
DROP COLUMN "ldl",
DROP COLUMN "postPrandialSugar",
DROP COLUMN "totalCholesterol",
DROP COLUMN "triglycerides",
DROP COLUMN "urea",
DROP COLUMN "uricAcid";
