const ErrorLevels = {
    DEBUG: 0,
    INFO: 1,
    WARN: 2,
    ERROR: 3,
    CRITICAL: 4
};

const errorLog = [];
const MAX_LOG_SIZE = 500;

export class AppError extends Error {
    code;
    source;
    level;
    timestamp;
    context;

    constructor(message, { code = 'UNKNOWN', source = 'unknown', level = ErrorLevels.ERROR, context = null } = {}) {
        super(message);
        this.name = 'AppError';
        this.code = code;
        this.source = source;
        this.level = level;
        this.timestamp = Date.now();
        this.context = context;
    }

    toJSON() {
        return {
            error: true,
            code: this.code,
            message: this.message,
            source: this.source,
            level: this.level,
            timestamp: this.timestamp,
            stack: this.stack
        };
    }
}

export class SignalError extends AppError {
    constructor(message, context) {
        super(message, { code: 'SIGNAL', source: 'signals', ...context });
        this.name = 'SignalError';
    }
}

export class ComponentError extends AppError {
    constructor(message, context) {
        super(message, { code: 'COMPONENT', source: 'component', ...context });
        this.name = 'ComponentError';
    }
}

export class RpcError extends AppError {
    constructor(message, context) {
        super(message, { code: 'RPC', source: 'rpc', ...context });
        this.name = 'RpcError';
    }
}

export class TemplateError extends AppError {
    constructor(message, context) {
        super(message, { code: 'TEMPLATE', source: 'template', ...context });
        this.name = 'TemplateError';
    }
}

export function logError(error) {
    const entry = error instanceof AppError ? error : new AppError(String(error), { source: 'unknown' });
    errorLog.push(entry);
    if (errorLog.length > MAX_LOG_SIZE) errorLog.shift();

    const prefix = `[${entry.source.toUpperCase()}]`;
    const msg = `${prefix} ${entry.message} (code=${entry.code})`;

    switch (entry.level) {
        case ErrorLevels.CRITICAL:
        case ErrorLevels.ERROR:
            console.error(msg, entry.context || '');
            break;
        case ErrorLevels.WARN:
            console.warn(msg, entry.context || '');
            break;
        default:
            console.log(msg, entry.context || '');
    }

    return entry;
}

export function getErrorLog() {
    return [...errorLog];
}

export function clearErrorLog() {
    errorLog.length = 0;
}

export function onError(fn) {
    const handler = (event) => {
        const error = event.error || event.reason || new Error(event.message || 'Unknown error');
        logError(error instanceof AppError ? error : new AppError(String(error), {
            source: 'window',
            context: { filename: event.filename, lineno: event.lineno }
        }));
    };
    window.addEventListener('error', handler);
    window.addEventListener('unhandledrejection', handler);
    return () => {
        window.removeEventListener('error', handler);
        window.removeEventListener('unhandledrejection', handler);
    };
}

export { ErrorLevels };
