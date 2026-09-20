import { Request, Response, NextFunction } from 'express';
export const userResolutionMiddleware = async (req: Request, res: Response, next: NextFunction) => {
    const clerkId = (req as any).clerkUserId;
    if (!clerkId) return res.status(401).json({ error: 'Não autenticado.' });
    try {
        const token = process.env.INTERNAL_API_TOKEN;
        if (!token) throw new Error('Internal identity configuration missing');
        const response = await fetch(`${process.env.IDENTITY_SERVICE_URL || 'http://identity-service:3001'}/internal/identities/resolve`, {
            method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Internal-Token': token },
            body: JSON.stringify({ clerkId }), signal: AbortSignal.timeout(5000), redirect: 'error',
        });
        if (response.status === 404) return res.status(401).json({ error: 'Entre novamente para sincronizar seu acesso.' });
        if (!response.ok) throw new Error('Identity unavailable');
        const body = await response.json() as { id?: unknown };
        if (typeof body.id !== 'string' || !body.id) throw new Error('Invalid identity response');
        (req as any).internalUserId = body.id;
        next();
    } catch { return res.status(503).json({ error: 'Não foi possível verificar seu acesso. Tente novamente.' }); }
};
