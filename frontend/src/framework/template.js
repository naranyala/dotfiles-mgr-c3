import { createEffect } from './signals.js';
import { TemplateError, logError } from '../core/errors.js';

export function html(strings, ...values) {
    let raw = '';
    const bindings = [];
    const MARKER = '__html_tmpl_';

    const processVal = (val, isEvent = false, eventName = '', isProp = false, propName = '') => {
        if (isEvent && typeof val === 'function') {
            const id = bindings.length;
            bindings.push({ type: 'event', event: eventName, fn: val });
            raw += MARKER + id;
        } else if (isProp) {
            const id = bindings.length;
            bindings.push({ type: 'prop', prop: propName, val });
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
                processVal(item);
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
            const propMatch = prevStr.match(/\.([a-zA-Z-]+)=["']?$/);
            
            if (eventMatch) {
                processVal(values[i], true, eventMatch[1]);
            } else if (propMatch) {
                processVal(values[i], false, '', true, propMatch[1]);
            } else {
                processVal(values[i]);
            }
        }
    }

    const template = document.createElement('template');
    template.innerHTML = raw;
    const fragment = template.content.cloneNode(true);
    const walk = (node) => {
        if (node.nodeType === 1) { // Element
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
                }
            }
        } else if (node.nodeType === 8) { // Comment
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
                        } else {
                            const textNode = document.createTextNode(String(n ?? ''));
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
