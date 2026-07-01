import { createEffect, createSignal } from './signals.js';
import { TemplateError, logError } from '../core/errors.js';

const MARKER = '__html_tmpl_';

export function html(strings, ...values) {
    let raw = '';
    const bindings = [];

    const processVal = (val, ctx = {}) => {
        const { isEvent, eventName, isProp, propName, isBoolAttr, attrName } = ctx;

        if (isEvent && typeof val === 'function') {
            const id = bindings.length;
            bindings.push({ type: 'event', event: eventName, fn: val });
            raw += MARKER + id;
        } else if (isProp) {
            const id = bindings.length;
            bindings.push({ type: 'prop', prop: propName, val });
            raw += MARKER + id;
        } else if (isBoolAttr) {
            const id = bindings.length;
            bindings.push({ type: 'bool', attr: attrName, val });
            raw += MARKER + id;
        } else if (val?.isDirective) {
            const id = bindings.length;
            bindings.push({ type: 'directive', directive: val });
            raw += `<!--${MARKER}${id}-->`;
        } else if (val?.isRef) {
            const id = bindings.length;
            bindings.push({ type: 'ref', ref: val });
            raw += `<!--${MARKER}${id}-->`;
        } else if (typeof val === 'function') {
            const id = bindings.length;
            bindings.push({ type: 'signal', fn: val });
            raw += `<!--${MARKER}${id}-->`;
        } else if (val instanceof Node) {
            const id = bindings.length;
            bindings.push({ type: 'node', node: val });
            raw += `<!--${MARKER}${id}-->`;
        } else if (Array.isArray(val)) {
            for (const item of val) {
                processVal(item, ctx);
            }
        } else {
            raw += escapeAttr(String(val ?? ''));
        }
    };

    for (let i = 0; i < strings.length; i++) {
        raw += strings[i];
        if (i < values.length) {
            const prevStr = strings[i];
            const eventMatch = prevStr.match(/@([a-zA-Z-]+)=["']?$/);
            const twoWayMatch = prevStr.match(/:([a-zA-Z-]+)=["']?$/);
            const boolMatch = prevStr.match(/\?([a-zA-Z-]+)=["']?$/);
            const propMatch = prevStr.match(/\.([a-zA-Z-]+)=["']?$/);

            if (eventMatch) {
                processVal(values[i], { isEvent: true, eventName: eventMatch[1] });
            } else if (twoWayMatch) {
                const id = bindings.length;
                const attrName = twoWayMatch[1];
                bindings.push({ type: 'twoway', attr: attrName, val: values[i] });
                raw += MARKER + id;
            } else if (boolMatch) {
                processVal(values[i], { isBoolAttr: true, attrName: boolMatch[1] });
            } else if (propMatch) {
                processVal(values[i], { isProp: true, propName: propMatch[1] });
            } else {
                processVal(values[i]);
            }
        }
    }

    const template = document.createElement('template');
    template.innerHTML = raw;
    const fragment = template.content.cloneNode(true);

    const walk = (node) => {
        if (node.nodeType === 1) {
            for (const attr of Array.from(node.attributes)) {
                if (attr.name.startsWith('@')) {
                    const val = attr.value;
                    if (val.startsWith(MARKER)) {
                        const id = parseInt(val.slice(MARKER.length));
                        const binding = bindings[id];
                        if (binding && binding.type === 'event') {
                            node.addEventListener(binding.event, binding.fn);
                            node.removeAttribute(attr.name);
                        }
                    }
                } else if (attr.name.startsWith('.')) {
                    const val = attr.value;
                    if (val.startsWith(MARKER)) {
                        const id = parseInt(val.slice(MARKER.length));
                        const binding = bindings[id];
                        if (binding && binding.type === 'prop') {
                            node[binding.prop] = binding.val;
                            node.removeAttribute(attr.name);
                        }
                    }
                } else if (attr.name.startsWith(':')) {
                    const val = attr.value;
                    if (val.startsWith(MARKER)) {
                        const id = parseInt(val.slice(MARKER.length));
                        const binding = bindings[id];
                        if (binding && binding.type === 'twoway') {
                            setupTwoWayBinding(node, binding);
                            node.removeAttribute(attr.name);
                        }
                    }
                } else if (attr.name.startsWith('?')) {
                    const val = attr.value;
                    if (val.startsWith(MARKER)) {
                        const id = parseInt(val.slice(MARKER.length));
                        const binding = bindings[id];
                        if (binding && binding.type === 'bool') {
                            setupBoolBinding(node, binding);
                            node.removeAttribute(attr.name);
                        }
                    }
                }
            }
        } else if (node.nodeType === 8) {
            if (node.textContent.startsWith(MARKER)) {
                const id = parseInt(node.textContent.slice(MARKER.length));
                const binding = bindings[id];
                if (binding) {
                    binding.targetNode = node;
                }
            }
        }
        for (const child of Array.from(node.childNodes)) {
            walk(child);
        }
    };
    walk(fragment);

    const cleanups = [];

    for (const binding of bindings) {
        if (binding.type === 'signal' && binding.targetNode) {
            const node = binding.targetNode;
            const fn = binding.fn;
            const text = document.createTextNode('');
            node.parentNode.insertBefore(text, node);
            node.remove();

            let currentNodes = [];
            const cleanup = createEffect(() => {
                try {
                    const val = fn();
                    for (const n of currentNodes) if (n.parentNode) n.remove();
                    currentNodes = [];

                    const insertNode = (n) => {
                        if (n instanceof DocumentFragment) {
                            const children = Array.from(n.childNodes);
                            text.parentNode.insertBefore(n, text);
                            currentNodes.push(...children);
                        } else if (n instanceof Node) {
                            text.parentNode.insertBefore(n, text);
                            currentNodes.push(n);
                        } else if (val !== undefined && val !== null) {
                            const textNode = document.createTextNode(String(val));
                            text.parentNode.insertBefore(textNode, text);
                            currentNodes.push(textNode);
                        }
                    };

                    if (val instanceof Node) {
                        insertNode(val);
                        text.textContent = '';
                    } else if (Array.isArray(val)) {
                        for (const item of val) insertNode(item);
                        text.textContent = '';
                    } else {
                        text.textContent = String(val ?? '');
                    }
                } catch (err) {
                    logError(new TemplateError('Template expression failed', {
                        context: { error: err, expression: fn.toString().slice(0, 100) }
                    }));
                    text.textContent = '[Error]';
                }
            });
            cleanups.push(cleanup);
        } else if (binding.type === 'node' && binding.targetNode) {
            const node = binding.targetNode;
            node.parentNode.insertBefore(binding.node, node);
            node.remove();
        } else if (binding.type === 'directive' && binding.targetNode) {
            const cleanup = binding.directive.setup(binding.targetNode);
            if (typeof cleanup === 'function') cleanups.push(cleanup);
        } else if (binding.type === 'ref' && binding.targetNode) {
            const node = binding.targetNode;
            const refObj = binding.ref;
            const el = node.parentElement;
            if (el) {
                refObj.value = el;
            }
            node.remove();
        }
    }

    fragment._cleanup = () => {
        for (const c of cleanups) c();
    };

    return fragment;
}

function setupTwoWayBinding(node, binding) {
    const { attr, val } = binding;
    const isSignal = typeof val === 'function';
    const get = isSignal ? val : () => val;
    const set = isSignal ? val : null;

    if (attr === 'value' || attr === 'checked') {
        node[attr] = get();
        if (set) {
            node.addEventListener('input', () => {
                const newVal = attr === 'checked' ? node.checked : node.value;
                if (typeof set === 'function') {
                    set(newVal);
                }
            });
        }
        if (isSignal) {
            createEffect(() => {
                const v = get();
                if (node[attr] !== v) node[attr] = v;
            });
        }
    }
}

function setupBoolBinding(node, binding) {
    const { attr, val } = binding;
    const isSignal = typeof val === 'function';
    const get = isSignal ? val : () => val;

    const apply = () => {
        if (get()) {
            node.setAttribute(attr, '');
        } else {
            node.removeAttribute(attr);
        }
    };

    if (isSignal) {
        createEffect(apply);
    } else {
        apply();
    }
}

export function css(strings, ...values) {
    const styleString = strings.reduce((acc, str, i) => acc + str + (values[i] || ''), '');
    const sheet = new CSSStyleSheet();
    sheet.replaceSync(styleString);
    return sheet;
}

export function when(condition, renderFn, fallback = null) {
    return () => {
        try {
            return condition() ? renderFn() : fallback;
        } catch (err) {
            logError(new TemplateError('Conditional render failed', {
                context: { error: err }
            }));
            return fallback;
        }
    };
}

function escapeAttr(str) {
    return str.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
