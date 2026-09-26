import { randomUUID } from 'crypto';
import request from 'supertest';
import express from 'express';
import { createDatabaseClient } from '../../Infrastructure/Database/createDatabaseClient';
import { PrismaTransactionRepository } from '../../Infrastructure/Database/PrismaTransactionRepository';
import { Transaction } from '../../Domain/Entities/Transaction';
import { TagService } from './TagService';
import { SharingService, SharingActor } from './SharingService';
import { DeleteUserFinancialData } from './DeleteUserFinancialData';
import { CreateTransaction } from './CreateTransaction';
import { FixedRecurrences } from '../../Infrastructure/Database/FixedRecurrences';
import { sendDueRecurrences } from '../../Infrastructure/Database/RecurrenceWorker';
import { experienceRouter } from '../../Infrastructure/Http/ExperienceRouter';
import { respondError } from '../../Infrastructure/Http/TransactionController';
const suite = process.env.INTEGRATION_TESTS === '1' ? describe : describe.skip;

suite('Tags, automatic consent and private notifications', () => {
    let db: ReturnType<typeof createDatabaseClient>;
    let repository: PrismaTransactionRepository;
    let tags: TagService;
    let sharing: SharingService;
    let owner: SharingActor, recipient: SharingActor;
    let memberId: string;
    beforeAll(() => {
        db = createDatabaseClient();
        repository = new PrismaTransactionRepository(db);
        tags = new TagService(db);
        sharing = new SharingService(db);
    });
    beforeEach(async () => {
        owner = { id: randomUUID(), name: 'Fixture owner', email: `${randomUUID()}@example.invalid` };
        recipient = { id: randomUUID(), name: 'Fixture recipient', email: `${randomUUID()}@example.invalid` };
        memberId = (
            await db.groupMember.create({
                data: { userId: owner.id, name: 'Friend', category: 'Pessoa', email: recipient.email },
            })
        ).id;
        const link = await sharing.invite(owner, memberId);
        await sharing.decideConnection(recipient, link.id, 'accept');
    });
    afterEach(async () => {
        await new DeleteUserFinancialData(db).execute(owner.id);
        await new DeleteUserFinancialData(db).execute(recipient.id);
    });
    afterAll(async () => {
        await db.$disconnect();
    });
    const transaction = (id: string, tagIds: string[] = []) =>
        new Transaction(
            id,
            'Shared fixture',
            100,
            'expense',
            'Alimentação',
            new Date('2026-09-20T12:00:00Z'),
            true,
            'me',
            owner.id,
            new Date(),
            null,
            {
                splits: [
                    { memberId: 'me', amount: 60 },
                    { memberId, amount: 40 },
                ],
            },
            false,
            undefined,
            tagIds,
        );

    it('creates optional defaults once, rejects foreign tag ids and preserves deletions after re-enabling', async () => {
        expect(await tags.preferences(owner.id)).toEqual({ tagsEnabled: false });
        await Promise.all([tags.configure(owner.id, true), tags.configure(owner.id, true)]);
        const defaults = await tags.list(owner.id);
        expect(defaults).toHaveLength(7);
        await tags.remove(owner.id, defaults[0].id);
        await tags.configure(owner.id, false);
        await tags.configure(owner.id, true);
        expect(await tags.list(owner.id)).toHaveLength(6);
        await expect(tags.save(recipient.id, 'Foreign', '#123456', defaults[1].id)).rejects.toMatchObject({
            status: 404,
        });
        await expect(tags.remove(recipient.id, defaults[1].id)).rejects.toMatchObject({ status: 404 });
        const foreign = await tags.save(recipient.id, 'Private', '#123456');
        await expect(repository.create(transaction(randomUUID(), [foreign.id]))).rejects.toMatchObject({
            status: 400,
        });
        expect(await db.transaction.count({ where: { userId: owner.id } })).toBe(0);
        await expect(tags.save(owner.id, defaults[1].name.toUpperCase(), '#123456')).rejects.toMatchObject({
            status: 409,
        });
    });
    it('respects the tag limit when defaults are enabled after custom tags exist', async () => {
        await db.tag.createMany({
            data: Array.from({ length: 99 }, (_, index) => ({
                userId: owner.id,
                name: `Custom ${index}`,
                normalizedName: `custom ${index}`,
            })),
        });
        await tags.configure(owner.id, true);
        expect(await db.tag.count({ where: { userId: owner.id } })).toBe(100);
        await expect(tags.save(owner.id, 'One more', '#123456')).rejects.toMatchObject({ status: 400 });
    });
    it('commits the expense, request, snapshots and push outbox together, then books only the accepted portion', async () => {
        const tag = await tags.save(owner.id, 'Supermercado', '#123456');
        await db.pushSubscription.create({
            data: {
                userId: recipient.id,
                endpoint: `https://fcm.googleapis.com/fcm/send/${randomUUID()}`,
                p256dh: 'fixture',
                auth: 'fixture',
            },
        });
        const id = randomUUID();
        await repository.create(transaction(id, [tag.id]));
        const share = await db.expenseShare.findFirstOrThrow({ where: { transactionId: id } });
        expect(share).toMatchObject({
            status: 'pending',
            amountCents: 4000,
            categoryName: 'Alimentação',
            tagNames: ['Supermercado'],
        });
        expect(await repository.findByUserId(recipient.id)).toHaveLength(0);
        expect(await db.notification.count({ where: { userId: recipient.id, shareId: share.id } })).toBe(1);
        expect(await db.pushDelivery.count({ where: { notification: { shareId: share.id } } })).toBe(1);
        await tags.save(owner.id, 'Feira', '#abcdef', tag.id);
        await tags.remove(owner.id, tag.id);
        await sharing.decideShare(recipient, share.id, 'accept');
        expect((await repository.findByUserId(recipient.id))[0]).toMatchObject({
            amount: 40,
            category: 'Alimentação',
            tags: [{ name: 'Supermercado' }],
            readOnly: true,
        });
        await expect(repository.update(transaction(id))).rejects.toMatchObject({ status: 409 });
        await new DeleteUserFinancialData(db).execute(owner.id);
        expect(await db.pushDelivery.count({ where: { notification: { shareId: share.id } } })).toBe(0);
    });
    it('rolls back all generated shares and notifications when any transaction in a batch is invalid', async () => {
        const valid = transaction(randomUUID());
        await expect(
            repository.createMany([valid, transaction(randomUUID(), [randomUUID()])]),
        ).rejects.toMatchObject({ status: 400 });
        expect(await db.transaction.count({ where: { userId: owner.id } })).toBe(0);
        expect(await db.notification.count({ where: { userId: recipient.id } })).toBe(0);
    });
    it('does not resend a refused expense after editing or retries', async () => {
        const tx = transaction(randomUUID());
        await repository.create(tx);
        const share = await db.expenseShare.findFirstOrThrow({ where: { transactionId: tx.id } });
        await sharing.decideShare(recipient, share.id, 'decline');
        await repository.update(tx);
        expect(await db.expenseShare.count({ where: { transactionId: tx.id } })).toBe(1);
        expect(await db.notification.count({ where: { userId: recipient.id } })).toBe(1);
    });
    it('defers generated fixed expenses until their month and processes retries once', async () => {
        const seed = await new CreateTransaction(repository).execute({
            userId: owner.id,
            description: 'Rent',
            amount: 100,
            type: 'expense',
            category: 'Moradia',
            date: new Date('2026-09-20T12:00:00Z'),
            isShared: true,
            payer: 'me',
            frequency: 'fixed',
            splitDetails: {
                splits: [
                    { memberId: 'me', amount: 60 },
                    { memberId, amount: 40 },
                ],
            },
        });
        await new FixedRecurrences(db).ensureYear(owner.id, 2026);
        expect(await db.expenseShare.count({ where: { ownerId: owner.id } })).toBe(1);
        await sendDueRecurrences(db, new Date('2026-09-30T00:00:00Z'));
        expect(await db.expenseShare.count({ where: { ownerId: owner.id } })).toBe(1);
        await Promise.all([
            sendDueRecurrences(db, new Date('2026-10-01T00:00:00Z')),
            sendDueRecurrences(db, new Date('2026-10-01T00:00:00Z')),
        ]);
        expect(await db.expenseShare.count({ where: { ownerId: owner.id } })).toBe(2);
        expect(await db.transaction.count({ where: { fixedRuleId: seed.recurrenceId } })).toBe(4);
    });
    it('finds an old pending item even behind 60 recent accepted expenses, without exposing foreign rows', async () => {
        const source = transaction(randomUUID());
        await repository.create(source);
        const pending = await db.expenseShare.findFirstOrThrow({ where: { transactionId: source.id } });
        const rows = Array.from({ length: 60 }, () => ({
            id: randomUUID(),
            description: 'Historical',
            amount: 1,
            type: 'expense',
            category: 'Outros',
            date: new Date(),
            isShared: false,
            payer: 'me',
            userId: owner.id,
        }));
        await db.transaction.createMany({ data: rows });
        await db.expenseShare.createMany({
            data: rows.map((row) => ({
                transactionId: row.id,
                ownerId: owner.id,
                recipientId: recipient.id,
                memberId,
                ownerName: owner.name,
                description: row.description,
                amountCents: 100,
                totalCents: 100,
                status: 'accepted',
                date: row.date,
                createdAt: new Date(Date.now() + 1000),
            })),
        });
        const page = await sharing.list(recipient, { attention: 'true' });
        expect(page.shares.map((item) => item.id)).toEqual([pending.id]);
        expect(
            (
                await sharing.list(
                    { ...recipient, id: randomUUID(), email: 'other@example.invalid' },
                    { attention: 'true' },
                )
            ).shares,
        ).toHaveLength(0);
    });
    it('scopes notification reads and read acknowledgments to the authenticated account', async () => {
        const mine = await db.notification.create({ data: { userId: owner.id, kind: 'expense_received' } });
        const other = await db.notification.create({
            data: { userId: recipient.id, kind: 'expense_received' },
        });
        const app = express();
        app.use(express.json());
        app.use((req, _res, next) => {
            (req as any).internalUserId = owner.id;
            next();
        });
        app.use(experienceRouter(db));
        app.use((error: any, _req: any, res: any, _next: any) => respondError(res, error));
        const response = await request(app).get('/notifications');
        expect(response.body.items.map((item: { id: string }) => item.id)).toEqual([mine.id]);
        expect((await request(app).get(`/notifications?cursor=${other.id}`)).status).toBe(400);
        await request(app)
            .post('/notifications/read')
            .send({ ids: [mine.id, other.id] });
        expect((await db.notification.findUniqueOrThrow({ where: { id: other.id } })).readAt).toBeNull();
        expect((await db.notification.findUniqueOrThrow({ where: { id: mine.id } })).readAt).not.toBeNull();
    });
});
