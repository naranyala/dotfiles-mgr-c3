let activeEffect = null;

export function createSignal(initialValue) {
    let value = initialValue;
    const subscribers = new Set();

    const get = () => {
        if (activeEffect) {
            subscribers.add(activeEffect);
        }
        return value;
    };

    const set = (newValue) => {
        if (value !== newValue) {
            value = newValue;
            // Create a copy of subscribers to avoid infinite loops if subscribers modify themselves
            const subs = Array.from(subscribers);
            subs.forEach(sub => sub());
        }
    };

    return [get, set];
}

export function createEffect(fn) {
    // When the effect is created or re-run, it becomes the active effect
    const effect = () => {
        activeEffect = effect;
        fn();
        activeEffect = null;
    };
    effect();
}
