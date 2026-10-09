-- AlterTable
ALTER TABLE "User" ADD COLUMN     "favouriteLeagues" "League"[] DEFAULT ARRAY[]::"League"[],
ADD COLUMN     "notifyAuctionResults" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "notifyNewContracts" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "notifyPayouts" BOOLEAN NOT NULL DEFAULT true;

-- CreateTable
CREATE TABLE "FavouriteTeam" (
    "userId" TEXT NOT NULL,
    "teamId" TEXT NOT NULL,

    CONSTRAINT "FavouriteTeam_pkey" PRIMARY KEY ("userId","teamId")
);

-- AddForeignKey
ALTER TABLE "FavouriteTeam" ADD CONSTRAINT "FavouriteTeam_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FavouriteTeam" ADD CONSTRAINT "FavouriteTeam_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE CASCADE ON UPDATE CASCADE;

