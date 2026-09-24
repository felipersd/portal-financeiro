#!/usr/bin/env bash
set -Eeuo pipefail
# CI-only disposable schema, never a configured production URL.
export PGPASSWORD=test-only-password
PSQL=(psql -X -v ON_ERROR_STOP=1 -h localhost -U portal -d finance_db)
"${PSQL[@]}" -c 'CREATE SCHEMA migration_fixture'
export PGOPTIONS='--search_path=migration_fixture'
"${PSQL[@]}" -f apps/backend/finance-service/prisma/migrations/20260919000000_init/migration.sql > /dev/null
"${PSQL[@]}" -f apps/backend/finance-service/prisma/migrations/20260920000000_shared_expenses/migration.sql > /dev/null
"${PSQL[@]}" <<'SQL'
INSERT INTO "GroupMember" (id,name,category,"userId") VALUES ('friend-a','A','Amigo','fixture'),('friend-b','B','Amigo','fixture');
INSERT INTO "Transaction" (id,description,amount,type,category,date,"isShared",payer,"userId","splitDetails") VALUES
 ('fixture','Historical thirds',100,'expense','Casa',now(),true,'me','fixture','{"splits":[{"memberId":"me","amount":33.33333333333},{"memberId":"friend-a","amount":33.33333333333},{"memberId":"friend-b","amount":33.33333333333}]}');
SQL
"${PSQL[@]}" -f apps/backend/finance-service/prisma/migrations/20260921000000_exact_money_and_participants/migration.sql > /dev/null
"${PSQL[@]}" <<'SQL'
DO $$ BEGIN
 IF (SELECT sum("amountCents") FROM "TransactionSplit" WHERE "transactionId"='fixture') <> 10000 THEN RAISE EXCEPTION 'Incorrect backfill'; END IF;
 IF (SELECT "categoryId" FROM "Transaction" WHERE id='fixture') IS NULL THEN RAISE EXCEPTION 'Missing category'; END IF;
 IF (SELECT data_type FROM information_schema.columns WHERE table_schema='migration_fixture' AND table_name='Transaction' AND column_name='amount') <> 'numeric' THEN RAISE EXCEPTION 'Money is not exact'; END IF;
END $$;
SQL
unset PGOPTIONS
"${PSQL[@]}" -c 'DROP SCHEMA migration_fixture CASCADE' > /dev/null
