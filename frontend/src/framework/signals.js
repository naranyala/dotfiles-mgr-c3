import { SignalError, logError } from '../core/errors.js';

let activeEffect = null;
let batchQueue = null;

export function createSignal(initialValue) {
    let value = initialValue;
    const subscribers = new Set();

    const get = () => {
        if (activeEffect) {
            subscribers.add(activeEffect);
        }
        return value;
    };

    get.peek = () => value;
    get.subscriberCount = () => subscribers.size;

    const set = (newValue) => {
        try {
            const next = typeof newValue === 'function' ? newValue(value) : newValue;
            if (Object.is(value, next)) return;
            value = next;
            if (batchQueue) {
                batchQueue.add(subscribers);
            } else {
                flush(subscribers);
            }
        } catch (err) {
            logError(new SignalError('Signal setter failed', { context: { error: err } }));
            throw err;
        }
    };

    return [get, set];
}

export function createComputed(fn) {
    const [get, set] = createSignal(undefined);
    createEffect(() => {
        try {
            set(fn());
        } catch (err) {
            logError(new SignalError('Computed evaluation failed', { context: { error: err } }));
            throw err;
        }
    });
    return get;
}

export function createEffect(fn) {
    const effect = new Effect(fn);
    if (activeEffect instanceof Effect) {
        activeEffect.trackChild(effect);
    }
    effect.run();
    return () => effect.dispose();
}

export function batch(fn) {
    if (batchQueue) {
        fn();
        return;
    }
    const queue = new Set();
    batchQueue = queue;
    try {
        fn();
    } catch (err) {
        logError(new SignalError('Batch function failed', { context: { error: err } }));
        throw err;
    } finally {
        batchQueue = null;
        const toFlush = new Set();
        for (const subs of queue) {
            for (const sub of subs) {
                toFlush.add(sub);
            }
        }
        for (const sub of toFlush) {
            if (sub instanceof Effect) {
                sub.run();
            } else {
                sub();
            }
        }
    }
}

export function untrack(fn) {
    const prev = activeEffect;
    activeEffect = null;
    try {
        return fn();
    } finally {
        activeEffect = prev;
    }
}

class Effect {
    #fn;
    #deps = new Set();
    #children = [];
    #disposed = false;
    #errorHandler;

    constructor(fn, errorHandler = null) {
        this.#fn = fn;
        this.#errorHandler = errorHandler;
    }

    run() {
        if (this.#disposed) return;
        this.#disposeChildren();
        const prev = activeEffect;
        activeEffect = this;
        try {
            this.#fn();
        } catch (err) {
            const error = new SignalError('Effect execution failed', {
                context: { error: err, effectFn: this.#fn.name || '<anonymous>' }
            });
            if (this.#errorHandler) {
                this.#errorHandler(error);
            } else {
                logError(error);
            }
        } finally {
            activeEffect = prev;
        }
    }

    trackChild(child) {
        this.#children.push(child);
    }

    addDep(subscribers) {
        this.#deps.add(subscribers);
    }

    dispose() {
        if (this.#disposed) return;
        this.#disposed = true;
        for (const sub of this.#deps) {
            sub.delete(this);
        }
        this.#disposeChildren();
    }

    #disposeChildren() {
        for (const child of this.#children) {
            child.dispose();
        }
        this.#children.length = 0;
    }
}

function flush(subscribers) {
    const subs = Array.from(subscribers);
    for (const sub of subs) {
        if (sub instanceof Effect) {
            sub.run();
        } else {
            try {
                sub();
            } catch (err) {
                logError(new SignalError('Subscriber callback failed', { context: { error: err } }));
            }
        }
    }
}
