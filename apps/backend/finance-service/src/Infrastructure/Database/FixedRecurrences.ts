import { Prisma, PrismaClient } from '@prisma/client';
import { randomUUID } from 'crypto';
import { atomic } from './atomic';
import { FinanceError } from '../../Domain/FinanceError';

export class FixedRecurrences {
    constructor(private db: PrismaClient) {}

    async ensureYear(userId: string, year: number) {
        if (!Number.isInteger(year) || year < 1900 || year > 2199) throw new FinanceError(400, 'Ano inválido.');
        const rules = await this.db.fixedRule.findMany({ where: { userId, anchorDate: { lt:new Date(Date.UTC(year+1,0,1)) },
            OR:[{endMonth:null},{endMonth:{gt:`${year}-01`}}] }, include:{transactions:{where:{occurrenceMonth:{gte:`${year}-01`,lte:`${year}-12`}},select:{occurrenceMonth:true}}} });
        const incomplete = rules.filter(rule => Array.from({length:12},(_,m)=>`${year}-${String(m+1).padStart(2,'0')}`).some(month => month>=rule.anchorDate.toISOString().slice(0,7) && (!rule.endMonth || month<rule.endMonth) && !rule.transactions.some(t=>t.occurrenceMonth===month)));
        for (const {id} of incomplete) await atomic(this.db, async tx=>{
            // All generation, editing and stopping touch this row, serializing changes to one series.
            const rule = await tx.fixedRule.update({where:{id},data:{updatedAt:new Date()}});
            for (let m=0;m<12;m++) {
                const month=`${year}-${String(m+1).padStart(2,'0')}`;
                if (month < rule.anchorDate.toISOString().slice(0,7) || (rule.endMonth && month>=rule.endMonth)) continue;
                if (await tx.transaction.findUnique({where:{fixedRuleId_occurrenceMonth:{fixedRuleId:id,occurrenceMonth:month}},select:{id:true}})) continue;
                // A deleted occurrence stays as a marker/template: it must never reappear on refresh.
                const source = await tx.transaction.findFirst({where:{fixedRuleId:id,occurrenceMonth:{lt:month}},
                    orderBy:{occurrenceMonth:'desc'},include:{splits:true}});
                if (!source) throw new FinanceError(409,'A recorrência precisa de revisão antes de gerar novas contas.');
                const day=Math.min(rule.anchorDay,new Date(Date.UTC(year,m+1,0)).getUTCDate());
                await tx.transaction.create({data:{id:randomUUID(),userId,description:source.description,amount:source.amount,
                    type:source.type,category:source.category,categoryId:source.categoryId,date:new Date(Date.UTC(year,m,day)),
                    isShared:source.isShared,payer:source.payer,isFixed:true,recurrenceId:id,fixedRuleId:id,occurrenceMonth:month,
                    splitDetails:source.splitDetails ?? Prisma.DbNull,
                    splits:{create:source.splits.map(s=>({participantKey:s.participantKey,memberId:s.memberId,amountCents:s.amountCents}))}}});
            }
        });
    }

    async stop(userId: string, transactionId: string) {
        await atomic(this.db, async tx=>{
            const source = await tx.transaction.findFirst({where:{id:transactionId,userId,deletedAt:null}});
            if (!source?.isFixed || !source.recurrenceId) throw new FinanceError(404,'Recorrência não encontrada.');
            const rule = source.fixedRuleId ? await tx.fixedRule.update({where:{id:source.fixedRuleId},data:{updatedAt:new Date()}}) : null;
            const month=source.occurrenceMonth || source.date.toISOString().slice(0,7);
            const from = rule?.endMonth && rule.endMonth < month ? rule.endMonth : month;
            const future=rule ? {fixedRuleId:rule.id,occurrenceMonth:{gte:from}} : {userId,recurrenceId:source.recurrenceId,date:{gte:source.date}};
            if (await tx.expenseShare.count({where:{transaction:future,status:{in:['pending','accepted']}}})) {
                throw new FinanceError(409,'Há contas futuras pendentes ou aceitas. Cancele os envios pendentes e preserve os aceites antes de encerrar.');
            }
            if (rule) await tx.fixedRule.update({where:{id:rule.id},data:{endMonth:from}});
            await tx.transaction.updateMany({where:future,data:{deletedAt:new Date()}});
        });
    }
}
