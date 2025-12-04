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
                // Income
                { name: 'Salário', type: 'income' },
                { name: 'Investimentos', type: 'income' },
                { name: 'Outros', type: 'income' },
                // Expense
                { name: 'Alimentação', type: 'expense' },
                { name: 'Moradia', type: 'expense' },
                { name: 'Transporte', type: 'expense' },
                { name: 'Lazer', type: 'expense' },
                { name: 'Saúde', type: 'expense' },
                { name: 'Educação', type: 'expense' },
                { name: 'Contas Fixas', type: 'expense' },
                { name: 'Compras', type: 'expense' },
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
