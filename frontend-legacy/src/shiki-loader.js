import { createHighlighter } from 'shiki/bundle/web';

let instance = null;
let ready = false;

const init = createHighlighter({
    themes: ['vitesse-dark'],
    langs: ['javascript', 'typescript', 'html', 'css', 'json', 'markdown', 'c', 'plaintext']
}).then(h => {
    instance = h;
    ready = true;
});

window.__shiki = { get: () => instance, ready: () => ready, init };
