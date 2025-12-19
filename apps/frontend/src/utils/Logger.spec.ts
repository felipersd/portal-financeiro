import { Logger } from './Logger';
import { vi, describe, it, expect, beforeEach, afterEach, type MockInstance } from 'vitest';

describe('Logger', () => {
    let consoleSpy: { log: MockInstance; info: MockInstance; warn: MockInstance; error: MockInstance };

    beforeEach(() => {
        // Mock console methods
        consoleSpy = {
            log: vi.spyOn(console, 'log').mockImplementation(() => { }),
            info: vi.spyOn(console, 'info').mockImplementation(() => { }),
            warn: vi.spyOn(console, 'warn').mockImplementation(() => { }),
            error: vi.spyOn(console, 'error').mockImplementation(() => { })
        };
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    it('should log info messages', () => {
        Logger.info('Test message', { key: 'value' });
        expect(consoleSpy.log).toHaveBeenCalledWith(expect.stringContaining('"level":"INFO"'));
        expect(consoleSpy.log).toHaveBeenCalledWith(expect.stringContaining('"message":"Test message"'));
    });

    it('should mask PII in metadata', () => {
        Logger.info('PII Test', { email: 'test@example.com', password: 'secret' });
        const call = consoleSpy.log.mock.calls[0][0];
        const logEntry = JSON.parse(call);

        expect(logEntry.metadata.email).toBe('tes***@example.com');
        expect(logEntry.metadata.password).toBe('[REDACTED]');
    });

    it('should log errors with stack trace', () => {
        const error = new Error('Test Error');
        Logger.error('Something failed', error);

        expect(consoleSpy.error).toHaveBeenCalled();
        const call = consoleSpy.error.mock.calls[0][0];
        const logEntry = JSON.parse(call);

        expect(logEntry.level).toBe('ERROR');
        expect(logEntry.metadata.error.message).toBe('Test Error');
        expect(logEntry.metadata.error.stack).toBeDefined();
    });
});
