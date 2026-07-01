import { createEffect, createSignal } from './signals.js';

export function For({ each, key, render }) {
    return {
        isDirective: true,
        setup: (targetNode) => {
            const container = targetNode.parentElement;
            if (!container) {
                targetNode.remove();
                return;
            }

            const nodeMap = new Map();
            let marker = document.createTextNode('');
            container.insertBefore(marker, targetNode);
            targetNode.remove();

            const effect = createEffect(() => {
                const list = each();
                const keys = list.map((item, i) => key(item, i));

                for (const [k, info] of nodeMap.entries()) {
                    if (!keys.includes(k)) {
                        if (info.cleanup) info.cleanup();
                        info.nodes.forEach(n => n.remove());
                        nodeMap.delete(k);
                    }
                }

                let prevNode = marker;
                keys.forEach((k, i) => {
                    const item = list[i];
                    if (nodeMap.has(k)) {
                        const info = nodeMap.get(k);
                        if (info.prevIndex !== i) {
                            let node = prevNode;
                            for (const n of info.nodes) {
                                const next = n.nextSibling;
                                container.insertBefore(n, prevNode.nextSibling);
                                node = n;
                            }
                        }
                        info.prevIndex = i;
                    } else {
                        const result = render(item, i);
                        const nodes = [];
                        if (result instanceof DocumentFragment) {
                            nodes.push(...Array.from(result.childNodes));
                            container.insertBefore(result, prevNode.nextSibling);
                        } else if (result instanceof Node) {
                            nodes.push(result);
                            container.insertBefore(result, prevNode.nextSibling);
                        }
                        nodeMap.set(k, { nodes, prevIndex: i });
                    }
                    const lastInfo = nodeMap.get(k);
                    if (lastInfo && lastInfo.nodes.length) {
                        prevNode = lastInfo.nodes[lastInfo.nodes.length - 1];
                    }
                });
            });

            return () => {
                for (const [, info] of nodeMap) {
                    if (info.cleanup) info.cleanup();
                    info.nodes.forEach(n => n.remove());
                }
                nodeMap.clear();
                marker.remove();
                effect();
            };
        }
    };
}

export function Show({ when, fallback, children }) {
    return {
        isDirective: true,
        setup: (targetNode) => {
            const container = targetNode.parentElement;
            if (!container) {
                targetNode.remove();
                return;
            }

            const marker = document.createTextNode('');
            container.insertBefore(marker, targetNode);
            targetNode.remove();

            let currentNodes = [];
            let currentCleanup = null;

            const cleanup = createEffect(() => {
                const condition = when();
                if (currentCleanup) {
                    currentCleanup();
                    currentCleanup = null;
                }
                currentNodes.forEach(n => n.remove());
                currentNodes = [];

                if (condition) {
                    const result = children();
                    if (result?.isDirective) {
                        const cleanupFn = result.setup(marker);
                        if (typeof cleanupFn === 'function') currentCleanup = cleanupFn;
                    } else if (result instanceof DocumentFragment) {
                        const nodes = Array.from(result.childNodes);
                        container.insertBefore(result, marker);
                        currentNodes = nodes;
                    } else if (result instanceof Node) {
                        container.insertBefore(result, marker);
                        currentNodes = [result];
                    } else if (result !== undefined && result !== null) {
                        const text = document.createTextNode(String(result));
                        container.insertBefore(text, marker);
                        currentNodes = [text];
                    }
                } else if (fallback) {
                    const result = typeof fallback === 'function' ? fallback() : fallback;
                    if (result instanceof Node) {
                        container.insertBefore(result, marker);
                        currentNodes = [result];
                    } else if (result !== undefined && result !== null) {
                        const text = document.createTextNode(String(result));
                        container.insertBefore(text, marker);
                        currentNodes = [text];
                    }
                }
            });

            return () => {
                if (currentCleanup) currentCleanup();
                currentNodes.forEach(n => n.remove());
                marker.remove();
                cleanup();
            };
        }
    };
}

export function Suspense({ fallback, children }) {
    return {
        isDirective: true,
        setup: (targetNode) => {
            const container = targetNode.parentElement;
            if (!container) {
                targetNode.remove();
                return;
            }

            const marker = document.createTextNode('');
            container.insertBefore(marker, targetNode);
            targetNode.remove();

            let currentNodes = [];

            const cleanup = createEffect(() => {
                currentNodes.forEach(n => n.remove());
                currentNodes = [];

                try {
                    const result = children();
                    if (result instanceof Promise) {
                        const fb = typeof fallback === 'function' ? fallback() : fallback;
                        if (fb instanceof Node) {
                            container.insertBefore(fb, marker);
                            currentNodes = [fb];
                        }
                        result.then(res => {
                            currentNodes.forEach(n => n.remove());
                            currentNodes = [];
                            if (res instanceof Node) {
                                container.insertBefore(res, marker);
                                currentNodes = [res];
                            }
                        }).catch(() => {});
                    } else if (result instanceof Node) {
                        container.insertBefore(result, marker);
                        currentNodes = [result];
                    } else if (result !== undefined && result !== null) {
                        const text = document.createTextNode(String(result));
                        container.insertBefore(text, marker);
                        currentNodes = [text];
                    }
                } catch (err) {
                    const fb = typeof fallback === 'function' ? fallback() : fallback;
                    if (fb instanceof Node) {
                        container.insertBefore(fb, marker);
                        currentNodes = [fb];
                    }
                }
            });

            return () => {
                currentNodes.forEach(n => n.remove());
                marker.remove();
                cleanup();
            };
        }
    };
}
