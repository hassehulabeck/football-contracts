-- A public display name, so the leaderboard stops publishing email addresses.
--
-- Nullable with no backfill on purpose. There is nothing to derive a username
-- from that would not re-leak the email it replaces, and picking one is the
-- player's call. Every existing account therefore starts NULL and is forced
-- through /settings/username on next login.
--
-- The unique index is case-sensitive, which is all Postgres offers without
-- citext. PATCH /api/users/me/username rejects case-insensitive collisions
-- before writing; this index only has to catch the exact-duplicate race.
ALTER TABLE "User" ADD COLUMN "username" TEXT;

-- Null until the first username is set. The 30-day rename cooldown reads this,
-- so NULL correctly means "never renamed" and the first set goes through.
ALTER TABLE "User" ADD COLUMN "usernameChangedAt" TIMESTAMP(3);

CREATE UNIQUE INDEX "User_username_key" ON "User"("username");
