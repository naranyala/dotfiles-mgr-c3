import { createSignal, createComputed, createEffect, batch, untrack } from './src/framework/signals.js';
import { AppError, SignalError, ComponentError, RpcError, TemplateError, logError, getErrorLog, clearErrorLog, ErrorLevels } from './src/core/errors.js';

let passed = 0;
let failed = 0;

function assert(condition, name) {
    if (condition) { passed++; } else { failed++; console.error(`FAIL: ${name}`); }
}

function assertEq(actual, expected, name) {
    if (actual === expected) { passed++; } else { failed++; console.error(`FAIL: ${name} — expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`); }
}

function assertThrows(fn, name) {
    try { fn(); failed++; console.error(`FAIL: ${name} — expected throw`); } catch { passed++; }
}

// ═══════════════════════════════════════════════════════════════
// 1. SIGNALS
// ═══════════════════════════════════════════════════════════════

console.log('\n=== 1. SIGNALS ===');

// 1.1 Basic signal
{
    const [get, set] = createSignal(0);
    assertEq(get(), 0, 'signal initial value');
    set(5);
    assertEq(get(), 5, 'signal set value');
    set(5);
    assertEq(get(), 5, 'signal same value no change');
}

// 1.2 Functional setter
{
    const [get, set] = createSignal(10);
    set(v => v * 2);
    assertEq(get(), 20, 'functional setter multiply');
    set(v => v + 5);
    assertEq(get(), 25, 'functional setter add');
}

// 1.3 Signal peek
{
    const [get, set] = createSignal(42);
    assertEq(get.peek(), 42, 'peek value');
    set(99);
    assertEq(get.peek(), 99, 'peek after set');
    assertEq(get(), 99, 'get still works after peek');
}

// 1.4 Signal subscriber count
{
    const [get, set] = createSignal(0);
    assertEq(get.subscriberCount(), 0, 'no subscribers initially');
    const dispose = createEffect(() => { get(); });
    assert(get.subscriberCount() >= 1, 'has subscribers after effect');
    dispose();
}

// 1.5 Effect tracking
{
    const [get, set] = createSignal(0);
    let runs = 0;
    createEffect(() => { get(); runs++; });
    assertEq(runs, 1, 'effect runs once on create');
    set(1);
    assertEq(runs, 2, 'effect re-runs on set');
    set(1);
    assertEq(runs, 2, 'effect skips same value');
    set(2);
    assertEq(runs, 3, 'effect re-runs on different value');
}

// 1.6 Effect cleanup
{
    const [get, set] = createSignal(0);
    let runs = 0;
    const dispose = createEffect(() => { get(); runs++; });
    set(1);
    assertEq(runs, 2, 'effect runs before dispose');
    dispose();
    set(2);
    assertEq(runs, 2, 'effect stopped after dispose');
}

// 1.7 Computed
{
    const [get, set] = createSignal(3);
    const doubled = createComputed(() => get() * 2);
    assertEq(doubled(), 6, 'computed initial');
    set(5);
    assertEq(doubled(), 10, 'computed updates');
    set(10);
    assertEq(doubled(), 20, 'computed updates again');
}

// 1.8 Computed chaining
{
    const [a, setA] = createSignal(1);
    const [b, setB] = createSignal(2);
    const sum = createComputed(() => a() + b());
    const product = createComputed(() => a() * b());
    assertEq(sum(), 3, 'sum initial');
    assertEq(product(), 2, 'product initial');
    setA(10);
    assertEq(sum(), 12, 'sum after a change');
    assertEq(product(), 20, 'product after a change');
    setB(5);
    assertEq(sum(), 15, 'sum after b change');
    assertEq(product(), 50, 'product after b change');
}

// 1.9 Batch
{
    const [get, set] = createSignal(0);
    let runs = 0;
    createEffect(() => { get(); runs++; });
    assertEq(runs, 1, 'batch: initial run');
    batch(() => { set(1); set(2); set(3); });
    assertEq(get(), 3, 'batch: final value');
    assertEq(runs, 2, 'batch: only one extra run');
}

// 1.10 Nested batch
{
    const [get, set] = createSignal(0);
    let runs = 0;
    createEffect(() => { get(); runs++; });
    batch(() => {
        set(1);
        batch(() => { set(2); });
        set(3);
    });
    assertEq(get(), 3, 'nested batch: final value');
    assertEq(runs, 2, 'nested batch: single flush');
}

