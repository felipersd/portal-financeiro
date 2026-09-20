import { ShareLedger } from './ShareLedger';
import { createDatabaseClient } from '../../Infrastructure/Database/createDatabaseClient';
import { randomUUID } from 'crypto';
import { SharingService, SharingActor } from './SharingService';
import { PrismaTransactionRepository } from '../../Infrastructure/Database/PrismaTransactionRepository';
import { PrismaGroupMemberRepository } from '../../Infrastructure/Database/PrismaGroupMemberRepository';
import { Transaction } from '../../Domain/Entities/Transaction';

// This suite only runs against the explicit disposable DB used by local verification/CI.
const suite = process.env.INTEGRATION_TESTS === '1' ? describe : describe.skip;
suite('Sharing with real PostgreSQL', () => {
    let db: ReturnType<typeof createDatabaseClient>;
    let service: SharingService;
    let repository: PrismaTransactionRepository;
    let memberRepository: PrismaGroupMemberRepository;
    beforeAll(() => {
        db = createDatabaseClient(); service = new SharingService(db);
        repository = new PrismaTransactionRepository(db); memberRepository = new PrismaGroupMemberRepository(db);
    });
    const owners: string[] = [];
    let owner: SharingActor, recipient: SharingActor, stranger: SharingActor, memberId: string, transactionId: string;
    beforeEach(async () => {
        owner = { id: randomUUID(), name: 'Owner', email: `${randomUUID()}@example.test` };
        recipient = { id: randomUUID(), name: 'Recipient', email: `${randomUUID()}@example.test` };
        stranger = { id: randomUUID(), name: 'Stranger', email: `${randomUUID()}@example.test` };
        owners.push(owner.id, recipient.id, stranger.id);
        memberId = randomUUID(); transactionId = randomUUID();
        await db.groupMember.create({ data: { id: memberId, userId: owner.id, name: 'Friend', category: 'Amigo', email: recipient.email } });
        await repository.create(new Transaction(transactionId, 'Mercado', 100, 'expense', 'Casa', new Date('2026-09-20T12:00:00Z'),
            true, 'me', owner.id, new Date(), null, { splits: [{ memberId: 'me', amount: 60 }, { memberId, amount: 40 }] }));
    });
    afterAll(async () => {
        await db.expenseShare.deleteMany({ where: { ownerId: { in: owners } } });
        await db.transaction.deleteMany({ where: { userId: { in: owners } } });
        await db.category.deleteMany({ where: { userId: { in: owners } } });
        await db.groupMember.deleteMany({ where: { userId: { in: owners } } });
        await db.$disconnect();
    });
    async function connect() {
        const invite = await service.invite(owner, memberId);
        await service.decideConnection(recipient, invite.id, 'accept');
        return invite;
    }
    it('requires two consents, exposes only the recipient portion, and deduplicates retries', async () => {
        await expect(service.share(owner, transactionId, memberId)).rejects.toMatchObject({ status: 409 });
        const invite = await service.invite(owner, memberId);
        expect((await service.list(recipient)).connections).toHaveLength(1);
        expect((await service.list(stranger)).connections).toHaveLength(0);
        await expect(service.decideConnection(stranger, invite.id, 'accept')).rejects.toMatchObject({ status: 404 });
        await service.decideConnection(recipient, invite.id, 'accept');
        const [first, duplicate] = await Promise.all([service.share(owner, transactionId, memberId), service.share(owner, transactionId, memberId)]);
        expect(first.id).toBe(duplicate.id);
        expect(await repository.findByUserId(recipient.id, 2026)).toHaveLength(0);
        await expect(service.decideShare(stranger, first.id, 'accept')).rejects.toMatchObject({ status: 404 });
        await Promise.all([service.decideShare(recipient, first.id, 'accept'), service.decideShare(recipient, first.id, 'accept')]);
        const received = await repository.findByUserId(recipient.id, 2026);
        expect(received).toHaveLength(1);
        expect(received[0]).toMatchObject({ amount: 40, category: 'Compartilhadas', readOnly: true, userId: recipient.id });
        expect(received[0].splitDetails).toBeUndefined();
        expect(await repository.findByUserId(stranger.id, 2026)).toHaveLength(0);
        expect(await repository.findByUserId(recipient.id, 2025)).toHaveLength(0);
    });
    it('accepted values cannot be changed or deleted by owner', async () => {
        await connect();
        const share = await service.share(owner, transactionId, memberId);
        const original = (await repository.findById(transactionId))!;
        await expect(repository.update(original)).rejects.toMatchObject({ status: 409 });
        await service.decideShare(recipient, share.id, 'accept');
        await expect(repository.delete(transactionId)).rejects.toMatchObject({ status: 409 });
        await expect(service.decideShare(owner, share.id, 'cancel')).rejects.toMatchObject({ status: 409 });
        await expect(repository.update(original)).rejects.toMatchObject({ status: 409 });
    });
    it('revokes pending shares', async () => {
        const invite = await connect();
        const share = await service.share(owner, transactionId, memberId);
        await service.decideConnection(recipient, invite.id, 'revoke');
        await expect(service.decideShare(recipient, share.id, 'accept')).rejects.toMatchObject({ status: 409 });
        expect(await repository.findByUserId(recipient.id)).toHaveLength(0);
        await repository.delete(transactionId);
    });
    it('never books a declined expense and cannot resend it to bypass refusal', async () => {
        await connect();
        const share = await service.share(owner, transactionId, memberId);
        await service.decideShare(recipient, share.id, 'decline');
        expect(await repository.findByUserId(recipient.id)).toHaveLength(0);
        expect(await service.share(owner, transactionId, memberId)).toMatchObject({ id: share.id, status: 'declined' });
        await expect(service.decideShare(recipient, share.id, 'accept')).rejects.toMatchObject({ status: 409 });
    });
    it('preserves accepted history when either party revokes the link', async () => {
        const invite = await connect();
        const share = await service.share(owner, transactionId, memberId);
        await service.decideShare(recipient, share.id, 'accept');
        await service.decideConnection(owner, invite.id, 'revoke');
        expect(await repository.findByUserId(recipient.id)).toHaveLength(1);
        await expect(repository.delete(transactionId)).rejects.toMatchObject({ status: 409 });
    });
    it('rejects expired invitations and forged owner/member ids', async () => {
        const invite = await service.invite(owner, memberId);
        await db.memberConnection.update({ where: { id: invite.id }, data: { expiresAt: new Date(0) } });
        await expect(service.decideConnection(recipient, invite.id, 'accept')).rejects.toMatchObject({ status: 409 });
        await expect(service.invite(stranger, memberId)).rejects.toMatchObject({ status: 404 });
        const original = (await repository.findById(transactionId))!;
        await expect(repository.create(new Transaction(randomUUID(), 'Forged', 10, 'expense', 'Casa', new Date(), true, 'me', stranger.id, new Date(), null,
            { splits: [{ memberId, amount: 10 }] }))).rejects.toMatchObject({ status: 400 });
        await expect(memberRepository.delete(memberId)).rejects.toMatchObject({ status: 409 });
        expect(original.amount).toBe(100);
    });
    it('requires the other person for adjustments and settlements and preserves the exact total', async () => {
        await connect();
        const share = await service.share(owner, transactionId, memberId);
        await service.decideShare(recipient, share.id, 'accept');
        const ledger = new ShareLedger(db);
        const correction = await ledger.propose(owner, share.id, 'adjustment', 3000);
        await expect(ledger.decide(owner, correction, 'accept')).rejects.toMatchObject({ status: 403 });
        await ledger.decide(recipient, correction, 'accept');
        const source = await repository.findById(transactionId);
        expect(source?.splitDetails.splits.find((s: {memberId:string}) => s.memberId === 'me').amount).toBe(70);
        expect(source?.splitDetails.splits.reduce((n:number,s:{amount:number})=>n+s.amount,0)).toBe(100);
        const [payment, same] = await Promise.all([ledger.propose(recipient, share.id, 'payment', 2000),ledger.propose(recipient, share.id, 'payment', 2000)]);
        expect(payment).toBe(same);
        await Promise.all([ledger.decide(owner, payment, 'accept'),ledger.decide(owner, payment, 'accept')]);
        expect((await db.expenseShare.findUniqueOrThrow({where:{id:share.id}})).paidCents).toBe(2000);
        const invalid = await ledger.propose(owner, share.id, 'adjustment', 500);
        await expect(ledger.decide(recipient, invalid, 'accept')).rejects.toMatchObject({status:409});
        await ledger.decide(owner, invalid, 'cancel');
        const refund = await ledger.propose(owner, share.id, 'refund', 500);
        await ledger.decide(recipient, refund, 'accept');
        expect((await db.expenseShare.findUniqueOrThrow({where:{id:share.id}})).paidCents).toBe(1500);
        await expect(ledger.history(stranger, share.id)).rejects.toMatchObject({status:404});
        expect((await ledger.history(owner, share.id)).items).toHaveLength(4);
    });
    it('supports offline members without creating a connection', async () => {
        await db.groupMember.update({ where: { id: memberId }, data: { email: null } });
        await expect(service.invite(owner, memberId)).rejects.toMatchObject({ status: 400 });
        expect(await repository.findByUserId(owner.id)).toHaveLength(1);
        expect((await service.list(owner)).connections).toHaveLength(0);
    });
    it('serializes concurrent revocation and acceptance', async () => {
        const invite = await connect();
        const share = await service.share(owner, transactionId, memberId);
        await Promise.allSettled([service.decideShare(recipient, share.id, 'accept'), service.decideConnection(owner, invite.id, 'revoke')]);
        const saved = await db.expenseShare.findUniqueOrThrow({ where: { id: share.id } });
        expect(['accepted', 'cancelled']).toContain(saved.status);
        expect(await repository.findByUserId(recipient.id)).toHaveLength(saved.status === 'accepted' ? 1 : 0);
    });
});
