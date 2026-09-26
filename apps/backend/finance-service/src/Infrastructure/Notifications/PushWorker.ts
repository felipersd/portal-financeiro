import { PrismaClient } from '@prisma/client';
import webpush from 'web-push';
import { isPushEndpoint } from './PushEndpoint';
import { isActiveWorker } from '../activeWorker';

export async function deliverPendingPush(db: PrismaClient) {
    const jobs = await db.$queryRaw<Array<{ id: string }>>`
        WITH ready AS (
            SELECT id FROM finance."PushDelivery" WHERE status='pending' AND "availableAt"<=now()
            AND ("leaseUntil" IS NULL OR "leaseUntil"<now()) ORDER BY "availableAt" LIMIT 5 FOR UPDATE SKIP LOCKED
        ) UPDATE finance."PushDelivery" d SET "leaseUntil"=now()+interval '2 minutes',attempts=attempts+1
        FROM ready WHERE d.id=ready.id RETURNING d.id`;
    await Promise.all(
        jobs.map(async ({ id }) => {
            const job = await db.pushDelivery.findUnique({
                where: { id },
                include: { subscription: true, notification: true },
            });
            if (!job) return;
            try {
                if (
                    !isPushEndpoint(job.subscription.endpoint) ||
                    job.subscription.userId !== job.notification.userId
                ) {
                    await db.pushDelivery.updateMany({
                        where: { id },
                        data: { status: 'failed', leaseUntil: null },
                    });
                    return;
                }
                await webpush.sendNotification(
                    {
                        endpoint: job.subscription.endpoint,
                        keys: { p256dh: job.subscription.p256dh, auth: job.subscription.auth },
                    },
                    JSON.stringify({
                        title: 'Portal Financeiro',
                        body: 'Há uma atualização nos seus compartilhamentos.',
                        tag: job.notification.id,
                        url: '/#sharing',
                    }),
                    { TTL: 86400, urgency: 'normal', timeout: 10000 },
                );
                await db.pushDelivery.updateMany({
                    where: { id },
                    data: { status: 'delivered', leaseUntil: null },
                });
            } catch (error) {
                const status = (error as { statusCode?: number }).statusCode;
                if (status === 404 || status === 410) {
                    await db.pushSubscription.deleteMany({ where: { id: job.subscriptionId } });
                } else {
                    await db.pushDelivery.updateMany({
                        where: { id },
                        data: {
                            leaseUntil: null,
                            status: job.attempts >= 5 ? 'failed' : 'pending',
                            availableAt: new Date(Date.now() + Math.min(3600000, 30000 * 2 ** job.attempts)),
                        },
                    });
                }
            }
        }),
    );
}

// Durable outbox: requests commit without waiting for an external push provider.
// SKIP LOCKED and expiring leases allow multiple instances and restart recovery.
export function startPushWorker(db: PrismaClient) {
    const publicKey = process.env.VAPID_PUBLIC_KEY;
    const privateKey = process.env.VAPID_PRIVATE_KEY;
    const configured = Boolean(publicKey && privateKey);
    if (publicKey && privateKey)
        webpush.setVapidDetails(
            process.env.VAPID_SUBJECT || 'https://portalfinanceiro.net',
            publicKey,
            privateKey,
        );
    let stopped = false;
    let iterations = 0;
    async function run() {
        try {
            if (!isActiveWorker()) return;
            if (configured) await deliverPendingPush(db);
            if (++iterations % 720 === 0) {
                await db.notification.deleteMany({
                    where: { createdAt: { lt: new Date(Date.now() - 90 * 86400000) } },
                });
                await db.pushDelivery.deleteMany({
                    where: {
                        status: { in: ['delivered', 'failed'] },
                        availableAt: { lt: new Date(Date.now() - 7 * 86400000) },
                    },
                });
            }
        } catch {
            console.error('Push worker temporarily unavailable');
        } finally {
            if (!stopped) setTimeout(() => void run(), 5000).unref();
        }
    }
    void run();
    return () => {
        stopped = true;
    };
}
