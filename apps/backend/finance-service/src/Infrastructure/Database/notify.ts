import { Prisma } from '@prisma/client';

export async function notify(tx: Prisma.TransactionClient, userId: string, kind: string, shareId?: string) {
    const notification = await tx.notification.create({ data: { userId, kind, shareId } });
    const subscriptions = await tx.pushSubscription.findMany({ where: { userId }, select: { id: true } });
    if (subscriptions.length)
        await tx.pushDelivery.createMany({
            data: subscriptions.map((subscription) => ({
                notificationId: notification.id,
                subscriptionId: subscription.id,
            })),
        });
}
