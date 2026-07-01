import fs from 'fs';
import path from 'path';

const srcDir = '/media/naranyala/Data/projects-remote/dotfiles-mgr-c3/frontend/src';

function walk(dir) {
    let results = [];
    const list = fs.readdirSync(dir);
    list.forEach(file => {
        const filePath = path.join(dir, file);
        const stat = fs.statSync(filePath);
        if (stat && stat.isDirectory()) {
            results = results.concat(walk(filePath));
        } else if (file.endsWith('.js')) {
            results.push(filePath);
        }
    });
    return results;
}

const files = walk(srcDir);

files.forEach(file => {
    let content = fs.readFileSync(file, 'utf8');
    let changed = false;

    if (content.includes('ReactiveElement')) {
        content = content.replace(/ReactiveElement/g, 'SignalElement');
        changed = true;
    }

    if (file.endsWith('component.js')) {
        // Refactor component.js to remove createEffect from connectedCallback and requestUpdate
        content = content.replace(
            /this\.#cleanup = createEffect\(\(\) => \{\n\s+try \{\n\s+const content = this\.render\(\);\n\s+if \(content\) \{\n\s+if \(this\.#lastFragment && this\.#lastFragment\._cleanup\) \{\n\s+this\.#lastFragment\._cleanup\(\);\n\s+\}\n\s+this\.root\.replaceChildren\(\);\n\s+const appended = this\.root\.appendChild\(content\);\n\s+this\.#lastFragment = content;\n\s+\}\n\s+this\.#renderError = null;\n\s+\} catch \(err\) \{\n\s+this\.#renderError = err;\n\s+this\.#renderErrorBoundary\(err\);\n\s+return;\n\s+\}\n\s+try \{\n\s+this\.setupEvents\(\);\n\s+\} catch \(err\) \{\n\s+logError\(new ComponentError\('setupEvents failed', \{\n\s+context: \{ error: err, component: this\.constructor\.name \}\n\s+\}\)\);\n\s+\}\n\s+\}\);/g,
            `try {
                    const content = this.render();
                    if (content) {
                        if (this.#lastFragment && this.#lastFragment._cleanup) {
                            this.#lastFragment._cleanup();
                        }
                        this.root.replaceChildren();
                        this.root.appendChild(content);
                        this.#lastFragment = content;
                        this.#cleanup = content._cleanup || null;
                    }
                    this.#renderError = null;
                } catch (err) {
                    this.#renderError = err;
                    this.#renderErrorBoundary(err);
                    return;
                }
                try {
                    this.setupEvents();
                } catch (err) {
                    logError(new ComponentError('setupEvents failed', {
                        context: { error: err, component: this.constructor.name }
                    }));
                }`
        );

        content = content.replace(
            /this\.#cleanup = createEffect\(\(\) => \{\n\s+const content = this\.render\(\);\n\s+if \(content\) \{\n\s+this\.root\.replaceChildren\(\);\n\s+this\.root\.appendChild\(content\);\n\s+this\.#lastFragment = content;\n\s+\}\n\s+try \{\n\s+this\.setupEvents\(\);\n\s+\} catch \(err\) \{\n\s+logError\(new ComponentError\('setupEvents failed', \{\n\s+context: \{ error: err, component: this\.constructor\.name \}\n\s+\}\)\);\n\s+\}\n\s+\}\);/g,
            `const content = this.render();
            if (content) {
                this.root.replaceChildren();
                this.root.appendChild(content);
                this.#lastFragment = content;
                this.#cleanup = content._cleanup || null;
            }
            try {
                this.setupEvents();
            } catch (err) {
                logError(new ComponentError('setupEvents failed', {
                    context: { error: err, component: this.constructor.name }
                }));
            }`
        );
        changed = true;
    }

    if (changed) {
        fs.writeFileSync(file, content, 'utf8');
        console.log("Updated " + file);
    }
});
