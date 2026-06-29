import { html } from './template.js';
import { createEffect } from './signals.js';

export function classMap(classes) {
    return {
        isDirective: true,
        setup: (targetNode) => {
            const el = targetNode.nextElementSibling || targetNode.parentElement;
            if (el && el.nodeType === 1) {
                for (const [cls, val] of Object.entries(classes)) {
                    if (val) el.classList.add(cls);
                    else el.classList.remove(cls);
                }
            }
            targetNode.remove();
        }
    };
}

export function styleMap(styles) {
    return {
        isDirective: true,
        setup: (targetNode) => {
            const el = targetNode.nextElementSibling || targetNode.parentElement;
            if (el && el.nodeType === 1) {
                for (const [prop, val] of Object.entries(styles)) {
                    if (val === null || val === undefined || val === false) {
                        el.style[prop] = '';
                    } else {
                        el.style[prop] = val;
                    }
                }
            }
            targetNode.remove();
        }
    };
}

export function styleMap(styles) {
    return {
        isDirective: true,
        setup: (targetNode) => {
            const el = targetNode.nextElementSibling || targetNode.parentElement;
            if (el && el.nodeType === 1) {
                const effect = createEffect(() => {
                    const styleString = Object.entries(styles)
                        .map(([prop, val]) => `${prop}: ${val}`)
                        .join('; ');
                    el.style.cssText = styleString;
                });
                return effect;
            }
            targetNode.remove();
        }
    };
}

export function repeat(items, keyFn, renderFn) {
    return {
        isDirective: true,
        setup: (targetNode) => {
            const container = targetNode.nextElementSibling || targetNode.parentElement;
            if (!container || container.nodeType !== 1) {
                targetNode.remove();
                return;
            }

            const nodeMap = new Map(); // key -> { element, index }

            const effect = createEffect(() => {
                const list = items();
                const keys = list.map(keyFn);
                
                // 1. Remove old nodes
                for (const [key, nodeInfo] of nodeMap.entries()) {
                    if (!keys.includes(key)) {
                        nodeInfo.element.remove();
                        nodeMap.delete(key);
                    }
                }

                // 2. Add/Update/Move nodes
                keys.forEach((key, index) => {
                    if (nodeMap.has(key)) {
                        const nodeInfo = nodeMap.get(key);
                        if (nodeInfo.index !== index) {
                            container.insertBefore(nodeInfo.element, container.children[index] || null);
                            nodeInfo.index = index;
                        }
                    } else {
                        const item = list[index];
                        const newElement = renderFn(item, index);
                        if (newElement instanceof Node) {
                            container.insertBefore(newElement, container.children[index] || null);
                            nodeMap.set(key, { element: newElement, index });
                        }
                    }
                });
            });
            return effect;
        }
    };
}

export function styleMap(styles) {
    return {
        isDirective: true,
        setup: (targetNode) => {
            const el = targetNode.nextElementSibling || targetNode.parentElement;
            if (el && el.nodeType === 1) {
                const effect = createEffect(() => {
                    const styleString = Object.entries(styles)
                        .map(([prop, val]) => `${prop}: ${val}`)
                        .join('; ');
                    el.style.cssText = styleString;
                });
                return effect;
            }
            targetNode.remove();
        }
    };
}
