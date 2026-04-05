import { BudgetRule } from '../../Domain/Entities/BudgetRule';
import { BudgetRuleRepository } from '../../Domain/Interfaces/BudgetRuleRepository';
import { v4 as uuidv4 } from 'uuid';

export class GetBudgetRule {
    constructor(private repository: BudgetRuleRepository) {}

    async execute(userId: string, month: string): Promise<BudgetRule> {
        let rule = await this.repository.findByMonth(userId, month);

        if (rule) {
            return rule;
        }

        const previousRule = await this.repository.findMostRecentBefore(userId, month);
        
        if (previousRule && previousRule.divisions && previousRule.divisions.length > 0) {
            const newRule = new BudgetRule(
                uuidv4(),
                userId,
                month,
                previousRule.divisions,
                previousRule.mapping
            );
            return await this.repository.create(newRule);
        }

        // Fallback: Se o usuário navegar para um mês passado onde não existe regra alguma,
        // criamos uma regra padrão "em branco" ou 50-30-20 na hora (Factory), para que o card renderize
        // e permita atualizações usando o UpdateBudgetRule.
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
            'Compras & Cuidados': 'div-needs',
            'Imprevistos & Avulsos': 'div-needs',
            'Lazer & Assinaturas': 'div-wants',
            'Delivery & Restaurantes': 'div-wants',
            'Poupança & Investimento': 'div-savings'
        };

        const fallbackRule = new BudgetRule(
            uuidv4(),
            userId,
            month,
            defaultDivisions,
            defaultMapping as any
        );

        return await this.repository.create(fallbackRule);
    }
}
