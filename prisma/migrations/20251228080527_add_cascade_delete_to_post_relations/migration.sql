-- DropForeignKey
ALTER TABLE "Bookmark" DROP CONSTRAINT "Bookmark_postId_fkey";

-- DropForeignKey
ALTER TABLE "Poll" DROP CONSTRAINT "Poll_postId_fkey";

-- DropForeignKey
ALTER TABLE "PollOption" DROP CONSTRAINT "PollOption_pollId_fkey";

-- DropForeignKey
ALTER TABLE "PollVote" DROP CONSTRAINT "PollVote_pollOptionId_fkey";

-- DropForeignKey
ALTER TABLE "PostEditHistory" DROP CONSTRAINT "PostEditHistory_postId_fkey";

-- DropForeignKey
ALTER TABLE "PostLike" DROP CONSTRAINT "PostLike_postId_fkey";

-- DropForeignKey
ALTER TABLE "PostTag" DROP CONSTRAINT "PostTag_postId_fkey";

-- DropForeignKey
ALTER TABLE "PostView" DROP CONSTRAINT "PostView_postId_fkey";

-- AddForeignKey
ALTER TABLE "PostEditHistory" ADD CONSTRAINT "PostEditHistory_postId_fkey" FOREIGN KEY ("postId") REFERENCES "Post"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PostLike" ADD CONSTRAINT "PostLike_postId_fkey" FOREIGN KEY ("postId") REFERENCES "Post"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PostTag" ADD CONSTRAINT "PostTag_postId_fkey" FOREIGN KEY ("postId") REFERENCES "Post"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Bookmark" ADD CONSTRAINT "Bookmark_postId_fkey" FOREIGN KEY ("postId") REFERENCES "Post"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Poll" ADD CONSTRAINT "Poll_postId_fkey" FOREIGN KEY ("postId") REFERENCES "Post"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PollOption" ADD CONSTRAINT "PollOption_pollId_fkey" FOREIGN KEY ("pollId") REFERENCES "Poll"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PollVote" ADD CONSTRAINT "PollVote_pollOptionId_fkey" FOREIGN KEY ("pollOptionId") REFERENCES "PollOption"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PostView" ADD CONSTRAINT "PostView_postId_fkey" FOREIGN KEY ("postId") REFERENCES "Post"("id") ON DELETE CASCADE ON UPDATE CASCADE;
