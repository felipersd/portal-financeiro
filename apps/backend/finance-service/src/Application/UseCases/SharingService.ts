import { createHash } from 'crypto';
import { notify } from '../../Infrastructure/Database/notify';
import { PrismaClient } from '@prisma/client';
import { atomic } from '../../Infrastructure/Database/atomic';
import { FinanceError } from '../../Domain/FinanceError';
import { transactionSchema } from '../../Infrastructure/Http/validation';

export interface SharingActor {
    id: string;
    email: string;
    name: string;
}
const notFound = () => new FinanceError(404, 'Convite ou conta não encontrado.');

export class SharingService {
    constructor(private db: PrismaClient) {}

    async list(
        actor: SharingActor,
        page: { connections?: string; shares?: string; attention?: 'true' } = {},
    ) {
        const incoming = {
            ...(page.attention ? { status: 'pending', expiresAt: { gt: new Date() } } : {}),
            ownerId: { not: actor.id },
            OR: [
                { recipientId: actor.id },
                { email: actor.email, status: 'pending', expiresAt: { gt: new Date() } },
            ],
        };
        const visibleShares = { OR: [{ ownerId: actor.id }, { recipientId: actor.id }] };
        if (
            page.connections &&
            page.connections !== 'end' &&
            !(await this.db.memberConnection.findFirst({
                where: { ...incoming, id: page.connections },
                select: { id: true },
            }))
        )
            throw new FinanceError(400, 'Página inválida.');
        if (
            page.shares &&
            page.shares !== 'end' &&
            !(await this.db.expenseShare.findFirst({
                where: { ...visibleShares, id: page.shares },
                select: { id: true },
            }))
        )
            throw new FinanceError(400, 'Página inválida.');
        const [outgoing, connectionRows, shareRows, pendingLinks, pendingShares, pendingProposals] =
            await Promise.all([
                !page.connections
                    ? this.db.memberConnection.findMany({
                          where: { ownerId: actor.id },
                          orderBy: { id: 'asc' },
                      })
                    : [],
                page.connections === 'end'
                    ? []
                    : this.db.memberConnection.findMany({
                          where: incoming,
                          orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
                          take: 51,
                          ...(page.connections ? { cursor: { id: page.connections }, skip: 1 } : {}),
                      }),
                page.shares === 'end'
                    ? []
                    : this.db.expenseShare.findMany({
                          include: {
                              transaction: { include: { splits: true } },
                              proposals: { where: { status: 'pending' }, take: 1 },
                          },
                          where: {
                              ...visibleShares,
                              ...(page.attention
                                  ? {
                                        OR: [
                                            { recipientId: actor.id, status: 'pending' },
                                            {
                                                OR: [{ ownerId: actor.id }, { recipientId: actor.id }],
                                                proposals: {
                                                    some: {
                                                        status: 'pending',
                                                        proposerId: { not: actor.id },
                                                    },
                                                },
                                            },
                                        ],
                                    }
                                  : {}),
                          },
                          orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
                          take: 51,
                          ...(page.shares ? { cursor: { id: page.shares }, skip: 1 } : {}),
                      }),
                this.db.memberConnection.count({
                    where: { ...incoming, status: 'pending', expiresAt: { gt: new Date() } },
                }),
                this.db.expenseShare.count({ where: { recipientId: actor.id, status: 'pending' } }),
                this.db.shareProposal.count({
                    where: { status: 'pending', proposerId: { not: actor.id }, share: visibleShares },
                }),
            ]);
        const connections = [...outgoing, ...connectionRows.slice(0, 50)];
        const shares = shareRows.slice(0, 50);
        // Do not expose internal recipient ids, or another person's private member record.
        return {
            nextCursor:
                connectionRows.length > 50 || shareRows.length > 50
                    ? {
                          connections: connectionRows.length > 50 ? connectionRows[49].id : 'end',
                          shares: shareRows.length > 50 ? shareRows[49].id : 'end',
                      }
                    : null,
            attentionCount: pendingLinks + pendingShares + pendingProposals,
            connections: connections.map((c) => ({
                id: c.id,
                memberId: c.ownerId === actor.id ? c.memberId : undefined,
                peerKey: c.recipientId
                    ? createHash('sha256')
                          .update(
                              [actor.id, c.ownerId === actor.id ? c.recipientId : c.ownerId].sort().join(':'),
                          )
                          .digest('hex')
                    : c.id,
                ownerName: c.ownerName,
                email: c.ownerId === actor.id ? c.email : undefined,
                status: c.status === 'pending' && c.expiresAt <= new Date() ? 'expired' : c.status,
                direction: c.ownerId === actor.id ? 'outgoing' : 'incoming',
                expiresAt: c.expiresAt,
            })),
            shares: shares.map((s) => ({
                id: s.id,
                transactionId: s.ownerId === actor.id ? s.transactionId : undefined,
                memberId: s.ownerId === actor.id ? s.memberId : undefined,
                ownerName: s.ownerName,
                category: s.categoryName,
                tags: s.tagNames,
                description: s.description,
                amount: s.amountCents / 100,
                total: s.totalCents / 100,
                date: s.date,
                paidByRecipient: s.paidByRecipient,
                status: s.status,
                direction: s.ownerId === actor.id ? 'outgoing' : 'incoming',
                paidAmount: s.paidCents / 100,
                settlementAmount:
                    (s.transaction.payer === 'me'
                        ? s.amountCents
                        : s.transaction.payer === s.memberId
                          ? s.transaction.splits.find((p) => p.participantKey === 'me')?.amountCents || 0
                          : 0) / 100,
                canAdjust: ['me', s.memberId].includes(s.transaction.payer),
                debtor:
                    s.transaction.payer === 'me'
                        ? s.ownerId === actor.id
                            ? 'other'
                            : 'me'
                        : s.transaction.payer === s.memberId
                          ? s.ownerId === actor.id
                              ? 'me'
                              : 'other'
                          : 'thirdParty',
                proposal: s.proposals[0]
                    ? {
                          id: s.proposals[0].id,
                          kind: s.proposals[0].kind,
                          amount: s.proposals[0].amountCents / 100,
                          proposedByMe: s.proposals[0].proposerId === actor.id,
                      }
                    : null,
            })),
        };
    }

