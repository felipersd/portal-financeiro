import { Category } from '../../Domain/Entities/Category';
import { CategoryRepository } from '../../Domain/Interfaces/CategoryRepository';
import { v4 as uuidv4 } from 'uuid';

export class GetCategories {
    constructor(private categoryRepository: CategoryRepository) { }

    async execute(userId: string): Promise<Category[]> {
        let categories = await this.categoryRepository.findByUserId(userId);

        if (categories.length === 0) {
            // Seed default categories
            const defaultCategories = [
                // Receitas
                { name: 'Salário', type: 'income' },
                { name: 'Renda Extra', type: 'income' },
                { name: 'Rendimentos', type: 'income' },
                // Despesas
                { name: 'Casa & Contas', type: 'expense' },
                { name: 'Mercado', type: 'expense' },
                { name: 'Bares & Restaurantes', type: 'expense' },
                { name: 'Transporte', type: 'expense' },
                { name: 'Lazer & Assinaturas', type: 'expense' },
                { name: 'Saúde & Bem-estar', type: 'expense' },
                { name: 'Compras Pessoais', type: 'expense' },
                { name: 'Educação', type: 'expense' },
                { name: 'Pets', type: 'expense' },
                { name: 'Impostos & Taxas', type: 'expense' },
                { name: 'Presentes & Doações', type: 'expense' },
                { name: 'Imprevistos', type: 'expense' },
            ];

            const createdCategories: Category[] = [];

            for (const cat of defaultCategories) {
                const newCategory = new Category(
                    uuidv4(),
                    cat.name,
                    cat.type as 'income' | 'expense',
                    userId
                );
                const created = await this.categoryRepository.create(newCategory);
                createdCategories.push(created);
            }

            return createdCategories;
        }

        return categories;
    }
}