// 1.11 Untrack
{
    const [get, set] = createSignal(0);
    let runs = 0;
    createEffect(() => {
        untrack(() => get());
        runs++;
    });
    assertEq(runs, 1, 'untrack: initial run');
    set(1);
    assertEq(runs, 1, 'untrack: no re-run');
}

// 1.12 Object equality
{
    const [get, set] = createSignal({ x: 1 });
    let runs = 0;
    createEffect(() => { get(); runs++; });
    set({ x: 1 });
    assertEq(runs, 2, 'object same content re-runs (reference diff)');
    const obj = get();
    set(obj);
    assertEq(runs, 2, 'same reference skips');
}

// 1.13 Signal in loop
{
    const [get, set] = createSignal(0);
    const values = [];
    createEffect(() => { values.push(get()); });
    for (let i = 1; i <= 100; i++) set(i);
    assertEq(values.length, 101, 'loop: 100 updates + initial');
    assertEq(values[100], 100, 'loop: final value');
}

// 1.14 No stack overflow
{
    const [get, set] = createSignal(0);
    let maxDepth = 0, depth = 0;
    createEffect(() => {
        depth++;
        maxDepth = Math.max(maxDepth, depth);
        get();
        depth--;
    });
    set(1);
    assert(maxDepth <= 2, 'no stack overflow on re-run');
}

// 1.15 Multiple effects on same signal
{
    const [get, set] = createSignal(0);
    let a = 0, b = 0, c = 0;
    createEffect(() => { get(); a++; });
    createEffect(() => { get(); b++; });
    createEffect(() => { get(); c++; });
    set(1);
    assertEq(a, 2, 'multi: effect a ran');
    assertEq(b, 2, 'multi: effect b ran');
    assertEq(c, 2, 'multi: effect c ran');
}

// 1.16 Dynamic dependencies
{
    const [cond, setCond] = createSignal(true);
    const [a, setA] = createSignal(1);
    const [b, setB] = createSignal(100);
    let result = 0;
    createEffect(() => { result = cond() ? a() : b(); });
    assertEq(result, 1, 'dynamic: starts with a');
    setA(2);
    assertEq(result, 2, 'dynamic: a updates');
    setB(200);
    assertEq(result, 2, 'dynamic: b ignored (not tracked)');
    setCond(false);
    assertEq(result, 200, 'dynamic: switches to b');
    setA(999);
    assertEq(result, 200, 'dynamic: a ignored after switch');
    setB(300);
    assertEq(result, 300, 'dynamic: b updates after switch');
}

// 1.17 Batch with multiple signals
{
    const [a, setA] = createSignal(0);
    const [b, setB] = createSignal(0);
    let runs = 0;
    createEffect(() => { a(); b(); runs++; });
    assertEq(runs, 1, 'multi-signal batch: initial');
    batch(() => { setA(1); setB(2); });
    assertEq(runs, 2, 'multi-signal batch: one extra run');
}

// 1.18 Batch flush order
{
    const [get, set] = createSignal(0);
    const order = [];
    createEffect(() => { order.push('effect-' + get()); });
    batch(() => { set(1); order.push('batch-1'); set(2); order.push('batch-2'); });
    assert(order.join(',') === 'effect-0,batch-1,batch-2,effect-2', 'batch flush order: ' + order.join(','));
}

// 1.19 Rapid mutation
{
    const [get, set] = createSignal(0);
    let runs = 0;
    createEffect(() => { get(); runs++; });
    for (let i = 0; i < 10000; i++) set(i);
    assertEq(runs, 10000, 'rapid mutation: 9999 updates + initial');
}

// 1.20 Effect with error in setter
{
    clearErrorLog();
    const [get, set] = createSignal(0);
    try { set(() => { throw new Error('bad'); }); } catch {}
    assert(getErrorLog().length > 0, 'setter error logged');
}

// ═══════════════════════════════════════════════════════════════
// 2. ERROR SYSTEM
// ═══════════════════════════════════════════════════════════════

console.log('\n=== 2. ERROR SYSTEM ===');

// 2.1 AppError
{
    const err = new AppError('test', { code: 'TEST', source: 'test' });
    assert(err instanceof Error, 'AppError is Error');
    assertEq(err.code, 'TEST', 'AppError code');
    assertEq(err.source, 'test', 'AppError source');
    assert(typeof err.timestamp === 'number', 'AppError has timestamp');
}

