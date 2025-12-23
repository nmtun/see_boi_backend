/*
  Warnings:

  - You are about to drop the column `imageUrl` on the `Comment` table. All the data in the column will be lost.

*/
-- CreateEnum
CREATE TYPE "ImageType" AS ENUM ('POST', 'COMMENT', 'USER');

-- AlterTable
ALTER TABLE "Comment" DROP COLUMN "imageUrl";

-- CreateTable
CREATE TABLE "Image" (
    "id" SERIAL NOT NULL,
    "url" TEXT NOT NULL,
    "type" "ImageType" NOT NULL,
    "entityId" INTEGER NOT NULL,
    "postId" INTEGER,
    "commentId" INTEGER,
    "userId" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Image_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Image_type_entityId_idx" ON "Image"("type", "entityId");

-- CreateIndex
CREATE INDEX "Image_postId_idx" ON "Image"("postId");

-- CreateIndex
CREATE INDEX "Image_commentId_idx" ON "Image"("commentId");

-- CreateIndex
CREATE INDEX "Image_userId_idx" ON "Image"("userId");

-- AddForeignKey
ALTER TABLE "Image" ADD CONSTRAINT "Image_postId_fkey" FOREIGN KEY ("postId") REFERENCES "Post"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Image" ADD CONSTRAINT "Image_commentId_fkey" FOREIGN KEY ("commentId") REFERENCES "Comment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Image" ADD CONSTRAINT "Image_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
