import { PrismaClient } from '@prisma/client';
import { BudgetRule } from '../../Domain/Entities/BudgetRule';
import { BudgetRuleRepository } from '../../Domain/Interfaces/BudgetRuleRepository';

const prisma = new PrismaClient();

export class PrismaBudgetRuleRepository implements BudgetRuleRepository {
    async findByMonth(userId: string, month: string): Promise<BudgetRule | null> {
        const data = await prisma.budgetRule.findUnique({
            where: {
                userId_month: { userId, month }
            }
        });
        if (!data) return null;
        return new BudgetRule(data.id, data.userId, data.month, data.needsPct, data.wantsPct, data.savingsPct, data.mapping as any);
    }

    async findMostRecentBefore(userId: string, month: string): Promise<BudgetRule | null> {
        const data = await prisma.budgetRule.findFirst({
            where: {
                userId,
                month: { lt: month }
            },
            orderBy: { month: 'desc' }
        });
        if (!data) return null;
        return new BudgetRule(data.id, data.userId, data.month, data.needsPct, data.wantsPct, data.savingsPct, data.mapping as any);
    }

    async create(rule: BudgetRule): Promise<BudgetRule> {
        const data = await prisma.budgetRule.create({
            data: {
                id: rule.id,
                userId: rule.userId,
                month: rule.month,
                needsPct: rule.needsPct,
                wantsPct: rule.wantsPct,
                savingsPct: rule.savingsPct,
                mapping: rule.mapping
            }
        });
        return new BudgetRule(data.id, data.userId, data.month, data.needsPct, data.wantsPct, data.savingsPct, data.mapping as any);
    }

    async update(id: string, rule: BudgetRule): Promise<BudgetRule> {
        const data = await prisma.budgetRule.update({
            where: { id },
            data: {
                needsPct: rule.needsPct,
                wantsPct: rule.wantsPct,
                savingsPct: rule.savingsPct,
                mapping: rule.mapping
            }
        });
        return new BudgetRule(data.id, data.userId, data.month, data.needsPct, data.wantsPct, data.savingsPct, data.mapping as any);
    }
}
