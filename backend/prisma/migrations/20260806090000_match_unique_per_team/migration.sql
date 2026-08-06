-- One fixture must be able to produce one Match row per tracked team.
--
-- "Match_externalId_key" made the fixture id globally unique, so when both
-- clubs in a Swedish league match were tracked (the normal case) the second
-- side's upsert hit the first side's row: it overwrote `result` but left
-- `teamId` alone. The row then claimed team A had team B's result.

-- The existing rows cannot be repaired in place. Rows for the losing side of
-- each collision were never written at all, so there is nothing to correct
-- them from. Re-ingesting the season costs four API calls; see
-- `npm run ingest:matches -- --full`.
DELETE FROM "Match";

DROP INDEX "Match_externalId_key";

CREATE UNIQUE INDEX "Match_externalId_teamId_key" ON "Match"("externalId", "teamId");

-- checkFulfillment reads matches for one team ordered by playedAt on every run.
CREATE INDEX "Match_teamId_playedAt_idx" ON "Match"("teamId", "playedAt");
