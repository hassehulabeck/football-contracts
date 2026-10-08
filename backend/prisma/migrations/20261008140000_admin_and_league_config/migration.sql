-- AlterTable
ALTER TABLE "User" ADD COLUMN     "isAdmin" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "LeagueConfig" (
    "league" "League" NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "contractsPerWeek" INTEGER NOT NULL,
    "couponRatio" DOUBLE PRECISION NOT NULL DEFAULT 0.1,
    "couponMin" INTEGER NOT NULL DEFAULT 5,
    "couponMax" INTEGER NOT NULL DEFAULT 100,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "updatedById" TEXT,

    CONSTRAINT "LeagueConfig_pkey" PRIMARY KEY ("league")
);

-- Seed: 35 a week split by each league's share of teams, coupons at
-- clamp(round(players × 0.1), 5, 100). Mirrors DEFAULT_LEAGUE_CONFIG in
-- src/lib/contractBatch.ts, which the job falls back to if this table is empty.
INSERT INTO "LeagueConfig" ("league", "contractsPerWeek", "updatedAt") VALUES
    ('ALLSVENSKAN', 7, CURRENT_TIMESTAMP),
    ('SUPERETTAN', 7, CURRENT_TIMESTAMP),
    ('DAMALLSVENSKAN', 6, CURRENT_TIMESTAMP),
    ('ELITETTAN', 5, CURRENT_TIMESTAMP),
    ('CHAMPIONSHIP', 10, CURRENT_TIMESTAMP);
