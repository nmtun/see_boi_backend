-- CreateEnum
CREATE TYPE "TuViChartStatus" AS ENUM ('GENERATED', 'AI_INTERPRETED', 'EXPERT_INTERPRETED', 'DELETED');

-- CreateTable
CREATE TABLE "UserTuViChart" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "birthDate" TIMESTAMP(3) NOT NULL,
    "birthHour" DOUBLE PRECISION NOT NULL,
    "gender" TEXT NOT NULL,
    "birthPlace" TEXT,
    "isLunar" BOOLEAN NOT NULL,
    "can" TEXT NOT NULL,
    "chi" TEXT NOT NULL,
    "menhElement" TEXT NOT NULL,
    "chartData" JSONB NOT NULL,
    "interpretationAI" TEXT,
    "status" "TuViChartStatus" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserTuViChart_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "UserTuViChart" ADD CONSTRAINT "UserTuViChart_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
