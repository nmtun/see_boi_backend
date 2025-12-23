-- CreateEnum
CREATE TYPE "CommentCategory" AS ENUM ('POSITIVE', 'NEGATIVE', 'NEUTRAL', 'TOXIC');

-- AlterTable
ALTER TABLE "Comment" ADD COLUMN     "category" "CommentCategory" DEFAULT 'NEUTRAL';