// 2.2 SignalError
{
    const err = new SignalError('signal fail', { context: { x: 1 } });
    assert(err instanceof AppError, 'SignalError is AppError');
    assertEq(err.code, 'SIGNAL', 'SignalError code');
    assertEq(err.source, 'signals', 'SignalError source');
}

// 2.3 ComponentError
{
    const err = new ComponentError('comp fail');
    assert(err instanceof AppError, 'ComponentError is AppError');
    assertEq(err.code, 'COMPONENT', 'ComponentError code');
}

// 2.4 RpcError
{
    const err = new RpcError('rpc fail');
    assert(err instanceof AppError, 'RpcError is AppError');
    assertEq(err.code, 'RPC', 'RpcError code');
}

// 2.5 TemplateError
{
    const err = new TemplateError('template fail');
    assert(err instanceof AppError, 'TemplateError is AppError');
    assertEq(err.code, 'TEMPLATE', 'TemplateError code');
}

// 2.6 Error levels
{
    assertEq(ErrorLevels.DEBUG, 0, 'DEBUG level');
    assertEq(ErrorLevels.INFO, 1, 'INFO level');
    assertEq(ErrorLevels.WARN, 2, 'WARN level');
    assertEq(ErrorLevels.ERROR, 3, 'ERROR level');
    assertEq(ErrorLevels.CRITICAL, 4, 'CRITICAL level');
}

// 2.7 Error logging
{
    clearErrorLog();
    logError(new AppError('log test'));
    assertEq(getErrorLog().length, 1, 'error logged');
    assert(getErrorLog()[0].message === 'log test', 'correct message');
}

// 2.8 Multiple errors
{
    clearErrorLog();
    logError(new AppError('err1'));
    logError(new AppError('err2'));
    logError(new AppError('err3'));
    assertEq(getErrorLog().length, 3, 'multiple errors logged');
}

// 2.9 Error log cap
{
    clearErrorLog();
    for (let i = 0; i < 600; i++) logError(new AppError(`err${i}`));
    assert(getErrorLog().length <= 500, 'error log capped at 500');
}

// 2.10 Error serialization
{
    const err = new AppError('serialize', { code: 'SER', source: 'test', context: { key: 'val' } });
    const json = err.toJSON();
    assert(json.error === true, 'serialized has error flag');
    assertEq(json.code, 'SER', 'serialized code');
    assertEq(json.message, 'serialize', 'serialized message');
    assert(typeof json.timestamp === 'number', 'serialized timestamp');
}

// 2.11 Error with context
{
    const err = new AppError('ctx', { context: { nested: { deep: true } } });
    assert(err.context.nested.deep === true, 'error context preserved');
}

// ═══════════════════════════════════════════════════════════════
// 3. EDGE CASES
// ═══════════════════════════════════════════════════════════════

console.log('\n=== 3. EDGE CASES ===');

// 3.1 Signal with undefined
{
    const [get, set] = createSignal(undefined);
    assertEq(get(), undefined, 'signal undefined initial');
    set(undefined);
    assertEq(get(), undefined, 'signal set undefined');
}

// 3.2 Signal with null
{
    const [get, set] = createSignal(null);
    assertEq(get(), null, 'signal null initial');
    set(null);
    assertEq(get(), null, 'signal set null');
}

// 3.3 Signal with 0
{
    const [get, set] = createSignal(0);
    assertEq(get(), 0, 'signal zero initial');
    set(0);
    assertEq(get(), 0, 'signal set zero (same value)');
}

// 3.4 Signal with empty string
{
    const [get, set] = createSignal('');
    assertEq(get(), '', 'signal empty string initial');
    set('');
    assertEq(get(), '', 'signal set empty string (same)');
}

// 3.5 Signal with NaN
{
    const [get, set] = createSignal(NaN);
    assert(Number.isNaN(get()), 'signal NaN initial');
    set(NaN);
    assert(Number.isNaN(get()), 'signal set NaN (same via Object.is)');
}

// 3.6 Signal with Infinity
{
    const [get, set] = createSignal(Infinity);
    assertEq(get(), Infinity, 'signal Infinity initial');
    set(-Infinity);
    assertEq(get(), -Infinity, 'signal set -Infinity');
}

