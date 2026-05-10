type LogLevel = 'info' | 'warn' | 'error' | 'debug';

function log(level: LogLevel, tag: string, message: string, ...args: unknown[]) {
    const timestamp = new Date().toISOString();
    const prefix = `[${timestamp}] [${level.toUpperCase()}] [${tag}]`;
    console[level === 'info' ? 'log' : level](`${prefix} ${message}`, ...args);
}

export const logger = {
    info: (tag: string, message: string, ...args: unknown[]) => log('info', tag, message, ...args),
    warn: (tag: string, message: string, ...args: unknown[]) => log('warn', tag, message, ...args),
    error: (tag: string, message: string, ...args: unknown[]) => log('error', tag, message, ...args),
    debug: (tag: string, message: string, ...args: unknown[]) => log('debug', tag, message, ...args),
};
