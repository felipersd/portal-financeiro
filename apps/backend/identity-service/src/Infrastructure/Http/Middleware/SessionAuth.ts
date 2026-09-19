import { clerkMiddleware, getAuth } from '@clerk/express';
import { Request, Response, NextFunction } from 'express';

export const sessionAuth = [
    (req: Request, res: Response, next: NextFunction) => {
        if (!req.get('Authorization')?.startsWith('Bearer ')) return res.status(401).json({ error: 'Unauthenticated' });
        next();
    },
    clerkMiddleware({
        authorizedParties: (process.env.ALLOWED_ORIGIN || 'http://localhost:8080').split(','),
        clockSkewInMs: 60000,
    }),
    (req: Request, res: Response, next: NextFunction) => {
        const { userId } = getAuth(req);
        if (!userId) return res.status(401).json({ error: 'Unauthenticated' });
        (req as any).clerkUserId = userId;
        next();
    },
];
