/*
  Warnings:

  - Added the required column `dob` to the `UserFaceLandmarks` table without a default value. This is not possible if the table is not empty.
  - Added the required column `gender` to the `UserFaceLandmarks` table without a default value. This is not possible if the table is not empty.
  - Added the required column `name` to the `UserFaceLandmarks` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "UserFaceLandmarks" ADD COLUMN     "dob" TIMESTAMP(3) NOT NULL,
ADD COLUMN     "gender" TEXT NOT NULL,
ADD COLUMN     "name" TEXT NOT NULL;
