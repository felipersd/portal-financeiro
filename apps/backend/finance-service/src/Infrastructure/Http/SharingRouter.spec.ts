import express from 'express';
import request from 'supertest';
import { sharingRouter } from './SharingRouter';
import { clerkClient } from '@clerk/express';
import { SharingService } from '../../Application/UseCases/SharingService';
import { randomUUID } from 'crypto';

jest.mock('@clerk/express', () => ({ clerkClient: { users: { getUser: jest.fn() } } }));
describe('Sharing identity boundary', () => {
    const getUser = clerkClient.users.getUser as jest.Mock;
    beforeEach(() => getUser.mockReset());
    function app(service: SharingService) {
        const app = express();
        app.use(express.json());
        app.use((req, res, next) => { (req as any).internalUserId = 'actual-user'; (req as any).clerkUserId = 'actual-clerk'; next(); });
        app.use('/sharing', sharingRouter(service));
        return app;
    }
    it('never accepts a forged email or actor id from the request', async () => {
        getUser.mockResolvedValue({ primaryEmailAddressId: 'primary', firstName: 'Ana', lastName: '',
            emailAddresses: [{ id: 'primary', emailAddress: 'ANA@example.test', verification: { status: 'verified' } }] });
        const invite = jest.fn().mockResolvedValue({ status: 'pending' });
        const memberId = randomUUID();
        const result = await request(app({ invite } as unknown as SharingService)).post('/sharing/connections')
            .send({ memberId, userId: 'victim', email: 'victim@example.test' });
        expect(result.status).toBe(200);
        expect(invite).toHaveBeenCalledWith({ id: 'actual-user', email: 'ana@example.test', name: 'Ana' }, memberId);
    });
    it('requires current verified primary email, not an old profile or another address', async () => {
        getUser.mockResolvedValue({ primaryEmailAddressId: 'primary', emailAddresses: [
            { id: 'primary', emailAddress: 'unverified@example.test', verification: { status: 'unverified' } },
            { id: 'secondary', emailAddress: 'verified@example.test', verification: { status: 'verified' } },
        ] });
        const list = jest.fn();
        expect((await request(app({ list } as unknown as SharingService)).get('/sharing')).status).toBe(403);
        expect(list).not.toHaveBeenCalled();
    });
});
