import { Logger, LogLevel } from './Logger';

describe('Logger', () => {
    let consoleSpy: any;

    beforeEach(() => {
        consoleSpy = {
            log: jest.spyOn(console, 'log').mockImplementation(() => { }),
            info: jest.spyOn(console, 'info').mockImplementation(() => { }),
            warn: jest.spyOn(console, 'warn').mockImplementation(() => { }),
            error: jest.spyOn(console, 'error').mockImplementation(() => { }),
            debug: jest.spyOn(console, 'debug').mockImplementation(() => { })
        };
    });

    afterEach(() => {
        jest.restoreAllMocks();
    });

    it('should log info messages as JSON', () => {
        Logger.info('Test Info', { key: 'value' });
        expect(consoleSpy.log).toHaveBeenCalled();
        const call = consoleSpy.log.mock.calls[0][0];
        const parsed = JSON.parse(call);
        expect(parsed.level).toBe('INFO');
        expect(parsed.message).toBe('Test Info');
        expect(parsed.metadata).toEqual({ key: 'value' });
    });

    it('should log warnings', () => {
        Logger.warn('Test Warn', { key: 'val' });
        expect(consoleSpy.warn).toHaveBeenCalled();
        const call = consoleSpy.warn.mock.calls[0][0];
        const parsed = JSON.parse(call);
        expect(parsed.level).toBe('WARN');
    });

    it('should log errors with stack trace', () => {
        const err = new Error('Failure');
        Logger.error('Test Error', err);
        expect(consoleSpy.error).toHaveBeenCalled();
        const call = consoleSpy.error.mock.calls[0][0];
        const parsed = JSON.parse(call);
        expect(parsed.level).toBe('ERROR');
        expect(parsed.metadata.error.message).toBe('Failure');
        expect(parsed.metadata.error.stack).toBeDefined();
    });

    it('should log debug messages', () => {
        Logger.debug('Test Debug');
        expect(consoleSpy.debug).toHaveBeenCalled();
        const call = consoleSpy.debug.mock.calls[0][0];
        const parsed = JSON.parse(call);
        expect(parsed.level).toBe('DEBUG');
    });

    it('should mask PII', () => {
        Logger.info('PII', { email: 'secret@gmail.com', password: '123' });
        const call = consoleSpy.log.mock.calls[0][0];
        const parsed = JSON.parse(call);
        expect(parsed.metadata.email).toBe('sec***@gmail.com');
        expect(parsed.metadata.password).toBe('[REDACTED]');
    });
});
