import { Request, Response, NextFunction } from 'express';
import { Logger } from '../../Logger';
import { prisma } from '../../Database/prismaClient';

export const userResolutionMiddleware = async (req: Request, res: Response, next: NextFunction) => {
    const clerkId = (req as any).auth?.userId;
    
    if (!clerkId) {
        return res.status(401).json({ error: 'No Clerk token provided' });
    }

    try {
        // Find internal user id from DB directly since they share the same DB
        const result: any[] = await prisma.$queryRaw`SELECT "userId" as id FROM identity."UserIdentity" WHERE "provider" = 'clerk' AND "providerId" = ${clerkId} LIMIT 1`;
        
        if (result && result.length > 0) {
            (req as any).internalUserId = result[0].id;
            next();
        } else {
            return res.status(401).json({ error: 'User not found in identity database. Please login again to sync.' });
        }
    } catch (error) {
        Logger.error('Error resolving internal user ID', error);
        return res.status(500).json({ error: 'Internal Server Error resolving user' });
    }
};
