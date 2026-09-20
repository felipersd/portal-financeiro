BEGIN;
-- Fail atomically for invalid historical data; do not silently drop participants.
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM "Transaction" WHERE amount::text IN ('NaN','Infinity','-Infinity') OR amount < 0 OR amount > 10000000) THEN
    RAISE EXCEPTION 'Financial migration requires reconciliation: invalid historical amount';
  END IF;
  IF EXISTS (SELECT 1 FROM "Transaction" WHERE "isShared" AND ("splitDetails" IS NULL OR jsonb_typeof("splitDetails"->'splits') IS DISTINCT FROM 'array' OR jsonb_array_length("splitDetails"->'splits') = 0)) THEN
    RAISE EXCEPTION 'Financial migration requires reconciliation: legacy sharing format';
  END IF;
  IF EXISTS (SELECT 1 FROM "Transaction" t CROSS JOIN LATERAL jsonb_array_elements(t."splitDetails"->'splits') e WHERE t."isShared" AND
    ((e->>'amount')::numeric < 0 OR (e->>'amount') IS NULL OR (e->>'memberId') IS NULL OR
     ((e->>'memberId') <> 'me' AND NOT EXISTS (SELECT 1 FROM "GroupMember" m WHERE m.id=e->>'memberId' AND m."userId"=t."userId")))) THEN
    RAISE EXCEPTION 'Financial migration requires reconciliation: invalid historical participant';
  END IF;
  IF EXISTS (SELECT t.id FROM "Transaction" t CROSS JOIN LATERAL jsonb_array_elements(t."splitDetails"->'splits') e WHERE t."isShared" GROUP BY t.id
    HAVING count(*) <> count(DISTINCT e->>'memberId') OR abs(sum(round((e->>'amount')::numeric*100)) - round(t.amount::numeric*100)) > count(*)) THEN
    RAISE EXCEPTION 'Financial migration requires reconciliation: duplicate participants or inconsistent sum';
  END IF;
END $$;
ALTER TABLE "Transaction" ALTER COLUMN amount TYPE DECIMAL(16,2) USING round(amount::numeric, 2);
ALTER TABLE "Transaction" ADD COLUMN "categoryId" TEXT;
CREATE TABLE "TransactionSplit" (
  "transactionId" TEXT NOT NULL,
  "participantKey" TEXT NOT NULL,
  "memberId" TEXT,
  "amountCents" INTEGER NOT NULL,
  CONSTRAINT "TransactionSplit_pkey" PRIMARY KEY ("transactionId", "participantKey"),
  CONSTRAINT "TransactionSplit_amount_valid" CHECK ("amountCents" >= 0),
  CONSTRAINT "TransactionSplit_participant_valid" CHECK (("participantKey"='me' AND "memberId" IS NULL) OR ("memberId" IS NOT NULL AND "participantKey"="memberId"))
);
CREATE INDEX "Transaction_categoryId_idx" ON "Transaction"("categoryId");
CREATE INDEX "TransactionSplit_memberId_idx" ON "TransactionSplit"("memberId");
INSERT INTO "Category" (id,name,type,"userId") SELECT gen_random_uuid()::text, t.category,t.type,t."userId"
FROM (SELECT DISTINCT category,type,"userId" FROM "Transaction") t
WHERE NOT EXISTS (SELECT 1 FROM "Category" c WHERE c.name=t.category AND c.type=t.type AND c."userId"=t."userId");
UPDATE "Transaction" t SET "categoryId"=(SELECT c.id FROM "Category" c WHERE c.name=t.category AND c.type=t.type AND c."userId"=t."userId" ORDER BY c.id LIMIT 1);
WITH parts AS (
  SELECT t.id, e.value->>'memberId' AS member,
    round((e.value->>'amount')::numeric*100)::integer AS cents,
    round(t.amount*100)::integer AS total,
    sum(round((e.value->>'amount')::numeric*100)::integer) OVER (PARTITION BY t.id) AS part_total,
    row_number() OVER (PARTITION BY t.id ORDER BY (e.value->>'amount')::numeric DESC, e.ordinality) AS position
  FROM "Transaction" t CROSS JOIN LATERAL jsonb_array_elements(t."splitDetails"->'splits') WITH ORDINALITY e WHERE t."isShared"
)
INSERT INTO "TransactionSplit" ("transactionId","participantKey","memberId","amountCents")
SELECT id,member,NULLIF(member,'me'), cents + CASE WHEN position=1 THEN total-part_total ELSE 0 END FROM parts;
-- Keep a compatibility snapshot. All new reads use the relational participants.
UPDATE "Transaction" t SET "splitDetails"=jsonb_build_object('splits',
 (SELECT jsonb_agg(jsonb_build_object('memberId',s."participantKey",'amount',s."amountCents"::numeric/100) ORDER BY s."participantKey") FROM "TransactionSplit" s WHERE s."transactionId"=t.id)) WHERE t."isShared";
ALTER TABLE "Transaction" ADD CONSTRAINT "Transaction_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category"(id) ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "TransactionSplit" ADD CONSTRAINT "TransactionSplit_transactionId_fkey" FOREIGN KEY ("transactionId") REFERENCES "Transaction"(id) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TransactionSplit" ADD CONSTRAINT "TransactionSplit_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "GroupMember"(id) ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "BudgetRule" ADD COLUMN revision INTEGER NOT NULL DEFAULT 0;
UPDATE "BudgetRule" b SET mapping=COALESCE((SELECT jsonb_object_agg(COALESCE((SELECT c.id FROM "Category" c WHERE c."userId"=b."userId" AND c.type='expense' AND (c.name=e.key OR c.id=e.key) ORDER BY c.id LIMIT 1),e.key),e.value) FROM jsonb_each(b.mapping) e), '{}'::jsonb);
CREATE TABLE "BudgetRuleVersion" (
  id TEXT NOT NULL PRIMARY KEY,
  "ruleId" TEXT NOT NULL,
  revision INTEGER NOT NULL,
  divisions JSONB NOT NULL,
  mapping JSONB NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "BudgetRuleVersion_ruleId_fkey" FOREIGN KEY ("ruleId") REFERENCES "BudgetRule"(id) ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "BudgetRuleVersion_ruleId_revision_key" ON "BudgetRuleVersion"("ruleId",revision);
INSERT INTO "BudgetRuleVersion" (id,"ruleId",revision,divisions,mapping) SELECT gen_random_uuid()::text,id,revision,divisions,mapping FROM "BudgetRule";
CREATE TABLE "RequestBudget" (key TEXT NOT NULL PRIMARY KEY, count INTEGER NOT NULL, "expiresAt" TIMESTAMP(3) NOT NULL);
CREATE INDEX "RequestBudget_expiresAt_idx" ON "RequestBudget"("expiresAt");
COMMIT;
