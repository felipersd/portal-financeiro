import { Request, Response } from 'express';
import { Webhook } from 'svix';
import { Logger } from '../Logger';
import { DeleteUserAccount } from '../../Application/UseCases/DeleteUserAccount';

export class WebhookController {
    constructor(private deleteUserAccount: DeleteUserAccount) {}

    async handle(req: Request, res: Response) {
        const payload = (req as any).rawBody || req.body;
        const headers = req.headers;

        const svix_id = headers['svix-id'] as string;
        const svix_timestamp = headers['svix-timestamp'] as string;
        const svix_signature = headers['svix-signature'] as string;

        // Se não tiver headers svix, ignoramos anonimamente
        if (!svix_id || !svix_timestamp || !svix_signature) {
            return res.status(400).json({ error: 'Missing svix headers' });
        }

        const webhookSecret = process.env.CLERK_WEBHOOK_SECRET;
        if (!webhookSecret) {
            Logger.error('Missing CLERK_WEBHOOK_SECRET setting');
            return res.status(500).json({ error: 'Server misconfiguration' });
        }

        const wh = new Webhook(webhookSecret);
        let evt: any;

        try {
            evt = wh.verify(payload, {
                'svix-id': svix_id,
                'svix-timestamp': svix_timestamp,
                'svix-signature': svix_signature,
            });
        } catch (err: any) {
            Logger.error('Webhook payload spoofing attempt blocked', err);
            return res.status(400).json({ error: 'Signature Verification failed' });
        }

        const { id } = evt.data;
        const eventType = evt.type;

        if (eventType === 'user.deleted') {
            try {
                await this.deleteUserAccount.execute('clerk', id);
            } catch (err) {
                Logger.error('Error handling user.deleted cascade', err);
                return res.status(500).json({ error: 'Internal sync error' });
            }
        } else if (eventType === 'user.created') {
            // Em implementações avançadas, poderiamos pre-criar o usuario aqui 
            // e ignorar o processo em GetOrCreateUser (migração top-down)
            console.log('[Webhook] New user registered:', id);
        }

        return res.status(200).json({ success: true });
    }
}
