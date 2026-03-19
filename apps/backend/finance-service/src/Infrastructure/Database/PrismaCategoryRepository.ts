import { PrismaClient } from '@prisma/client';
import { Category } from '../../Domain/Entities/Category';
import { CategoryRepository } from '../../Domain/Interfaces/CategoryRepository';

export class PrismaCategoryRepository implements CategoryRepository {
    constructor(private prisma: PrismaClient) { }

    async create(category: Category): Promise<Category> {
        const data = await this.prisma.category.create({
            data: {
                id: category.id,
                name: category.name,
                type: category.type,
                userId: category.userId,
            },
        });
        return new Category(data.id, data.name, data.type as 'income' | 'expense', data.userId);
    }

    async findByUserId(userId: string): Promise<Category[]> {
        const categories = await this.prisma.category.findMany({
            where: { userId },
        });
        return categories.map(
            (data: any) => new Category(data.id, data.name, data.type as 'income' | 'expense', data.userId)
        );
    }

    async findById(id: string): Promise<Category | null> {
        const data = await this.prisma.category.findUnique({ where: { id } });
        if (!data) return null;
        return new Category(data.id, data.name, data.type as 'income' | 'expense', data.userId);
    }

    async delete(id: string): Promise<void> {
        await this.prisma.category.delete({ where: { id } });
    }
}
