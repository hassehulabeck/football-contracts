-- Records when a contract became FULFILLED or FAILED.
--
-- The contracts list now exposes resolved contracts and orders them by when
-- they resolved. `updatedAt` looks like the right field but is not: it moves on
-- every write, so any later change to a resolved contract would silently
-- reorder the results feed.
--
-- Nullable with no backfill on purpose. Every contract in production is still
-- ACTIVE — nothing has resolved yet — so NULL is the correct value for all
-- existing rows, and it stays the correct value for live contracts.

ALTER TABLE "Contract" ADD COLUMN "resolvedAt" TIMESTAMP(3);
