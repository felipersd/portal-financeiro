export enum LogLevel {
    INFO = 'INFO',
    WARN = 'WARN',
    ERROR = 'ERROR',
    DEBUG = 'DEBUG'
}

export class Logger {
    private static serviceName = 'identity-service';

    private static getTimestamp(): string {
        return new Date().toISOString();
    }

    private static maskPII(data: any): any {
        if (!data) return data;
        if (typeof data === 'string') {
            // Mask email
            if (data.includes('@') && data.includes('.')) {
                return data.replace(/([a-zA-Z0-9._-]+)(@[a-zA-Z0-9._-]+\.[a-zA-Z0-9._-]+)/gi, (match, p1, p2) => {
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

    private static log(level: LogLevel, message: string, metadata?: Record<string, any>) {
        const logEntry = {
            timestamp: this.getTimestamp(),
            level,
            service: this.serviceName,
            message,
            metadata: this.maskPII(metadata)
        };

        if (level === LogLevel.ERROR) {
            console.error(JSON.stringify(logEntry));
        } else if (level === LogLevel.WARN) {
            console.warn(JSON.stringify(logEntry));
        } else if (level === LogLevel.DEBUG) {
            console.debug(JSON.stringify(logEntry));
        } else {
            console.info(JSON.stringify(logEntry));
        }
    }

    static info(message: string, metadata?: Record<string, any>) {
        this.log(LogLevel.INFO, message, metadata);
    }

    static warn(message: string, metadata?: Record<string, any>) {
        this.log(LogLevel.WARN, message, metadata);
    }

    static error(message: string, error?: any, metadata?: Record<string, any>) {
        this.log(LogLevel.ERROR, message, {
            ...metadata,
            error: error instanceof Error ? { message: error.message, stack: error.stack } : error
        });
    }

    static debug(message: string, metadata?: Record<string, any>) {
        // Could check NODE_ENV here if needed
        this.log(LogLevel.DEBUG, message, metadata);
    }
}
