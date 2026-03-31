import { BudgetRule } from '../../Domain/Entities/BudgetRule';
import { BudgetRuleRepository } from '../../Domain/Interfaces/BudgetRuleRepository';
import { v4 as uuidv4 } from 'uuid';

export class GetBudgetRule {
    constructor(private repository: BudgetRuleRepository) {}

    async execute(userId: string, month: string): Promise<BudgetRule> {
        let rule = await this.repository.findByMonth(userId, month);

        const defaultDivisions = [
            { id: 'div-needs', name: 'Necessidades', percentage: 50, color: '#10b981' },
            { id: 'div-wants', name: 'Desejos', percentage: 30, color: '#3b82f6' },
            { id: 'div-savings', name: 'Poupança / Investimentos', percentage: 20, color: '#8b5cf6' }
        ];

        const defaultMapping = {
            'Moradia & Contas': 'div-needs',
            'Mercado & Farmácia': 'div-needs',
            'Transporte': 'div-needs',
            'Educação & Família': 'div-needs',
            'Imprevistos & Avulsos': 'div-needs',
            'Lazer & Assinaturas': 'div-wants',
            'Delivery & Restaurantes': 'div-wants',
            'Compras & Cuidados': 'div-wants',
            'Poupança & Investimento': 'div-savings'
        };

        if (rule) {
            if (!rule.divisions || rule.divisions.length === 0) {
                rule.divisions = defaultDivisions;
                rule.mapping = defaultMapping as Record<string, string>;
            }
            return rule;
        }

        const previousRule = await this.repository.findMostRecentBefore(userId, month);
        
        let newRule: BudgetRule;
        if (previousRule && previousRule.divisions && previousRule.divisions.length > 0) {
            newRule = new BudgetRule(
                uuidv4(),
                userId,
                month,
                previousRule.divisions,
                previousRule.mapping
            );
        } else {
            newRule = new BudgetRule(uuidv4(), userId, month, defaultDivisions, defaultMapping as any);
        }

        return await this.repository.create(newRule);
    }
}