    async invite(actor: SharingActor, memberId: string) {
        return atomic(this.db, async (tx) => {
            const member = await tx.groupMember.findFirst({ where: { id: memberId, userId: actor.id } });
            if (!member) throw notFound();
            const email = member.email?.trim().toLowerCase();
            if (!email || email === actor.email)
                throw new FinanceError(400, 'Informe o e-mail de outra pessoa para convidar.');
            const existing = await tx.memberConnection.findUnique({ where: { memberId } });
            // Idempotent; declining a link does not authorize repeated unsolicited invitations.
            if (existing) {
                if (existing.status === 'pending' && existing.expiresAt <= new Date()) {
                    await tx.memberConnection.update({
                        where: { id: existing.id },
                        data: { expiresAt: new Date(Date.now() + 7 * 86400000) },
                    });
                }
                return { id: existing.id, status: existing.status };
            }
            const result = await tx.memberConnection.create({
                data: {
                    memberId,
                    ownerId: actor.id,
                    ownerName: actor.name,
                    email,
                    expiresAt: new Date(Date.now() + 7 * 86400000),
                },
            });
            return { id: result.id, status: result.status };
        });
    }

    async decideConnection(actor: SharingActor, id: string, action: 'accept' | 'decline' | 'revoke') {
        return atomic(this.db, async (tx) => {
            const link = await tx.memberConnection.findUnique({ where: { id } });
            if (!link) throw notFound();
            const isOwner = link.ownerId === actor.id;
            const isRecipient =
                link.recipientId === actor.id ||
                (link.status === 'pending' && link.email === actor.email && !isOwner);
            if (!isOwner && !isRecipient) throw notFound();
            if (action === 'revoke') {
                if (!['pending', 'accepted', 'revoked'].includes(link.status))
                    throw new FinanceError(409, 'Este convite já foi respondido.');
                await tx.memberConnection.update({ where: { id }, data: { status: 'revoked' } });
                await tx.expenseShare.updateMany({
                    where: { memberId: link.memberId, status: 'pending' },
                    data: { status: 'cancelled', decidedAt: new Date() },
                });
                return;
            }
            if (!isRecipient || isOwner) throw notFound();
            const status = action === 'accept' ? 'accepted' : 'declined';
            if (link.status === status && link.recipientId === actor.id) return;
            if (link.status !== 'pending' || link.expiresAt <= new Date())
                throw new FinanceError(409, 'O convite expirou ou já foi respondido.');
            if (action === 'accept') {
                const duplicate = await tx.memberConnection.findFirst({
                    where: { ownerId: link.ownerId, recipientId: actor.id, status: 'accepted' },
                });
                if (duplicate) throw new FinanceError(409, 'Vocês já possuem um vínculo ativo.');
            }
            await tx.memberConnection.update({ where: { id }, data: { status, recipientId: actor.id } });
        });
    }

