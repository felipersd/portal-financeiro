import { Category } from '../Entities/Category';

export interface CategoryRepository {
    create(category: Category): Promise<Category>;
    findByUserId(userId: string): Promise<Category[]>;
}
