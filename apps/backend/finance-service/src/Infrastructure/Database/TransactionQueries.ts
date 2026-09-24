import { FixedRecurrences } from './FixedRecurrences';
import { Prisma, PrismaClient } from '@prisma/client';
import { FinanceError } from '../../Domain/FinanceError';
import { transactionEntity, transactionInclude } from './PrismaTransactionRepository';
import { Transaction } from '../../Domain/Entities/Transaction';

export class TransactionQueries {
    constructor(private db: PrismaClient) {}

    async page(userId: string, month: string, cursor?: string) {
        if (!/^(19|20|21)\d{2}-(0[1-9]|1[0-2])$/.test(month)) throw new FinanceError(400, 'Mês inválido.');
        await new FixedRecurrences(this.db).ensureYear(userId, Number(month.slice(0,4)));
        const start = new Date(`${month}-01T00:00:00.000Z`);
        const end = new Date(start); end.setUTCMonth(end.getUTCMonth() + 1);
        let after = Prisma.empty;
        if (cursor) {
            try {
                if (cursor.length > 200) throw new Error();
                const decoded = JSON.parse(Buffer.from(cursor, 'base64url').toString('utf8'));
                if (typeof decoded.id !== 'string' || !/^(share:)?[0-9a-f-]{36}$/i.test(decoded.id) || typeof decoded.date !== 'string') throw new Error();
                const date = new Date(decoded.date);
                if (!Number.isFinite(date.getTime()) || date < start || date >= end) throw new Error();
                after = Prisma.sql`WHERE (date, id) < (${date}, ${decoded.id})`;
            } catch { throw new FinanceError(400, 'Página inválida.'); }
        }
        // UNION keeps owned and accepted incoming expenses in one stable, bounded cursor stream.
        const rows = await this.db.$queryRaw<Array<{id: string; date: Date}>>(Prisma.sql`
            SELECT id, date FROM (
                SELECT id, date FROM finance."Transaction" WHERE "userId"=${userId} AND "deletedAt" IS NULL AND date>=${start} AND date<${end}
                UNION ALL
                SELECT 'share:' || id, date FROM finance."ExpenseShare" WHERE "recipientId"=${userId} AND status='accepted' AND date>=${start} AND date<${end}
            ) visible ${after} ORDER BY date DESC, id DESC LIMIT 101`);
        const selected = rows.slice(0, 100);
        const [owned, received] = await Promise.all([
            this.db.transaction.findMany({ where: { userId, deletedAt:null, id: { in: selected.filter(r=>!r.id.startsWith('share:')).map(r=>r.id) } }, include: transactionInclude }),
            this.db.expenseShare.findMany({ where: { recipientId:userId, status:'accepted', id: { in:selected.filter(r=>r.id.startsWith('share:')).map(r=>r.id.slice(6)) } } }),
        ]);
        const items = new Map<string, Transaction>(owned.map(t=>[t.id,transactionEntity(t)]));
        for (const s of received) items.set(`share:${s.id}`, Object.assign(new Transaction(`share:${s.id}`, s.description,
            s.amountCents / 100, 'expense', 'Compartilhadas', s.date, false, 'me', userId, s.createdAt),
            { readOnly:true, sharedFromName:s.ownerName, receivedShareId:s.id }));
        return { items: selected.flatMap(r=>items.has(r.id) ? [items.get(r.id)!] : []),
            nextCursor: rows.length > 100 ? Buffer.from(JSON.stringify(selected[99])).toString('base64url') : null };
    }

    async annual(userId: string, year: number) {
        if (!Number.isInteger(year) || year < 1900 || year > 2199) throw new FinanceError(400, 'Ano inválido.');
        await new FixedRecurrences(this.db).ensureYear(userId, year);
        const start = new Date(Date.UTC(year,0,1)), end = new Date(Date.UTC(year+1,0,1));
        const rows = await this.db.$queryRaw<Array<{month:number; income:Prisma.Decimal; expense:Prisma.Decimal}>>`
            SELECT extract(month FROM date)::int AS month,
                COALESCE(sum(amount) FILTER (WHERE type='income'),0) AS income,
                COALESCE(sum(amount) FILTER (WHERE type='expense'),0) AS expense
            FROM (
                SELECT t.date,t.type,CASE WHEN t.type='expense' AND t."isShared"
                    THEN COALESCE(s."amountCents",0)::numeric/100 ELSE t.amount END AS amount
                FROM finance."Transaction" t LEFT JOIN finance."TransactionSplit" s ON s."transactionId"=t.id AND s."participantKey"='me'
                WHERE t."userId"=${userId} AND t."deletedAt" IS NULL AND t.date>=${start} AND t.date<${end}
                UNION ALL
                SELECT date,'expense',"amountCents"::numeric/100 FROM finance."ExpenseShare"
                WHERE "recipientId"=${userId} AND status='accepted' AND date>=${start} AND date<${end}
            ) visible GROUP BY extract(month FROM date)`;
        return Array.from({length:12},(_,i)=>{
            const row=rows.find(r=>r.month===i+1);
            return {month:i+1,income:Number(row?.income || 0),expense:Number(row?.expense || 0)};
        });
    }
}
