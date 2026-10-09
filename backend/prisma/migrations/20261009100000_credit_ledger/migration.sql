-- CreateEnum
CREATE TYPE "CreditTransactionType" AS ENUM ('STARTING_BALANCE', 'COUPON_PURCHASE', 'COUPON_PAYOUT', 'ADJUSTMENT', 'REFINANCE');

-- CreateTable
CREATE TABLE "CreditTransaction" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "type" "CreditTransactionType" NOT NULL,
    "contractId" TEXT,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CreditTransaction_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CreditTransaction_userId_createdAt_idx" ON "CreditTransaction"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "CreditTransaction_type_createdAt_idx" ON "CreditTransaction"("type", "createdAt");

-- AddForeignKey
ALTER TABLE "CreditTransaction" ADD CONSTRAINT "CreditTransaction_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CreditTransaction" ADD CONSTRAINT "CreditTransaction_contractId_fkey" FOREIGN KEY ("contractId") REFERENCES "Contract"("id") ON DELETE SET NULL ON UPDATE CASCADE;


-- ─── Backfill ────────────────────────────────────────────────────────────────
-- Rebuild the history the ledger would have recorded had it always existed.
-- Ids are md5 hex rather than cuids: they only need to be unique, and this
-- keeps the migration free of extensions.

-- Every account was created with the column default of 1000.
INSERT INTO "CreditTransaction" ("id", "userId", "amount", "type", "createdAt")
SELECT md5('start:' || u."id"), u."id", 1000, 'STARTING_BALANCE', u."createdAt"
FROM "User" u;

-- A won coupon cost its owner their own bid on that auction (one bid per
-- player per auction, frozen at close), charged when the auction ended.
INSERT INTO "CreditTransaction" ("id", "userId", "amount", "type", "contractId", "createdAt")
SELECT md5('buy:' || c."id"), c."ownerId", -b."amount", 'COUPON_PURCHASE', c."contractId", a."endsAt"
FROM "Coupon" c
JOIN "Auction" a ON a."contractId" = c."contractId"
JOIN "Bid" b ON b."auctionId" = a."id" AND b."userId" = c."ownerId"
WHERE c."ownerId" IS NOT NULL;

-- Each paid-out coupon was worth 100, paid when its contract resolved.
INSERT INTO "CreditTransaction" ("id", "userId", "amount", "type", "contractId", "createdAt")
SELECT md5('payout:' || c."id"), c."ownerId", 100, 'COUPON_PAYOUT', c."contractId",
       COALESCE(k."resolvedAt", k."updatedAt")
FROM "Coupon" c
JOIN "Contract" k ON k."id" = c."contractId"
WHERE c."ownerId" IS NOT NULL AND c."paidOut" = true;

-- Whatever the rows above cannot explain — balances edited by hand while
-- testing settlement — becomes one correction, so the ledger sums to credits
-- from the first day.
INSERT INTO "CreditTransaction" ("id", "userId", "amount", "type", "note", "createdAt")
SELECT md5('reconcile:' || u."id"), u."id", u."credits" - COALESCE(t."sum", 0), 'ADJUSTMENT',
       'Reconciled when the credit history was introduced', CURRENT_TIMESTAMP
FROM "User" u
LEFT JOIN (
  SELECT "userId", SUM("amount") AS "sum" FROM "CreditTransaction" GROUP BY "userId"
) t ON t."userId" = u."id"
WHERE u."credits" <> COALESCE(t."sum", 0);
