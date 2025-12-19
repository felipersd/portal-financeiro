export const LogLevel = {
    INFO: 'INFO',
    WARN: 'WARN',
    ERROR: 'ERROR',
    DEBUG: 'DEBUG'
} as const;

export type LogLevel = typeof LogLevel[keyof typeof LogLevel];

export class Logger {
    private static serviceName = 'frontend';

    private static getTimestamp(): string {
        return new Date().toISOString();
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    private static maskPII(data: any): any {
        if (!data) return data;
        if (typeof data === 'string') {
            // Mask email
            if (data.includes('@') && data.includes('.')) {
                return data.replace(/([a-zA-Z0-9._-]+)(@[a-zA-Z0-9._-]+\.[a-zA-Z0-9._-]+)/gi, (_, p1, p2) => {
                    if (p1.length <= 2) return p1 + p2;
                    return p1.substring(0, 3) + '***' + p2;
                });
            }
            return data;
        }

        if (typeof data === 'object') {
            const masked = Array.isArray(data) ? [...data] : { ...data };
            for (const key in masked) {
                if (Object.prototype.hasOwnProperty.call(masked, key)) {
                    if (['password', 'token', 'secret', 'authorization'].includes(key.toLowerCase())) {
                        masked[key] = '[REDACTED]';
                    } else if (['email'].includes(key.toLowerCase()) && typeof masked[key] === 'string') {
                        const email = masked[key];
                        const parts = email.split('@');
                        if (parts.length === 2) {
                            masked[key] = `${parts[0].substring(0, 3)}***@${parts[1]}`;
                        }
                    } else if (typeof masked[key] === 'object') {
                        masked[key] = this.maskPII(masked[key]);
                    }
                }
            }
            return masked;
        }
        return data;
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    private static log(level: LogLevel, message: string, metadata?: Record<string, any>) {
        const logEntry = {
            timestamp: this.getTimestamp(),
            level,
            service: this.serviceName,
            message,
            metadata: this.maskPII(metadata)
        };

        // In production, you might want to send this to a backend endpoint
        // For now, we print to console
        if (level === LogLevel.ERROR) {
            console.error(JSON.stringify(logEntry));
        } else if (level === LogLevel.WARN) {
            console.warn(JSON.stringify(logEntry));
        } else {
            // Use info/log for other levels
            console.log(JSON.stringify(logEntry));
        }
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    static info(message: string, metadata?: Record<string, any>) {
        this.log(LogLevel.INFO, message, metadata);
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    static warn(message: string, metadata?: Record<string, any>) {
        this.log(LogLevel.WARN, message, metadata);
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    static error(message: string, error?: any, metadata?: Record<string, any>) {
        this.log(LogLevel.ERROR, message, {
            ...metadata,
            error: error instanceof Error ? { message: error.message, stack: error.stack } : error
        });
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    static debug(message: string, metadata?: Record<string, any>) {
        // Only log debug in development (assuming vite exposes this)
        if (import.meta.env.DEV) {
            this.log(LogLevel.DEBUG, message, metadata);
        }
    }
}
