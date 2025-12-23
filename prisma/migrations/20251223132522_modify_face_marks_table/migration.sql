/*
  Warnings:

  - You are about to drop the column `updatedAt` on the `UserFaceLandmarks` table. All the data in the column will be lost.
  - Added the required column `metrics` to the `UserFaceLandmarks` table without a default value. This is not possible if the table is not empty.
  - Added the required column `report` to the `UserFaceLandmarks` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "UserFaceLandmarks" DROP COLUMN "updatedAt",
ADD COLUMN     "metrics" JSONB NOT NULL,
ADD COLUMN     "report" JSONB NOT NULL,
ADD COLUMN     "tags" TEXT[];

-- CreateIndex
CREATE INDEX "UserFaceLandmarks_tags_idx" ON "UserFaceLandmarks"("tags");
