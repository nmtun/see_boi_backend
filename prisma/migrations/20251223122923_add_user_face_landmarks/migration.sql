-- CreateTable
CREATE TABLE "UserFaceLandmarks" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "landmarks" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserFaceLandmarks_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "UserFaceLandmarks" ADD CONSTRAINT "UserFaceLandmarks_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
