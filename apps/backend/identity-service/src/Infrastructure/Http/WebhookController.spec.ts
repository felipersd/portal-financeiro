import express from 'express';
import request from 'supertest';
import { Webhook } from 'svix';
import { WebhookController } from './WebhookController';
import { DeleteUserAccount } from '../../Application/UseCases/DeleteUserAccount';

describe('Signed Clerk account deletion', () => {
    const secret = `whsec_${Buffer.from('disposable-webhook-test-secret-32').toString('base64')}`;
    const original = process.env.CLERK_WEBHOOK_SECRET;
    const execute = jest.fn();
    const app = express();
    const controller = new WebhookController({ execute } as unknown as DeleteUserAccount);
    app.post('/webhook', express.raw({ type: 'application/json' }), (req, res) => controller.handle(req, res));
    beforeEach(() => { process.env.CLERK_WEBHOOK_SECRET = secret; execute.mockReset().mockResolvedValue(undefined); jest.spyOn(console, 'error').mockImplementation(() => {}); });
    afterEach(() => { jest.restoreAllMocks(); if (original === undefined) delete process.env.CLERK_WEBHOOK_SECRET; else process.env.CLERK_WEBHOOK_SECRET = original; });
    function send(event: unknown, time = new Date(), tamper = false) {
        const payload = JSON.stringify(event);
        return request(app).post('/webhook').set('Content-Type', 'application/json')
            .set('svix-id', 'msg_disposable').set('svix-timestamp', String(Math.floor(time.getTime() / 1000)))
            .set('svix-signature', new Webhook(secret).sign('msg_disposable', time, tamper ? '{}' : payload)).send(payload);
    }
    it('validates a real signature before passing the exact identity to cleanup', async () => {
        expect((await send({ type: 'user.deleted', data: { id: 'user_test123' } })).status).toBe(200);
        expect(execute).toHaveBeenCalledWith('clerk', 'user_test123');
    });
    it('rejects tampering and expired signatures without touching data', async () => {
        const event = { type: 'user.deleted', data: { id: 'user_test123' } };
        expect((await send(event, new Date(), true)).status).toBe(400);
        expect((await send(event, new Date(Date.now() - 3600000))).status).toBe(400);
        expect(execute).not.toHaveBeenCalled();
    });
    it.each([{}, { id: null }, { id: '' }, { id: 'another-provider' }])('rejects signed deletion with invalid identity %j', async data => {
        expect((await send({ type: 'user.deleted', data })).status).toBe(400);
        expect(execute).not.toHaveBeenCalled();
    });
    it('acknowledges unrelated events and asks the provider to retry failed cleanup', async () => {
        expect((await send({ type: 'session.created' })).status).toBe(200);
        expect(execute).not.toHaveBeenCalled();
        execute.mockRejectedValueOnce(new Error('unavailable'));
        expect((await send({ type: 'user.deleted', data: { id: 'user_test123' } })).status).toBe(500);
    });
});
