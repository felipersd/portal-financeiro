import { atomic } from './atomic';
import { FinanceError } from '../../Domain/FinanceError';
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
    async update(id: string, name: string, type?: 'income' | 'expense'): Promise<Category> {
        return atomic(this.prisma, async tx => {
            const category = await tx.category.findUniqueOrThrow({ where: { id } });
            const nextType = type || category.type;
            if (nextType !== category.type && await tx.transaction.count({ where: { categoryId: id } })) {
                throw new FinanceError(409, 'Uma categoria usada em contas não pode mudar entre receita e despesa. Crie outra categoria.');
            }
            if (await tx.category.findFirst({ where: { userId: category.userId, name, type: nextType, id: { not: id } } })) {
                throw new FinanceError(409, 'Já existe uma categoria com este nome e tipo.');
            }
            const data = await tx.category.update({ where: { id }, data: { name, type: nextType } });
            return new Category(data.id, data.name, data.type as 'income' | 'expense', data.userId);
        });
    }
    async delete(id: string): Promise<void> {
        await atomic(this.prisma, async tx => {
            if (await tx.transaction.count({ where: { categoryId: id } })) throw new FinanceError(409, 'Esta categoria possui contas. Preserve-a para manter o histórico.');
            await tx.category.delete({ where: { id } });
        });
    }
}
