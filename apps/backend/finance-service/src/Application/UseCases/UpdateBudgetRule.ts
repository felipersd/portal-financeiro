import { BudgetRule } from '../../Domain/Entities/BudgetRule';
import { BudgetRuleRepository } from '../../Domain/Interfaces/BudgetRuleRepository';

export class UpdateBudgetRule {
    constructor(private repository: BudgetRuleRepository) {}

    async execute(userId: string, month: string, updateData: Partial<BudgetRule>): Promise<BudgetRule> {
        // Will only update the specific month rule to preserve history
        let rule = await this.repository.findByMonth(userId, month);
        
        if (!rule) {
            throw new Error('Rule not found for this month');
        }

        if (updateData.needsPct !== undefined) rule.needsPct = updateData.needsPct;
        if (updateData.wantsPct !== undefined) rule.wantsPct = updateData.wantsPct;
        if (updateData.savingsPct !== undefined) rule.savingsPct = updateData.savingsPct;
        if (updateData.mapping !== undefined) rule.mapping = updateData.mapping;

        return await this.repository.update(rule.id, rule);
    }
}
