import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { z } from 'zod';
import { TagService } from '../../Application/UseCases/TagService';
import { FinanceError } from '../../Domain/FinanceError';
import { atomic } from '../Database/atomic';

import { isPushEndpoint } from '../Notifications/PushEndpoint';

const tagInput = z.object({
    name: z.string().trim().min(1).max(40),
    color: z
        .string()
        .regex(/^#[0-9a-f]{6}$/i)
        .default('#55b9a2'),
});
const subscriptionInput = z.object({
    endpoint: z.string().max(2048).refine(isPushEndpoint, 'Serviço de push não suportado.'),
    keys: z.object({
        p256dh: z.string().regex(/^[A-Za-z0-9_-]{87}=?$/),
        auth: z.string().regex(/^[A-Za-z0-9_-]{22}={0,2}$/),
    }),
});

export function experienceRouter(db: PrismaClient) {
    const router = Router();
    const tags = new TagService(db);
    router.get('/preferences', async (req, res) => {
        res.json(await tags.preferences((req as any).internalUserId));
    });
    router.patch('/preferences', async (req, res) => {
        res.json(
            await tags.configure(
                (req as any).internalUserId,
                z.object({ tagsEnabled: z.boolean() }).parse(req.body).tagsEnabled,
            ),
        );
    });
    router.get('/tags', async (req, res) => {
        res.json(await tags.list((req as any).internalUserId));
    });
    router.post('/tags', async (req, res) => {
        const data = tagInput.parse(req.body);
        res.status(201).json(await tags.save((req as any).internalUserId, data.name, data.color));
    });
    router.put('/tags/:id', async (req, res) => {
        const data = tagInput.parse(req.body);
        res.json(
            await tags.save(
                (req as any).internalUserId,
                data.name,
                data.color,
                z.string().uuid().parse(req.params.id),
            ),
        );
    });
    router.delete('/tags/:id', async (req, res) => {
        await tags.remove((req as any).internalUserId, z.string().uuid().parse(req.params.id));
        res.sendStatus(204);
    });
    router.get('/notifications', async (req, res) => {
        const userId = (req as any).internalUserId;
        const cursor = z.string().uuid().optional().parse(req.query.cursor);
        if (cursor && !(await db.notification.findFirst({ where: { id: cursor, userId } })))
            throw new FinanceError(400, 'Página inválida.');
        const [rows, unread] = await Promise.all([
            db.notification.findMany({
                where: { userId },
                orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
                take: 31,
                ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
                select: { id: true, kind: true, shareId: true, createdAt: true, readAt: true },
            }),
            db.notification.count({ where: { userId, readAt: null } }),
        ]);
        res.json({ items: rows.slice(0, 30), nextCursor: rows.length > 30 ? rows[29].id : null, unread });
    });
    router.post('/notifications/read', async (req, res) => {
        const ids = z.object({ ids: z.array(z.string().uuid()).max(30) }).parse(req.body).ids;
        await db.notification.updateMany({
            where: { userId: (req as any).internalUserId, id: { in: ids }, readAt: null },
            data: { readAt: new Date() },
        });
        res.json({ success: true });
    });
    router.get('/notifications/push-key', (_req, res) => {
        res.json({ publicKey: process.env.VAPID_PUBLIC_KEY || null });
    });
    router.post('/notifications/subscriptions', async (req, res) => {
        if (!process.env.VAPID_PUBLIC_KEY || !process.env.VAPID_PRIVATE_KEY)
            throw new FinanceError(503, 'As notificações deste servidor ainda estão sendo configuradas.');
        const data = subscriptionInput.parse(req.body);
        const userId = (req as any).internalUserId;
        await atomic(db, async (tx) => {
            const existing = await tx.pushSubscription.findUnique({ where: { endpoint: data.endpoint } });
            if (existing && (existing.auth !== data.keys.auth || existing.p256dh !== data.keys.p256dh))
                throw new FinanceError(409, 'Reative as notificações neste dispositivo.');
            if (existing?.userId !== userId && (await tx.pushSubscription.count({ where: { userId } })) >= 5)
                throw new FinanceError(400, 'Limite de cinco dispositivos atingido.');
            if (existing && existing.userId !== userId)
                await tx.pushDelivery.deleteMany({ where: { subscriptionId: existing.id } });
            await tx.pushSubscription.upsert({
                where: { endpoint: data.endpoint },
                create: { userId, endpoint: data.endpoint, ...data.keys },
                update: { userId, ...data.keys },
            });
        });
        res.status(201).json({ success: true });
    });
    router.delete('/notifications/subscriptions', async (req, res) => {
        const endpoint = z.object({ endpoint: z.string().max(2048) }).parse(req.body).endpoint;
        await db.pushSubscription.deleteMany({ where: { userId: (req as any).internalUserId, endpoint } });
        res.sendStatus(204);
    });
    return router;
}
