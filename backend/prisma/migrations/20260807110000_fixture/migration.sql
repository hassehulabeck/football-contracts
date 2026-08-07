-- Upcoming fixtures, so a contract page can show what a team has ahead of it
-- and not only the results that have already landed.
--
-- Separate from Match rather than nullable columns on it: a Match row asserts
-- a result, and findPatternWindow counts on that being true of every row it
-- reads. A fixture that has not kicked off has no result to assert.
--
-- Unique on (externalId, teamId), matching Match and for the same reason —
-- both clubs in a Swedish league fixture are tracked, so one fixture is two
-- rows and each side resolves its opponent from the sibling row.

CREATE TYPE "FixtureStatus" AS ENUM ('SCHEDULED', 'POSTPONED', 'CANCELLED');

CREATE TABLE "Fixture" (
    "id" TEXT NOT NULL,
    "externalId" INTEGER NOT NULL,
    "teamId" TEXT NOT NULL,
    "isHome" BOOLEAN NOT NULL,
    "kickoffAt" TIMESTAMP(3) NOT NULL,
    "status" "FixtureStatus" NOT NULL DEFAULT 'SCHEDULED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Fixture_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Fixture_externalId_teamId_key" ON "Fixture"("externalId", "teamId");

-- The contract page reads one team's fixtures ordered by kickoff on every view.
CREATE INDEX "Fixture_teamId_kickoffAt_idx" ON "Fixture"("teamId", "kickoffAt");

ALTER TABLE "Fixture" ADD CONSTRAINT "Fixture_teamId_fkey"
    FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
