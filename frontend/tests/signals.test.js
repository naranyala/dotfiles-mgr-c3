import { expect, test, describe } from "bun:test";
import { createSignal, createComputed, batch } from "../src/framework/signals.js";

describe("Signals reactivity framework", () => {
    test("should initialize and read signal", () => {
        const [count, setCount] = createSignal(10);
        expect(count()).toBe(10);
    });

    test("should update signal", () => {
        const [count, setCount] = createSignal(10);
        setCount(20);
        expect(count()).toBe(20);
    });

    test("should compute derived values", () => {
        const [count, setCount] = createSignal(2);
        const doubled = createComputed(() => count() * 2);
        
        expect(doubled()).toBe(4);
        setCount(4);
        expect(doubled()).toBe(8);
    });

    test("should support batched updates", () => {
        const [count, setCount] = createSignal(0);
        let computeCount = 0;
        
        const doubled = createComputed(() => {
            computeCount++;
            return count() * 2;
        });

        // initial compute
        expect(computeCount).toBe(1);

        batch(() => {
            setCount(1);
            setCount(2);
            setCount(3);
        });

        expect(count()).toBe(3);
        // It should have only triggered the computed function once for the batch
        expect(computeCount).toBe(2);
    });
});
