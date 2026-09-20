-- CreateTable
CREATE TABLE "MemberConnection" (
    "id" TEXT NOT NULL,
    "memberId" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "ownerName" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "recipientId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MemberConnection_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExpenseShare" (
    "id" TEXT NOT NULL,
    "transactionId" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "recipientId" TEXT NOT NULL,
    "memberId" TEXT NOT NULL,
    "ownerName" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "amountCents" INTEGER NOT NULL,
    "totalCents" INTEGER NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "paidByRecipient" BOOLEAN NOT NULL DEFAULT false,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "decidedAt" TIMESTAMP(3),

    CONSTRAINT "ExpenseShare_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "MemberConnection_memberId_key" ON "MemberConnection"("memberId");

-- CreateIndex
CREATE INDEX "MemberConnection_email_status_idx" ON "MemberConnection"("email", "status");

-- CreateIndex
CREATE INDEX "MemberConnection_recipientId_status_idx" ON "MemberConnection"("recipientId", "status");

-- CreateIndex
CREATE INDEX "MemberConnection_ownerId_idx" ON "MemberConnection"("ownerId");

-- CreateIndex
CREATE INDEX "ExpenseShare_recipientId_status_date_idx" ON "ExpenseShare"("recipientId", "status", "date");

-- CreateIndex
CREATE INDEX "ExpenseShare_ownerId_status_idx" ON "ExpenseShare"("ownerId", "status");

-- CreateIndex
CREATE INDEX "ExpenseShare_memberId_status_idx" ON "ExpenseShare"("memberId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "ExpenseShare_transactionId_recipientId_key" ON "ExpenseShare"("transactionId", "recipientId");

-- CreateIndex
CREATE INDEX "Transaction_userId_date_idx" ON "Transaction"("userId", "date");

-- CreateIndex
CREATE INDEX "Transaction_userId_recurrenceId_date_idx" ON "Transaction"("userId", "recurrenceId", "date");

-- CreateIndex
CREATE INDEX "Category_userId_idx" ON "Category"("userId");

-- CreateIndex
CREATE INDEX "GroupMember_userId_idx" ON "GroupMember"("userId");

-- AddForeignKey
ALTER TABLE "MemberConnection" ADD CONSTRAINT "MemberConnection_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "GroupMember"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExpenseShare" ADD CONSTRAINT "ExpenseShare_transactionId_fkey" FOREIGN KEY ("transactionId") REFERENCES "Transaction"("id") ON DELETE CASCADE ON UPDATE CASCADE;

