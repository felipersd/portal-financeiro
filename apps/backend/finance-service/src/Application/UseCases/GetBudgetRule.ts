import { BudgetRule } from '../../Domain/Entities/BudgetRule';
import { BudgetRuleRepository } from '../../Domain/Interfaces/BudgetRuleRepository';
import { v4 as uuidv4 } from 'uuid';

export class GetBudgetRule {
    constructor(private repository: BudgetRuleRepository) {}

    async execute(userId: string, month: string): Promise<BudgetRule> {
        let rule = await this.repository.findByMonth(userId, month);
        if (rule) return rule;

        const previousRule = await this.repository.findMostRecentBefore(userId, month);
        
        let newRule: BudgetRule;
        if (previousRule) {
            newRule = new BudgetRule(
                uuidv4(),
                userId,
                month,
                previousRule.needsPct,
                previousRule.wantsPct,
                previousRule.savingsPct,
                previousRule.mapping
            );
        } else {
            const defaultMapping = {
                'Casa & Contas': 'needs',
                'Mercado': 'needs',
                'Transporte': 'needs',
                'Saúde & Bem-estar': 'needs',
                'Impostos & Taxas': 'needs',
                'Bares & Restaurantes': 'wants',
                'Lazer & Assinaturas': 'wants',
                'Compras Pessoais': 'wants',
                'Educação': 'wants',
                'Pets': 'wants',
                'Presentes & Doações': 'wants',
                'Imprevistos': 'savings'
            };
            newRule = new BudgetRule(uuidv4(), userId, month, 50, 30, 20, defaultMapping as any);
        }

        return await this.repository.create(newRule);
    }
}
