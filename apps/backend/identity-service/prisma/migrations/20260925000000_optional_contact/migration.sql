CREATE TABLE "UserContact" (
    "userId" TEXT NOT NULL,
    "phoneE164" TEXT,
    "addressLine1" TEXT,
    "addressLine2" TEXT,
    "city" TEXT,
    "region" TEXT,
    "postalCode" TEXT,
    "countryCode" CHAR(2),
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "UserContact_pkey" PRIMARY KEY ("userId")
);
ALTER TABLE "UserContact" ADD CONSTRAINT "UserContact_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
