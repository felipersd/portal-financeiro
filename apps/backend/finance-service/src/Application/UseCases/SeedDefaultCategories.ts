import { Category } from '../../Domain/Entities/Category';
import { CategoryRepository } from '../../Domain/Interfaces/CategoryRepository';
import { BudgetRule, BudgetDivision } from '../../Domain/Entities/BudgetRule';
import { BudgetRuleRepository } from '../../Domain/Interfaces/BudgetRuleRepository';
import { v4 as uuidv4 } from 'uuid';

export class SeedDefaultCategories {
    constructor(
        private categoryRepository: CategoryRepository,
        private budgetRuleRepository: BudgetRuleRepository
    ) { }

    async execute(userId: string): Promise<Category[]> {
        // Verifica se o usuário já tem categorias
        const existing = await this.categoryRepository.findByUserId(userId);
        if (existing && existing.length > 0) {
            return existing; // Já inicializado
        }

        const defaultCategories = [
            // Receitas
            { name: 'Salário', type: 'income' },
            { name: 'Renda Extra', type: 'income' },
            { name: 'Rendimentos', type: 'income' },
            // Despesas
            { name: 'Moradia & Contas', type: 'expense' },
            { name: 'Mercado & Farmácia', type: 'expense' },
            { name: 'Transporte', type: 'expense' },
            { name: 'Educação & Família', type: 'expense' },
            { name: 'Imprevistos & Avulsos', type: 'expense' },
            { name: 'Lazer & Assinaturas', type: 'expense' },
            { name: 'Delivery & Restaurantes', type: 'expense' },
            { name: 'Compras & Cuidados', type: 'expense' },
            { name: 'Poupança & Investimento', type: 'expense' },
        ];

        const createdCategories: Category[] = [];

        for (const cat of defaultCategories) {
            const category = new Category(
                uuidv4(),
                cat.name,
                cat.type as 'income' | 'expense',
                userId
            );
            const created = await this.categoryRepository.create(category);
            createdCategories.push(created);
        }

        // Criar Regra de Orçamento Padrão (50-30-20)
        const date = new Date();
        const month = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        
        const existingRule = await this.budgetRuleRepository.findByMonth(userId, month);
        if (!existingRule) {
            const essenciaisId = uuidv4();
            const lazerId = uuidv4();
            const investimentosId = uuidv4();

            const divisions: BudgetDivision[] = [
                { id: essenciaisId, name: 'Essenciais', percentage: 50, color: '#3b82f6' }, // blue-500
                { id: lazerId, name: 'Lazer & Desejos', percentage: 30, color: '#ec4899' }, // pink-500
                { id: investimentosId, name: 'Investimentos', percentage: 20, color: '#10b981' } // emerald-500
            ];

            const mapping: Record<string, string> = {};
            
            // Mapear apenas para as categorias de despesa criadas
            for (const cat of createdCategories) {
                if (cat.type !== 'expense') continue;
                
                if (['Moradia & Contas', 'Mercado & Farmácia', 'Transporte', 'Educação & Família', 'Compras & Cuidados', 'Imprevistos & Avulsos'].includes(cat.name)) {
                    mapping[cat.name] = essenciaisId;
                } else if (['Lazer & Assinaturas', 'Delivery & Restaurantes'].includes(cat.name)) {
                    mapping[cat.name] = lazerId;
                } else if (['Poupança & Investimento'].includes(cat.name)) {
                    mapping[cat.name] = investimentosId;
                }
            }

            const rule = new BudgetRule(
                uuidv4(),
                userId,
                month,
                divisions,
                mapping
            );

            await this.budgetRuleRepository.create(rule);
        }

        return createdCategories;
    }
}
