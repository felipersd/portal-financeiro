import { Prisma, PrismaClient, BudgetRule as Row } from '@prisma/client';

import { BudgetRule, BudgetDivision } from '../../Domain/Entities/BudgetRule';

import { BudgetRuleRepository } from '../../Domain/Interfaces/BudgetRuleRepository';


import { atomic } from './atomic';

import { FinanceError } from '../../Domain/FinanceError';

const entity = (d: Row) => new BudgetRule(d.id, d.userId, d.month, d.divisions as unknown as BudgetDivision[], d.mapping as Record<string,string>, d.revision);

async function mappingFor(tx: Prisma.TransactionClient, rule: BudgetRule) {

    const categories = await tx.category.findMany({ where: { userId: rule.userId, type: 'expense' }, orderBy: { id: 'asc' } });

    const mapping: Record<string,string> = {};

    for (const [key, value] of Object.entries(rule.mapping)) {

        const category = categories.find(c => c.id === key) || categories.find(c => c.name === key);

        if (category) mapping[category.id] = value;

    }

    return mapping;

}

export class PrismaBudgetRuleRepository implements BudgetRuleRepository {

    constructor(private db: PrismaClient) {}

    async findByMonth(userId: string, month: string) {

        const d = await this.db.budgetRule.findUnique({ where: { userId_month: { userId, month } } });

        return d ? entity(d) : null;

    }

    async findMostRecentBefore(userId: string, month: string) {

        const d = await this.db.budgetRule.findFirst({ where: { userId, month: { lt: month } }, orderBy: { month: 'desc' } });

        return d ? entity(d) : null;

    }

    async create(rule: BudgetRule) {

        return atomic(this.db, async tx => {

            const existing = await tx.budgetRule.findUnique({ where: { userId_month: { userId: rule.userId, month: rule.month } } });

            if (existing) return entity(existing);

            const mapping = await mappingFor(tx, rule);

            const divisions = rule.divisions as unknown as Prisma.InputJsonValue;

            const d = await tx.budgetRule.create({ data: { id: rule.id, userId: rule.userId, month: rule.month, divisions, mapping,

                versions: { create: { revision: 0, divisions, mapping } } } });

            return entity(d);

        });

    }

    async update(id: string, rule: BudgetRule) {

        return atomic(this.db, async tx => {

            const mapping = await mappingFor(tx, rule);

            const divisions = rule.divisions as unknown as Prisma.InputJsonValue;

            const result = await tx.budgetRule.updateMany({ where: { id, userId: rule.userId, revision: rule.revision },

                data: { divisions, mapping, revision: { increment: 1 } } });

            if (!result.count) throw new FinanceError(409, 'Este orçamento foi alterado em outra sessão. Atualize antes de salvar.');

            await tx.budgetRuleVersion.create({ data: { ruleId: id, revision: rule.revision + 1, divisions, mapping } });

            return entity(await tx.budgetRule.findUniqueOrThrow({ where: { id } }));

        });

    }

}
