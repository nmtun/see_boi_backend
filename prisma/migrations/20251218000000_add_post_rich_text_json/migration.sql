-- CreateEnum
CREATE TYPE "PostContentFormat" AS ENUM ('PLAIN_TEXT', 'TIPTAP_JSON');

-- AlterTable
ALTER TABLE "Post"
ADD COLUMN     "contentJson" JSONB,
ADD COLUMN     "contentText" TEXT,
ADD COLUMN     "contentFormat" "PostContentFormat" NOT NULL DEFAULT 'TIPTAP_JSON';


