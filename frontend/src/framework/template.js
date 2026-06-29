import { createEffect } from './signals.js';
import { TemplateError, logError } from '../core/errors.js';

export function html(strings, ...values) {
    const raw = strings.reduce((acc, str, i) => {
        if (i < values.length) {
            const val = values[i];
            if (typeof val === 'function') {
                return acc + str + '<!--signal-->';
            }
            if (val instanceof Node) {
                return acc + str + '<!--node-->';
            }
            return acc + str + `<!--val:${escapeAttr(String(val ?? ''))}-->`;
        }
        return acc + str;
    }, '');

    const template = document.createElement('template');
    template.innerHTML = raw;
    const fragment = template.content.cloneNode(true);

    const signalNodes = [];
    const domNodes = [];
    const walk = (node) => {
        if (node.nodeType === 8) {
            if (node.textContent === 'signal') signalNodes.push(node);
            else if (node.textContent === 'node') domNodes.push(node);
        }
        for (const child of Array.from(node.childNodes)) {
            walk(child);
        }
    };
    walk(fragment);

    const cleanups = [];
    
    // Handle signal nodes
    let sigIdx = 0;
    for (const node of signalNodes) {
        while (sigIdx < values.length && typeof values[sigIdx] !== 'function') sigIdx++;
        if (sigIdx < values.length) {
            const fn = values[sigIdx];
            const text = document.createTextNode('');
            node.parentNode.insertBefore(text, node);
            node.remove();

            const cleanup = createEffect(() => {
                try {
                    const val = fn();
                    if (val instanceof Node) {
                        text.parentNode.insertBefore(val, text);
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
            sigIdx++;
        }
    }

    // Handle DOM nodes
    let domIdx = 0;
    for (const node of domNodes) {
        while (domIdx < values.length && !(values[domIdx] instanceof Node)) domIdx++;
        if (domIdx < values.length) {
            const domVal = values[domIdx];
            node.parentNode.insertBefore(domVal, node);
            node.remove();
            domIdx++;
        }
    }

    fragment._cleanup = () => {
        for (const c of cleanups) c();
    };

    return fragment;
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

export function repeat(items, keyFn, renderFn) {
    return () => {
        try {
            const list = items();
            if (!Array.isArray(list)) return [];
            return list.map((item, index) => {
                try {
                    return renderFn(item, index);
                } catch (err) {
                    logError(new TemplateError('List item render failed', {
                        context: { error: err, index }
                    }));
                    return document.createDocumentFragment();
                }
            });
        } catch (err) {
            logError(new TemplateError('List render failed', {
                context: { error: err }
            }));
            return [];
        }
    };
}

function escapeAttr(str) {
    return str.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
