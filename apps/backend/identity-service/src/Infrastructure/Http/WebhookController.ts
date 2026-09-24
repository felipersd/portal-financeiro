import { Request, Response } from 'express';
import { Webhook } from 'svix';
import { Logger } from '../Logger';
import { DeleteUserAccount } from '../../Application/UseCases/DeleteUserAccount';

export class WebhookController {
    constructor(private deleteUserAccount: DeleteUserAccount) {}

    async handle(req: Request, res: Response) {
        const payload = req.body;
        const headers = req.headers;

        const svix_id = headers['svix-id'];
        const svix_timestamp = headers['svix-timestamp'];
        const svix_signature = headers['svix-signature'];

        // Se não tiver headers svix, ignoramos anonimamente
        if (!Buffer.isBuffer(payload) || typeof svix_id !== 'string' || typeof svix_timestamp !== 'string' || typeof svix_signature !== 'string') {
            return res.status(400).json({ error: 'Missing svix headers' });
        }

        const webhookSecret = process.env.CLERK_WEBHOOK_SECRET;
        if (!webhookSecret) {
            Logger.error('Missing CLERK_WEBHOOK_SECRET setting');
            return res.status(500).json({ error: 'Server misconfiguration' });
        }

        let evt: unknown;

        try {
            evt = new Webhook(webhookSecret).verify(payload, {
                'svix-id': svix_id,
                'svix-timestamp': svix_timestamp,
                'svix-signature': svix_signature,
            });
        } catch (err: any) {
            Logger.error('Webhook payload spoofing attempt blocked', err);
            return res.status(400).json({ error: 'Signature Verification failed' });
        }

        if (!evt || typeof evt !== 'object' || !('type' in evt) || typeof evt.type !== 'string') {
            return res.status(400).json({ error: 'Invalid webhook event' });
        }
        if (evt.type === 'user.deleted') {
            const data = 'data' in evt ? evt.data : undefined;
            if (!data || typeof data !== 'object' || !('id' in data) || typeof data.id !== 'string' || !/^user_[A-Za-z0-9]{1,250}$/.test(data.id)) {
                return res.status(400).json({ error: 'Invalid deleted user identity' });
            }
            try {
                await this.deleteUserAccount.execute('clerk', data.id);
            } catch (err) {
                Logger.error('Error handling user.deleted cascade', err);
                return res.status(500).json({ error: 'Internal sync error' });
            }
        }

        return res.status(200).json({ success: true });
    }
}
