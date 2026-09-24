import { PrismaClient } from '@prisma/client';
import { atomic } from '../../Infrastructure/Database/atomic';
import { FinanceError } from '../../Domain/FinanceError';
import { SharingActor } from './SharingService';

type Kind = 'adjustment' | 'payment' | 'refund';
export class ShareLedger {
 constructor(private db: PrismaClient) {}
 async propose(actor: SharingActor, shareId: string, kind: Kind, amountCents: number) {
  return atomic(this.db, async tx => {
   const share = await tx.expenseShare.findUnique({ where: { id: shareId } });
   if (!share || ![share.ownerId, share.recipientId].includes(actor.id)) throw new FinanceError(404, 'Conta não encontrada.');
   if (share.status !== 'accepted') throw new FinanceError(409, 'A conta precisa estar aceita.');
   if (!Number.isSafeInteger(amountCents) || amountCents < 0 || amountCents > share.totalCents || (kind !== 'adjustment' && amountCents === 0)) throw new FinanceError(400, 'Valor inválido.');
   const pending = await tx.shareProposal.findFirst({ where: { shareId, status: 'pending' } });
   if (pending) {
    if (pending.proposerId === actor.id && pending.kind === kind && pending.amountCents === amountCents) return pending.id;
    throw new FinanceError(409, 'Responda ou cancele a proposta pendente primeiro.');
   }
   return (await tx.shareProposal.create({ data: { shareId, proposerId: actor.id, kind, amountCents, baseRevision: share.revision } })).id;
  });
 }
 async decide(actor: SharingActor, id: string, action: 'accept' | 'decline' | 'cancel') {
  return atomic(this.db, async tx => {
   const proposal = await tx.shareProposal.findUnique({ where: { id }, include: { share: { include: { transaction: { include: { splits: true } } } } } });
   if (!proposal || ![proposal.share.ownerId, proposal.share.recipientId].includes(actor.id)) throw new FinanceError(404, 'Proposta não encontrada.');
   if (action === 'cancel' ? proposal.proposerId !== actor.id : proposal.proposerId === actor.id) throw new FinanceError(403, 'A outra pessoa precisa confirmar esta proposta.');
   const status = action === 'accept' ? 'accepted' : action === 'decline' ? 'declined' : 'cancelled';
   if (proposal.status === status) return;
   if (proposal.status !== 'pending') throw new FinanceError(409, 'Esta proposta já foi respondida.');
   const share = proposal.share;
   if (action === 'accept') {
    if (share.status !== 'accepted' || share.revision !== proposal.baseRevision) throw new FinanceError(409, 'A conta mudou. Cancele a proposta e revise os valores.');
    const source = share.transaction;
    const own = source.splits.find(s => s.participantKey === 'me')?.amountCents || 0;
    const debt = source.payer === 'me' ? share.amountCents : source.payer === share.memberId ? own : 0;
    if (proposal.kind === 'adjustment') {
     if (!['me', share.memberId].includes(source.payer)) throw new FinanceError(409, 'Esta correção afetaria outro pagador. Ela precisa de um acordo entre todos os envolvidos.');
     const delta = proposal.amountCents - share.amountCents;
     if (own - delta < 0) throw new FinanceError(400, 'A nova parte não pode retirar valores de outros participantes.');
     const newDebt = source.payer === 'me' ? proposal.amountCents : source.payer === share.memberId ? own - delta : 0;
     if (share.paidCents > newDebt) throw new FinanceError(409, 'Confirme a devolução do valor excedente antes de reduzir a parte.');
     // Only these two participants change; all other shares and the original total remain intact.
     await tx.transactionSplit.update({ where: { transactionId_participantKey: { transactionId: source.id, participantKey: share.memberId } }, data: { amountCents: proposal.amountCents } });
     await tx.transactionSplit.upsert({ where: { transactionId_participantKey: { transactionId: source.id, participantKey: 'me' } },
      create: { transactionId: source.id, participantKey: 'me', amountCents: own-delta }, update: { amountCents: own-delta } });
     const rows = await tx.transactionSplit.findMany({ where: { transactionId: source.id } });
     await tx.transaction.update({ where: { id: source.id }, data: { splitDetails: { splits: rows.map(s => ({memberId:s.participantKey,amount:s.amountCents/100})) } } });
     await tx.expenseShare.update({ where: { id: share.id }, data: { amountCents: proposal.amountCents, revision: { increment: 1 } } });
    } else {
     const paid = share.paidCents + (proposal.kind === 'refund' ? -proposal.amountCents : proposal.amountCents);
     if (paid < 0 || paid > debt) throw new FinanceError(400, 'O pagamento/devolução ultrapassa o saldo combinado entre vocês.');
     await tx.expenseShare.update({ where: { id: share.id }, data: { paidCents: paid, revision: { increment: 1 } } });
    }
   }
   await tx.shareProposal.update({ where: { id }, data: { status, decidedAt: new Date() } });
  });
 }
 async history(actor: SharingActor, shareId: string, cursor?: string) {
  const share = await this.db.expenseShare.findFirst({ where: { id: shareId, OR: [{ ownerId: actor.id }, { recipientId: actor.id }] } });
  if (!share) throw new FinanceError(404, 'Conta não encontrada.');
  if (cursor && !await this.db.shareProposal.findFirst({ where: { id: cursor, shareId }, select: { id: true } })) throw new FinanceError(400, 'Página inválida.');
  const rows = await this.db.shareProposal.findMany({ where: { shareId }, ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}), orderBy: [{ createdAt: 'desc' }, { id: 'desc' }], take: 51 });
  return { items: rows.slice(0,50).map(p => ({ id:p.id, kind:p.kind, amount:p.amountCents/100, status:p.status,
   proposedByMe:p.proposerId===actor.id, createdAt:p.createdAt, decidedAt:p.decidedAt })), nextCursor: rows.length > 50 ? rows[49].id : null };
 }
}
