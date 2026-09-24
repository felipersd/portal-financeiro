import { BudgetRule } from '../Entities/BudgetRule';

export interface BudgetRuleRepository {
    findByMonth(userId: string, month: string): Promise<BudgetRule | null>;
    findMostRecentBefore(userId: string, month: string): Promise<BudgetRule | null>;
    create(rule: BudgetRule): Promise<BudgetRule>;
    update(id: string, rule: BudgetRule): Promise<BudgetRule>;
}
