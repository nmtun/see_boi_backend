-- CreateTable
CREATE TABLE "TagFollow" (
    "userId" INTEGER NOT NULL,
    "tagId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TagFollow_pkey" PRIMARY KEY ("userId","tagId")
);

-- CreateIndex
CREATE INDEX "TagFollow_userId_idx" ON "TagFollow"("userId");

-- CreateIndex
CREATE INDEX "TagFollow_tagId_idx" ON "TagFollow"("tagId");

-- AddForeignKey
ALTER TABLE "TagFollow" ADD CONSTRAINT "TagFollow_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TagFollow" ADD CONSTRAINT "TagFollow_tagId_fkey" FOREIGN KEY ("tagId") REFERENCES "Tag"("id") ON DELETE CASCADE ON UPDATE CASCADE;