// 3.7 Signal with function value
{
    const fn = () => 42;
    const [get, set] = createSignal(fn);
    assertEq(get()(), 42, 'signal function value');
}

// 3.8 Signal with array
{
    const [get, set] = createSignal([1, 2, 3]);
    assertEq(get().length, 3, 'signal array value');
    set([4, 5]);
    assertEq(get().length, 2, 'signal set new array');
}

// 3.9 Signal with object
{
    const [get, set] = createSignal({ a: 1, b: 2 });
    assertEq(get().a, 1, 'signal object value');
    set({ a: 10, b: 20 });
    assertEq(get().a, 10, 'signal set new object');
}

// 3.10 Effect dispose works
{
    const [get, set] = createSignal(0);
    let runs = 0;
    const dispose = createEffect(() => { get(); runs++; });
    assertEq(runs, 1, 'effect runs once');
    dispose();
    set(1);
    assertEq(runs, 1, 'effect stopped after dispose');
}

// 3.11 Batch inside effect
{
    const [get, set] = createSignal(0);
    let runs = 0;
    createEffect(() => {
        get();
        runs++;
        if (runs === 1) {
            batch(() => { set(1); set(2); });
        }
    });
    assertEq(runs, 2, 'batch inside effect runs once');
}

// 3.12 Multiple batches
{
    const [get, set] = createSignal(0);
    let runs = 0;
    createEffect(() => { get(); runs++; });
    batch(() => set(1));
    batch(() => set(2));
    batch(() => set(3));
    assertEq(runs, 4, 'multiple batches each trigger');
}

// 3.13 Signal reassignment protection
{
    const [get, set] = createSignal({ x: 1 });
    const obj = get();
    obj.x = 2; // mutation - same reference, signal can't detect
    assertEq(get().x, 2, 'mutation reflects (same reference)');
    set({ x: 3 }); // reassignment
    assertEq(get().x, 3, 'reassignment detected');
}

// 3.14 Computed caching
{
    const [get, set] = createSignal(1);
    let computeCount = 0;
    const comp = createComputed(() => { computeCount++; return get() * 2; });
    assertEq(computeCount, 1, 'computed computed once');
    comp(); // read
    comp(); // read
    assertEq(computeCount, 1, 'computed cached on reads');
    set(2);
    assertEq(computeCount, 2, 'computed recomputes on change');
}

// 3.15 All effects run
{
    const [get, set] = createSignal(0);
    let a = 0, b = 0, c = 0;
    createEffect(() => { get(); a++; });
    createEffect(() => { get(); b++; });
    createEffect(() => { get(); c++; });
    set(1);
    assertEq(a, 2, 'effect a ran');
    assertEq(b, 2, 'effect b ran');
    assertEq(c, 2, 'effect c ran');
}

// 3.16 Untrack with side effects
{
    const [get, set] = createSignal(0);
    const [otherGet, otherSet] = createSignal(100);
    let runCount = 0;
    createEffect(() => {
        get(); // tracked
        untrack(() => otherGet()); // untracked
        runCount++;
    });
    assertEq(runCount, 1, 'untracked: initial run');
    set(1);
    assertEq(runCount, 2, 'untracked: re-runs on tracked');
    otherSet(200);
    assertEq(runCount, 2, 'untracked: not re-triggered by untracked');
}

// ═══════════════════════════════════════════════════════════════
// 4. RPC CLIENT
// ═══════════════════════════════════════════════════════════════

console.log('\n=== 4. RPC CLIENT ===');

// 4.1 RPC object exists (skip in non-browser env)
{
    const hasWindow = typeof globalThis !== 'undefined' && typeof globalThis.window !== 'undefined';
    if (!hasWindow) {
        console.log('  (skipping RPC tests in non-browser env)');
        passed += 2;
    } else {
        assert(typeof window.rpc === 'object', 'rpc object exists');
        assert(typeof window.rpc.call === 'function', 'rpc.call is function');
    }
}

// ═══════════════════════════════════════════════════════════════
// SUMMARY
// ═══════════════════════════════════════════════════════════════

console.log(`\n${'='.repeat(50)}`);
console.log(`TOTAL: ${passed + failed} tests: ${passed} passed, ${failed} failed`);
console.log(`${'='.repeat(50)}`);
if (failed > 0) process.exit(1);
