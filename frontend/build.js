import * as esbuild from 'esbuild';

async function build() {
    await esbuild.build({
        entryPoints: ['src/index.js'],
        bundle: true,
        outfile: 'dist/bundle.js',
        format: 'iife',
        minify: true,
        sourcemap: true,
        loader: { '.ttf': 'file' },
    });
    await esbuild.build({
        entryPoints: ['node_modules/monaco-editor/esm/vs/editor/editor.worker.js'],
        bundle: true,
        outfile: 'dist/editor.worker.js',
        format: 'iife',
        minify: true,
    });
    console.log('Build complete');
}

build().catch(() => process.exit(1));
