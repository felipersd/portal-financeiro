import { PrismaClient } from '@prisma/client';
import { Logger } from '../../Infrastructure/Logger';

export class DeleteUserFinancialData {
    constructor(private prisma: PrismaClient) {}

    async execute(userId: string): Promise<void> {
        try {
            Logger.info(`Starting GDPR data cascade deletion for user ${userId}`);
            
            // Ordem importa devido a foreign keys (se houver), ou apenas rodar tudo em batch sync
            await this.prisma.$transaction([
                this.prisma.transaction.deleteMany({ where: { userId } }),
                this.prisma.category.deleteMany({ where: { userId } }),
                this.prisma.groupMember.deleteMany({ where: { userId } }),
                this.prisma.budgetRule.deleteMany({ where: { userId } })
            ]);
            
            Logger.info(`Successfully wiped all financial data for user ${userId}`);
        } catch (error) {
            Logger.error(`Failed to wipe financial data for user ${userId}`, error);
            throw new Error('GDPR WIPE FAILED');
        }
    }
}
