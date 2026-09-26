import { PrismaClient } from '@prisma/client';
import { FixedRecurrences } from './FixedRecurrences';
import { atomic } from './atomic';
import { autoShare } from './autoShare';

export async function sendDueRecurrences(db: PrismaClient, now = new Date()) {
    const month = now.toISOString().slice(0, 7);
    const due = await db.transaction.findMany({
        where: { shareAfterMonth: { lte: month }, deletedAt: null },
        orderBy: [{ shareAfterMonth: 'asc' }, { id: 'asc' }],
        take: 50,
        select: { id: true },
    });
    for (const { id } of due)
        await atomic(db, async (tx) => {
            const source = await tx.transaction.findUnique({ where: { id } });
            if (!source?.shareAfterMonth || source.shareAfterMonth > month || source.deletedAt) return;
            await autoShare(tx, id, source.userId);
            await tx.transaction.update({ where: { id }, data: { shareAfterMonth: null } });
        });
    return due.length;
}

// Bounded pages keep scheduled income current even if its owner has not opened the app.
// Separate instances may race safely: generation is serialized and occurrence keys are unique.
export function startRecurrenceWorker(db: PrismaClient) {
    let stopped = false;
    let cursor: string | undefined;
    async function run() {
        let delay = 5000;
        try {
            const now = new Date();
            const month = now.toISOString().slice(0, 7);
            const rules = await db.fixedRule.findMany({
                where: {
                    anchorDate: { lt: new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1)) },
                    OR: [{ endMonth: null }, { endMonth: { gt: month } }],
                },
                ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
                orderBy: { id: 'asc' },
                take: 20,
                select: { id: true, userId: true },
            });
            for (const userId of new Set(rules.map((rule) => rule.userId))) {
                await new FixedRecurrences(db).ensureYear(userId, now.getUTCFullYear());
            }
            const dueCount = await sendDueRecurrences(db, now);
            cursor = rules.length === 20 ? rules[19].id : undefined;
            if (!cursor && dueCount < 50) delay = 3600000;
        } catch {
            console.error('Recurring transactions temporarily unavailable');
            delay = 60000;
        } finally {
            if (!stopped) setTimeout(() => void run(), delay).unref();
        }
    }
    void run();
    return () => {
        stopped = true;
    };
}
