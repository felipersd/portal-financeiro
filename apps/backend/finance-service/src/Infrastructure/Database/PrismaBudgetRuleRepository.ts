import { BudgetRule, BudgetDivision } from '../../Domain/Entities/BudgetRule';
import { BudgetRuleRepository } from '../../Domain/Interfaces/BudgetRuleRepository';
import { prisma } from './prismaClient';

export class PrismaBudgetRuleRepository implements BudgetRuleRepository {
    async findByMonth(userId: string, month: string): Promise<BudgetRule | null> {
        const data = await prisma.budgetRule.findUnique({
            where: {
                userId_month: { userId, month }
            }
        });
        if (!data) return null;
        return new BudgetRule(data.id, data.userId, data.month, data.divisions as unknown as BudgetDivision[], data.mapping as any);
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
        return new BudgetRule(data.id, data.userId, data.month, data.divisions as unknown as BudgetDivision[], data.mapping as any);
    }

    async create(rule: BudgetRule): Promise<BudgetRule> {
        const data = await prisma.budgetRule.create({
            data: {
                id: rule.id,
                userId: rule.userId,
                month: rule.month,
                divisions: rule.divisions as any,
                mapping: rule.mapping
            }
        });
        return new BudgetRule(data.id, data.userId, data.month, data.divisions as unknown as BudgetDivision[], data.mapping as any);
    }

    async update(id: string, rule: BudgetRule): Promise<BudgetRule> {
        const data = await prisma.budgetRule.update({
            where: { id },
            data: {
                divisions: rule.divisions as any,
                mapping: rule.mapping
            }
        });
        return new BudgetRule(data.id, data.userId, data.month, data.divisions as unknown as BudgetDivision[], data.mapping as any);
    }

    async updateFollowingMonths(userId: string, fromMonth: string, rule: BudgetRule): Promise<void> {
        await prisma.budgetRule.updateMany({
            where: {
                userId,
                month: { gt: fromMonth }
            },
            data: {
                divisions: rule.divisions as any,
                mapping: rule.mapping
            }
        });
    }
}
