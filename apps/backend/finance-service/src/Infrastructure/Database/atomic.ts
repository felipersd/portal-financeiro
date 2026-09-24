import { Prisma, PrismaClient } from '@prisma/client';

function retryableConflict(error: unknown): boolean {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2034') return true;
    // Prisma's pg adapter can surface a commit-time serialization failure directly.
    // Retry only PostgreSQL's definite rollback codes; never an ambiguous connection failure.
    if (!(error instanceof Error) || error.name !== 'DriverAdapterError' || !('cause' in error)) return false;
    const cause = error.cause;
    return !!cause && typeof cause === 'object' && 'originalCode' in cause &&
        (cause.originalCode === '40001' || cause.originalCode === '40P01');
}

// Retry serialization conflicts: concurrent acceptance, revocation and edits must agree.
export async function atomic<T>(db: PrismaClient, work: (tx: Prisma.TransactionClient) => Promise<T>): Promise<T> {
    for (let attempt = 0; ; attempt++) {
        try {
            return await db.$transaction(work, { isolationLevel: 'Serializable', timeout: 15000 });
        } catch (error) {
            if (!retryableConflict(error) || attempt >= 3) throw error;
            await new Promise(resolve => setTimeout(resolve, 10 * 2 ** attempt + Math.floor(Math.random() * 10)));
        }
    }
}
