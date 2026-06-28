import * as esbuild from 'esbuild'

async function build() {
    await esbuild.build({
        entryPoints: ['src/index.js'],
        bundle: true,
        outfile: 'dist/bundle.js',
        minify: true,
        sourcemap: true,
    })
    console.log("⚡ Build complete! ⚡")
}

build().catch(() => process.exit(1))
