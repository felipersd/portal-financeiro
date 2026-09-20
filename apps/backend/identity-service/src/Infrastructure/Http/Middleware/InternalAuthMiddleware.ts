import { Request, Response, NextFunction } from 'express';
import { timingSafeEqual } from 'crypto';

export function internalAuth(req: Request, res: Response, next: NextFunction) {
    const expected = process.env.INTERNAL_API_TOKEN;
    const actual = req.get('X-Internal-Token');
    if (!expected || !actual || Buffer.byteLength(expected) !== Buffer.byteLength(actual) ||
        !timingSafeEqual(Buffer.from(expected), Buffer.from(actual))) {
        return res.status(401).json({ error: 'Unauthorized' });
    }
    next();
}
