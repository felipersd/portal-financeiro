import { readFileSync } from 'fs';
import { isActiveWorker } from './activeWorker';
jest.mock('fs', () => ({ readFileSync: jest.fn() }));
const read = jest.mocked(readFileSync);
describe('Scheduled work during blue/green deployment', () => {
    const originalSlot = process.env.DEPLOYMENT_SLOT;
    const originalFile = process.env.ACTIVE_SLOT_FILE;
    afterEach(() => {
        if (originalSlot === undefined) delete process.env.DEPLOYMENT_SLOT;
        else process.env.DEPLOYMENT_SLOT = originalSlot;
        if (originalFile === undefined) delete process.env.ACTIVE_SLOT_FILE;
        else process.env.ACTIVE_SLOT_FILE = originalFile;
        read.mockReset();
    });
    it('keeps standalone/local workers enabled', () => {
        delete process.env.DEPLOYMENT_SLOT;
        expect(isActiveWorker()).toBe(true);
        expect(read).not.toHaveBeenCalled();
    });
    it('pauses a candidate, enables it on promotion and pauses it again on rollback', () => {
        process.env.DEPLOYMENT_SLOT = 'green';
        process.env.ACTIVE_SLOT_FILE = '/run/deployment/active-slot';
        read.mockReturnValueOnce('blue\n').mockReturnValueOnce('green\n').mockReturnValueOnce('blue\n');
        expect(isActiveWorker()).toBe(false);
        expect(isActiveWorker()).toBe(true);
        expect(isActiveWorker()).toBe(false);
    });
    it('fails closed if the marker is missing or invalid', () => {
        process.env.DEPLOYMENT_SLOT = 'green';
        delete process.env.ACTIVE_SLOT_FILE;
        expect(isActiveWorker()).toBe(false);
        process.env.ACTIVE_SLOT_FILE = '/run/deployment/active-slot';
        read.mockImplementation(() => {
            throw new Error('unavailable');
        });
        expect(isActiveWorker()).toBe(false);
        process.env.DEPLOYMENT_SLOT = 'invalid';
        expect(isActiveWorker()).toBe(false);
    });
});
