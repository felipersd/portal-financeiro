import { ShareLedger } from '../../Application/UseCases/ShareLedger';
import { money } from './validation';
import { Router, Request, Response, NextFunction } from 'express';
import { clerkClient } from '@clerk/express';
import { z } from 'zod';
import { SharingActor, SharingService } from '../../Application/UseCases/SharingService';
import { FinanceError } from '../../Domain/FinanceError';

export function sharingRouter(service: SharingService, ledger?: ShareLedger) {
    const router = Router();
    router.use(async (req: Request, res: Response, next: NextFunction) => {
        try {
            // Recheck the current verified email at the provider. Never trust a submitted or stale profile email.
            const user = await clerkClient.users.getUser((req as any).clerkUserId);
            const email = user.emailAddresses.find(e => e.id === user.primaryEmailAddressId && e.verification?.status === 'verified');
            if (!email) return res.status(403).json({ error: 'Verifique seu e-mail principal para compartilhar contas.' });
            res.locals.actor = { id: (req as any).internalUserId, email: email.emailAddress.trim().toLowerCase(),
                name: `${user.firstName || ''} ${user.lastName || ''}`.trim().slice(0, 160) || 'Membro' } satisfies SharingActor;
            next();
        } catch { next(new FinanceError(503, 'Não foi possível verificar sua identidade. Tente novamente.')); }
    });
    const body = z.object({ memberId: z.string().uuid() });
    const endpoint = (work: (req: Request, actor: SharingActor) => Promise<unknown>) =>
        async (req: Request, res: Response, next: NextFunction) => {
            try { const result = await work(req, res.locals.actor); res.json(result ?? { success: true }); }
            catch (error) { next(error); }
        };
    router.get('/', endpoint((req, actor) => service.list(actor)));
    router.post('/connections', endpoint((req, actor) => service.invite(actor, body.parse(req.body).memberId)));
    router.post('/connections/:id/:action', endpoint((req, actor) => service.decideConnection(actor,
        z.string().uuid().parse(req.params.id), z.enum(['accept', 'decline', 'revoke']).parse(req.params.action))));
    router.post('/transactions/:id', endpoint((req, actor) => service.share(actor,
        z.string().uuid().parse(req.params.id), body.parse(req.body).memberId)));
    router.post('/expenses/:id/proposals', endpoint((req, actor) => {
        const parsed = z.object({ kind: z.enum(['adjustment','payment','refund']), amount: money }).parse(req.body);
        if (!ledger) throw new FinanceError(503, 'Acertos indisponíveis.');
        return ledger.propose(actor, z.string().uuid().parse(req.params.id), parsed.kind, Math.round(parsed.amount * 100));
    }));
    router.post('/proposals/:id/:action', endpoint((req, actor) => {
        if (!ledger) throw new FinanceError(503, 'Acertos indisponíveis.');
        return ledger.decide(actor, z.string().uuid().parse(req.params.id), z.enum(['accept','decline','cancel']).parse(req.params.action));
    }));
    router.get('/expenses/:id/history', endpoint((req, actor) => {
        if (!ledger) throw new FinanceError(503, 'Acertos indisponíveis.');
        return ledger.history(actor, z.string().uuid().parse(req.params.id), z.string().uuid().optional().parse(req.query.cursor));
    }));
    router.post('/expenses/:id/:action', endpoint((req, actor) => service.decideShare(actor,
        z.string().uuid().parse(req.params.id), z.enum(['accept', 'decline', 'cancel']).parse(req.params.action))));
    return router;
}