    async share(actor: SharingActor, transactionId: string, memberId: string) {
        return atomic(this.db, async (tx) => {
            const link = await tx.memberConnection.findFirst({
                where: { memberId, ownerId: actor.id, status: 'accepted' },
            });
            if (!link?.recipientId)
                throw new FinanceError(409, 'O membro precisa aceitar o vínculo antes de receber contas.');
            const source = await tx.transaction.findFirst({
                where: { id: transactionId, userId: actor.id, deletedAt: null },
                include: { splits: true, categoryRef: true, tags: { include: { tag: true } } },
            });
            if (!source) throw notFound();
            const parsed = transactionSchema.safeParse({
                ...source,
                amount: Number(source.amount),
                splitDetails: {
                    splits: source.splits.map((s) => ({
                        memberId: s.participantKey,
                        amount: s.amountCents / 100,
                    })),
                },
                date: source.date.toISOString(),
            });
            if (!parsed.success || !source.isShared)
                throw new FinanceError(400, 'Revise os valores da divisão antes de compartilhar.');
            const split = parsed.data.splitDetails?.splits.find((s) => s.memberId === memberId);
            if (!split || split.amount <= 0)
                throw new FinanceError(400, 'Este membro não possui uma parte nesta conta.');
            // One financial obligation per recipient and source, even after double clicks/retries.
            const prior = await tx.expenseShare.findUnique({
                where: { transactionId_recipientId: { transactionId, recipientId: link.recipientId } },
            });
            if (prior) return { id: prior.id, status: prior.status };
            const result = await tx.expenseShare.create({
                data: {
                    transactionId,
                    memberId,
                    ownerId: actor.id,
                    recipientId: link.recipientId,
                    ownerName: actor.name,
                    description: source.description,
                    amountCents: Math.round(split.amount * 100),
                    totalCents: Number(source.amount.mul(100)),
                    categoryName: source.categoryRef?.name || source.category,
                    tagNames: source.tags.map((row) => row.tag.name),
                    date: source.date,
                    paidByRecipient: source.payer === memberId,
                },
            });
            await notify(tx, link.recipientId, 'expense_received', result.id);
            return { id: result.id, status: result.status };
        });
    }

    async decideShare(actor: SharingActor, id: string, action: 'accept' | 'decline' | 'cancel') {
        return atomic(this.db, async (tx) => {
            const share = await tx.expenseShare.findUnique({ where: { id } });
            if (!share || (action === 'cancel' ? share.ownerId !== actor.id : share.recipientId !== actor.id))
                throw notFound();
            const status = action === 'accept' ? 'accepted' : action === 'decline' ? 'declined' : 'cancelled';
            if (share.status === status) return;
            if (share.status !== 'pending')
                throw new FinanceError(
                    409,
                    'Esta conta já foi respondida. O aceite preserva o valor combinado.',
                );
            if (action === 'accept') {
                const link = await tx.memberConnection.findFirst({
                    where: {
                        memberId: share.memberId,
                        ownerId: share.ownerId,
                        recipientId: actor.id,
                        status: 'accepted',
                    },
                });
                if (!link) throw new FinanceError(409, 'O vínculo foi encerrado.');
            }
            await tx.expenseShare.update({ where: { id }, data: { status, decidedAt: new Date() } });
            await notify(
                tx,
                action === 'cancel' ? share.recipientId : share.ownerId,
                `expense_${status}`,
                id,
            );
        });
    }
}
