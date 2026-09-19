CREATE TABLE "UserIdentity" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "providerId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "UserIdentity_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "UserIdentity_provider_providerId_key" ON "UserIdentity"("provider", "providerId");
ALTER TABLE "UserIdentity" ADD CONSTRAINT "UserIdentity_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
INSERT INTO "UserIdentity" ("id", "userId", "provider", "providerId", "createdAt")
SELECT 'legacy-' || "id", "id", 'auth0', "auth0Id", "createdAt" FROM "User";
DROP INDEX "User_auth0Id_key";
ALTER TABLE "User" DROP COLUMN "auth0Id";
