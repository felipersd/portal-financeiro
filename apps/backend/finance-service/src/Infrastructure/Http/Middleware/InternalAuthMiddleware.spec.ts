import express from 'express';
import request from 'supertest';
import { internalAuth } from './InternalAuthMiddleware';

describe('Internal API authentication', () => {
    const original = process.env.INTERNAL_API_TOKEN;
    afterEach(() => {
        if (original === undefined) delete process.env.INTERNAL_API_TOKEN;
        else process.env.INTERNAL_API_TOKEN = original;
    });
    function app() {
        const server = express();
        server.post('/internal/test', internalAuth, (_req, res) => { res.sendStatus(204); });
        return server;
    }
    it('fails closed when no server token is configured', async () => {
        delete process.env.INTERNAL_API_TOKEN;
        await request(app()).post('/internal/test').expect(401);
    });
    it('rejects missing and incorrect tokens', async () => {
        process.env.INTERNAL_API_TOKEN = 'correct-secret';
        await request(app()).post('/internal/test').expect(401);
        await request(app()).post('/internal/test').set('X-Internal-Token', 'wrong-secret').expect(401);
    });
    it('allows the service token', async () => {
        process.env.INTERNAL_API_TOKEN = 'correct-secret';
        await request(app()).post('/internal/test').set('X-Internal-Token', 'correct-secret').expect(204);
    });
});
