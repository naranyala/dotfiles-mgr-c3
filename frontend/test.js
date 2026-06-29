import { createSignal, createComputed, createEffect, batch, untrack } from './src/framework/signals.js';
import { AppError, SignalError, logError, getErrorLog, clearErrorLog, ErrorLevels } from './src/core/errors.js';

let passed = 0;
let failed = 0;

function assert(condition, name) {
    if (condition) {
        passed++;
    } else {
        failed++;
        console.error(`FAIL: ${name}`);
    }
}

function assertEq(actual, expected, name) {
    if (actual === expected) {
        passed++;
    } else {
        failed++;
        console.error(`FAIL: ${name} — expected ${expected}, got ${actual}`);
    }
}

// ─── Error Classes ──────────────────────────────────────────────

console.log('=== Error Classes ===');

{
    const err = new AppError('test', { code: 'TEST', source: 'test' });
    assert(err instanceof Error, 'AppError is Error');
    assertEq(err.code, 'TEST', 'AppError code');
    assertEq(err.source, 'test', 'AppError source');
    assert(typeof err.timestamp === 'number', 'AppError has timestamp');
}

{
    const err = new SignalError('signal fail', { context: { x: 1 } });
    assert(err instanceof AppError, 'SignalError is AppError');
    assertEq(err.code, 'SIGNAL', 'SignalError code');
    assertEq(err.source, 'signals', 'SignalError source');
}

// ─── Error Logging ──────────────────────────────────────────────

console.log('=== Error Logging ===');

{
    clearErrorLog();
    const err = logError(new AppError('log test'));
    assertEq(getErrorLog().length, 1, 'error logged');
    assert(getErrorLog()[0].message === 'log test', 'correct message');
}

{
    clearErrorLog();
    logError(new AppError('err1'));
    logError(new AppError('err2'));
    logError(new AppError('err3'));
    assertEq(getErrorLog().length, 3, 'multiple errors logged');
}

{
    clearErrorLog();
    for (let i = 0; i < 600; i++) {
        logError(new AppError(`err${i}`));
    }
    assert(getErrorLog().length <= 500, 'error log capped at 500');
}

// ─── Signal Error Handling ──────────────────────────────────────

console.log('=== Signal Error Handling ===');

{
    clearErrorLog();
    const [get, set] = createSignal(0);
    let ran = false;

    createEffect(() => {
        get();
        ran = true;
    });

    assert(ran, 'effect runs initially');

    // Set with valid value
    set(5);
    assertEq(get(), 5, 'set works');

    // Functional setter
    set(v => v + 10);
    assertEq(get(), 15, 'functional set works');
}

{
    clearErrorLog();
    const [get, set] = createSignal(0);

    // Functional setter that throws
    try {
        set(() => { throw new Error(' setter error'); });
    } catch (e) {
        // expected
    }

    assert(getErrorLog().length > 0, 'setter error logged');
}

// ─── Batch Error Handling ───────────────────────────────────────

console.log('=== Batch Error Handling ===');

{
    clearErrorLog();
    const [get, set] = createSignal(0);
    let effectRan = false;

    createEffect(() => {
        get();
        effectRan = true;
    });

    try {
        batch(() => {
            set(1);
            throw new Error('batch error');
        });
    } catch (e) {
        // expected
    }

    assert(effectRan, 'effect still ran before error');
    assert(getErrorLog().length > 0, 'batch error logged');
}

// ─── Effect Cleanup ─────────────────────────────────────────────

console.log('=== Effect Cleanup ===');

{
    clearErrorLog();
    const [get, set] = createSignal(0);
    let runs = 0;

    const dispose = createEffect(() => {
        get();
        runs++;
    });

    set(1);
    assertEq(runs, 2, 'effect runs twice');

    dispose();
    set(2);
    assertEq(runs, 2, 'effect stopped after dispose');
}

// ─── Nested Effects ─────────────────────────────────────────────

console.log('=== Nested Effects ===');

{
    clearErrorLog();
    const [get, set] = createSignal(0);
    let outerRuns = 0;
    let innerRuns = 0;

    createEffect(() => {
        get();
        outerRuns++;
        createEffect(() => {
            get();
            innerRuns++;
        });
    });

    assertEq(outerRuns, 1, 'outer runs once');
    assertEq(innerRuns, 1, 'inner runs once');

    set(1);
    assertEq(outerRuns, 2, 'outer re-runs');
    // inner should be disposed and recreated
    assert(innerRuns >= 2, 'inner re-runs after dispose');
}

// ─── Computed Error Handling ────────────────────────────────────

console.log('=== Computed Error Handling ===');

{
    clearErrorLog();
    const [get, set] = createSignal(0);
    const computed = createComputed(() => {
        if (get() < 0) throw new Error('negative');
        return get() * 2;
    });

    assertEq(computed(), 0, 'computed initial');

    set(5);
    assertEq(computed(), 10, 'computed updates');

    try {
        set(-1);
    } catch (e) {
        // expected
    }

    assert(getErrorLog().length > 0, 'computed error logged');
}

// ─── Untrack ────────────────────────────────────────────────────

console.log('=== Untrack ===');

{
    clearErrorLog();
    const [get, set] = createSignal(0);
    let runs = 0;

    createEffect(() => {
        untrack(() => get());
        runs++;
    });

    assertEq(runs, 1, 'untracked effect runs once');

    set(1);
    assertEq(runs, 1, 'untracked effect not re-triggered');
}

// ─── Dynamic Dependencies ───────────────────────────────────────

console.log('=== Dynamic Dependencies ===');

{
    clearErrorLog();
    const [cond, setCond] = createSignal(true);
    const [a, setA] = createSignal(1);
    const [b, setB] = createSignal(100);
    let result = 0;

    createEffect(() => {
        result = cond() ? a() : b();
    });

    assertEq(result, 1, 'starts with a');

    setA(2);
    assertEq(result, 2, 'a updates');

    setB(200);
    assertEq(result, 2, 'b not tracked yet');

    setCond(false);
    assertEq(result, 200, 'switches to b');

    setA(999);
    assertEq(result, 200, 'a ignored after switch');
}

// ─── Error Log Serialization ────────────────────────────────────

console.log('=== Error Serialization ===');

{
    const err = new AppError('serialize test', {
        code: 'SER',
        source: 'test',
        context: { key: 'value' }
    });
    const json = err.toJSON();
    assert(json.error === true, 'serialized has error flag');
    assertEq(json.code, 'SER', 'serialized code');
    assertEq(json.message, 'serialize test', 'serialized message');
    assert(typeof json.timestamp === 'number', 'serialized timestamp');
}

// ─── Summary ────────────────────────────────────────────────────

console.log(`\n${passed + failed} tests: ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
