import { Request, Response, NextFunction } from 'express';
import { PrismaClient } from '@prisma/client';
import { createHash } from 'crypto';
export function accountRateLimit(db: PrismaClient) {
    return async (req: Request, res: Response, next: NextFunction) => {
        const userId = (req as any).internalUserId;
        if (!userId) return res.status(401).json({ error: 'Não autenticado.' });
        const read = ['GET', 'HEAD'].includes(req.method);
        const scope = read ? 'read' : req.baseUrl === '/sharing' ? 'sharing' : 'write';
        const limit = read ? 180 : scope === 'sharing' ? 20 : 60;
        const key = createHash('sha256').update(`${scope}:${userId}`).digest('hex');
        try {
            const rows = await db.$queryRaw<{ count: number; retryAfter: number }[]>`
                INSERT INTO finance."RequestBudget" (key,count,"expiresAt") VALUES (${key},1,clock_timestamp()+interval '1 minute')
                ON CONFLICT (key) DO UPDATE SET count=CASE WHEN "RequestBudget"."expiresAt"<=clock_timestamp() THEN 1 ELSE LEAST("RequestBudget".count+1,1000000) END,
                "expiresAt"=CASE WHEN "RequestBudget"."expiresAt"<=clock_timestamp() THEN clock_timestamp()+interval '1 minute' ELSE "RequestBudget"."expiresAt" END
                RETURNING count, GREATEST(1,ceil(extract(epoch from "expiresAt"-clock_timestamp())))::int as "retryAfter"`;
            if (rows[0].count > limit) {
                res.set('Retry-After', String(rows[0].retryAfter));
                console.warn(JSON.stringify({ event: 'account_rate_limit', scope }));
                return res.status(429).json({ error: 'Muitas solicitações. Aguarde um minuto antes de tentar novamente.' });
            }
            next();
        } catch { res.status(503).json({ error: 'Não foi possível verificar o limite de solicitações.' }); }
    };
}
