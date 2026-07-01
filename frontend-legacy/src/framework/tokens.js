import { createSignal, createEffect } from './signals.js';

const tokenRegistry = new Map();

export function DesignToken(name, defaultValue) {
    const [get, set] = createSignal(defaultValue);
    const cssVar = `--${name}`;

    tokenRegistry.set(name, { get, set, cssVar });

    const token = {
        get value() { return get(); },
        set value(v) { set(v); },
        withDefault(v) { set(v); },
        getCssVar() { return cssVar; },
        subscribe(fn) { createEffect(() => fn(get())); }
    };

    return token;
}

export function applyTokens(root = document.documentElement) {
    for (const [, token] of tokenRegistry) {
        createEffect(() => {
            root.style.setProperty(token.getCssVar(), token.value);
        });
    }
}
