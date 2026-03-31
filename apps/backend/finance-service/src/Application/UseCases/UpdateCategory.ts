import { Category } from '../../Domain/Entities/Category';
import { CategoryRepository } from '../../Domain/Interfaces/CategoryRepository';

export class UpdateCategory {
    constructor(private repository: CategoryRepository) { }

    async execute(id: string, name: string, userId: string): Promise<Category> {
        const category = await this.repository.findById(id);
        
        if (!category) {
            throw new Error('Category not found');
        }

        if (category.userId !== userId) {
            throw new Error('Unauthorized');
        }

        return await this.repository.update(id, name);
    }
}
