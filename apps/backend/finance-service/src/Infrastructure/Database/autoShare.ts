import { Prisma } from '@prisma/client';
import { notify } from './notify';

export async function autoShare(tx: Prisma.TransactionClient, transactionId: string, userId: string) {
    const source = await tx.transaction.findFirst({
        where: { id: transactionId, userId, isShared: true, deletedAt: null },
        include: { splits: true, tags: { include: { tag: true } }, categoryRef: true },
    });
    if (!source || source.type !== 'expense') return;
    const links = await tx.memberConnection.findMany({
        where: {
            ownerId: userId,
            status: 'accepted',
            memberId: {
                in: source.splits
                    .filter((part) => part.amountCents > 0 && part.memberId)
                    .map((part) => part.memberId!),
            },
        },
    });
    for (const link of links) {
        if (!link.recipientId) continue;
        const previous = await tx.expenseShare.findUnique({
            where: { transactionId_recipientId: { transactionId, recipientId: link.recipientId } },
        });
        // A refusal/cancellation is never silently turned into a new request.
        if (previous) continue;
        const part = source.splits.find((split) => split.memberId === link.memberId)!;
        const share = await tx.expenseShare.create({
            data: {
                transactionId,
                memberId: link.memberId,
                ownerId: userId,
                recipientId: link.recipientId,
                ownerName: link.ownerName,
                description: source.description,
                categoryName: source.categoryRef?.name || source.category,
                tagNames: source.tags.map((row) => row.tag.name),
                amountCents: part.amountCents,
                totalCents: Number(source.amount.mul(100)),
                date: source.date,
                paidByRecipient: source.payer === link.memberId,
            },
        });
        await notify(tx, link.recipientId, 'expense_received', share.id);
    }
}
