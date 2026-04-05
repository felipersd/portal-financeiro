import { Category } from '../../Domain/Entities/Category';
import { CategoryRepository } from '../../Domain/Interfaces/CategoryRepository';

export class GetCategories {
    constructor(private categoryRepository: CategoryRepository) { }

    async execute(userId: string): Promise<Category[]> {
        return await this.categoryRepository.findByUserId(userId);
    }
}
