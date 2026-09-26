import { PrismaClient } from '@prisma/client';
import webpush from 'web-push';
import { deliverPendingPush } from './PushWorker';

describe('Durable push delivery', () => {
    const send = jest.spyOn(webpush, 'sendNotification');
    const job = {
        id: 'job',
        subscriptionId: 'device',
        attempts: 1,
        subscription: {
            userId: 'owner',
            endpoint: 'https://fcm.googleapis.com/fcm/send/fixture',
            p256dh: 'public',
            auth: 'auth',
        },
        notification: { id: 'notice', userId: 'owner' },
    };
    let mockDb: {
        $queryRaw: jest.Mock;
        pushDelivery: { findUnique: jest.Mock; updateMany: jest.Mock };
        pushSubscription: { deleteMany: jest.Mock };
    };
    beforeEach(() => {
        send.mockReset();
        mockDb = {
            $queryRaw: jest.fn().mockResolvedValue([{ id: 'job' }]),
            pushDelivery: {
                findUnique: jest.fn().mockResolvedValue(job),
                updateMany: jest.fn().mockResolvedValue({ count: 1 }),
            },
            pushSubscription: { deleteMany: jest.fn().mockResolvedValue({ count: 1 }) },
        };
    });
    afterAll(() => send.mockRestore());
    const run = () => deliverPendingPush(mockDb as unknown as PrismaClient);
    it('sends a generic payload and acknowledges only after provider success', async () => {
        send.mockResolvedValue({ statusCode: 201, body: '', headers: {} });
        await run();
        expect(JSON.parse(String(send.mock.calls[0][1]))).toEqual({
            title: 'Portal Financeiro',
            body: 'Há uma atualização nos seus compartilhamentos.',
            tag: 'notice',
            url: '/#sharing',
        });
        expect(mockDb.pushDelivery.updateMany).toHaveBeenCalledWith({
            where: { id: 'job' },
            data: { status: 'delivered', leaseUntil: null },
        });
    });
    it('retries temporary provider failure with backoff and stops after five attempts', async () => {
        send.mockRejectedValue({ statusCode: 503 });
        await run();
        expect(mockDb.pushDelivery.updateMany).toHaveBeenLastCalledWith({
            where: { id: 'job' },
            data: expect.objectContaining({
                status: 'pending',
                leaseUntil: null,
                availableAt: expect.any(Date),
            }),
        });
        mockDb.pushDelivery.findUnique.mockResolvedValue({ ...job, attempts: 5 });
        await run();
        expect(mockDb.pushDelivery.updateMany).toHaveBeenLastCalledWith({
            where: { id: 'job' },
            data: expect.objectContaining({ status: 'failed' }),
        });
    });
    it.each([404, 410])('removes expired device subscriptions after HTTP %i', async (statusCode) => {
        send.mockRejectedValue({ statusCode });
        await run();
        expect(mockDb.pushSubscription.deleteMany).toHaveBeenCalledWith({ where: { id: 'device' } });
    });
    it('never sends a queued notification after the subscription changes accounts', async () => {
        mockDb.pushDelivery.findUnique.mockResolvedValue({
            ...job,
            subscription: { ...job.subscription, userId: 'other' },
        });
        await run();
        expect(send).not.toHaveBeenCalled();
        expect(mockDb.pushDelivery.updateMany).toHaveBeenCalledWith({
            where: { id: 'job' },
            data: { status: 'failed', leaseUntil: null },
        });
    });
});
