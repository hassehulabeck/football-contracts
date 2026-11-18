-- CreateTable
CREATE TABLE "MiniLeague" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "inviteCode" TEXT NOT NULL,
    "ownerId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MiniLeague_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MiniLeagueMember" (
    "leagueId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MiniLeagueMember_pkey" PRIMARY KEY ("leagueId","userId")
);

-- CreateIndex
CREATE UNIQUE INDEX "MiniLeague_inviteCode_key" ON "MiniLeague"("inviteCode");

-- CreateIndex
CREATE INDEX "MiniLeagueMember_userId_idx" ON "MiniLeagueMember"("userId");

-- AddForeignKey
ALTER TABLE "MiniLeague" ADD CONSTRAINT "MiniLeague_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MiniLeagueMember" ADD CONSTRAINT "MiniLeagueMember_leagueId_fkey" FOREIGN KEY ("leagueId") REFERENCES "MiniLeague"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MiniLeagueMember" ADD CONSTRAINT "MiniLeagueMember_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

