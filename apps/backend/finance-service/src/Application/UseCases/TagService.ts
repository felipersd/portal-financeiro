import { PrismaClient } from '@prisma/client';
import { atomic } from '../../Infrastructure/Database/atomic';
import { FinanceError } from '../../Domain/FinanceError';

export const normalizeTag = (name: string) => name.normalize('NFKC').trim().toLocaleLowerCase('pt-BR');
const defaults = ['Supermercado', 'Aluguel', 'Restaurantes', 'Assinaturas', 'Saúde', 'Viagem', 'Salário'];

export class TagService {
    constructor(private db: PrismaClient) {}

    async preferences(userId: string) {
        const preferences = await this.db.financePreferences.findUnique({ where: { userId } });
        return { tagsEnabled: preferences?.tagsEnabled ?? false };
    }

    async configure(userId: string, tagsEnabled: boolean) {
        return atomic(this.db, async (tx) => {
            const previous = await tx.financePreferences.findUnique({ where: { userId } });
            if (tagsEnabled && !previous?.tagsInitialized) {
                const existing = await tx.tag.findMany({
                    where: { userId },
                    select: { normalizedName: true },
                });
                const names = new Set(existing.map((tag) => tag.normalizedName));
                const suggestions = defaults
                    .filter((name) => !names.has(normalizeTag(name)))
                    .slice(0, Math.max(0, 100 - existing.length));
                await tx.tag.createMany({
                    data: suggestions.map((name) => ({ userId, name, normalizedName: normalizeTag(name) })),
                    skipDuplicates: true,
                });
            }
            await tx.financePreferences.upsert({
                where: { userId },
                create: { userId, tagsEnabled, tagsInitialized: tagsEnabled },
                update: { tagsEnabled, ...(tagsEnabled ? { tagsInitialized: true } : {}) },
            });
            return { tagsEnabled };
        });
    }

    list(userId: string) {
        return this.db.tag.findMany({
            where: { userId },
            select: { id: true, name: true, color: true },
            orderBy: { name: 'asc' },
        });
    }

    async save(userId: string, name: string, color: string, id?: string) {
        return atomic(this.db, async (tx) => {
            if (id && !(await tx.tag.findFirst({ where: { id, userId } })))
                throw new FinanceError(404, 'Tag não encontrada.');
            const normalizedName = normalizeTag(name);
            const duplicate = await tx.tag.findUnique({
                where: { userId_normalizedName: { userId, normalizedName } },
            });
            if (duplicate && duplicate.id !== id)
                throw new FinanceError(409, 'Você já tem uma tag com esse nome.');
            if (!id && (await tx.tag.count({ where: { userId } })) >= 100)
                throw new FinanceError(400, 'Limite de 100 tags atingido.');
            const data = { name: name.trim(), normalizedName, color };
            return id ? tx.tag.update({ where: { id }, data }) : tx.tag.create({ data: { ...data, userId } });
        });
    }

    async remove(userId: string, id: string) {
        // Cascades remove associations, never transactions or agreed sharing snapshots.
        const result = await this.db.tag.deleteMany({ where: { id, userId } });
        if (!result.count) throw new FinanceError(404, 'Tag não encontrada.');
    }
}
