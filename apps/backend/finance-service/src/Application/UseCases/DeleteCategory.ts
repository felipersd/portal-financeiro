import { CategoryRepository } from '../../Domain/Interfaces/CategoryRepository';

export class DeleteCategory {
    constructor(private repository: CategoryRepository) { }

    async execute(id: string, userId: string): Promise<void> {
        const category = await this.repository.findById(id);
        if (!category) {
            throw new Error('Category not found');
        }

        if (category.userId !== userId) {
            throw new Error('Unauthorized');
        }

        await this.repository.delete(id);
    }
}
