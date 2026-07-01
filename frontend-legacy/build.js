import * as esbuild from 'esbuild';

async function build() {
    await Promise.all([
        esbuild.build({
            entryPoints: ['src/index.js'],
            bundle: true,
            outfile: 'dist/bundle.js',
            format: 'iife',
            minify: true,
            sourcemap: true,
        }),
        esbuild.build({
            entryPoints: ['src/shiki-loader.js'],
            bundle: true,
            outfile: 'dist/shiki.js',
            format: 'iife',
            minify: true,
            sourcemap: false,
        }),
    ]);
    console.log('Build complete');
}

build().catch(() => process.exit(1));
