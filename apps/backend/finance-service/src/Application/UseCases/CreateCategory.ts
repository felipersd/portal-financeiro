import { Category } from '../../Domain/Entities/Category';
import { CategoryRepository } from '../../Domain/Interfaces/CategoryRepository';
import { v4 as uuidv4 } from 'uuid';

export class CreateCategory {
    constructor(private categoryRepository: CategoryRepository) { }

    async execute(name: string, type: 'income' | 'expense', userId: string): Promise<Category> {
        const category = new Category(
            uuidv4(),
            name,
            type,
            userId
        );
        return await this.categoryRepository.create(category);
    }
}
