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
