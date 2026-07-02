import { readFileSync, writeFileSync, existsSync, mkdirSync, rmSync } from 'fs'
import * as esbuild from 'esbuild'

const standalone = process.env.STANDALONE_GRID || ''

async function main() {
  console.log('=== Frontend Build ===' + (standalone ? ` [standalone: ${standalone}]` : ''))

  if (existsSync('dist')) rmSync('dist', { recursive: true })
  mkdirSync('dist')

  console.log('Bundling with esbuild...')
  await esbuild.build({
    entryPoints: ['src/app.js'],
    bundle: true,
    write: true,
    minify: true,
    sourcemap: false,
    target: ['es2020'],
    outfile: 'dist/bundle.js',
    define: { __STANDALONE_GRID__: JSON.stringify(standalone) },
  })

  const html = readFileSync('index.html', 'utf8')
    .replace('src="dist/bundle.js"', 'src="bundle.js"')
    .replace('<system-dashboard title="dotfiles-mgr"></system-dashboard>',
      standalone
        ? `<system-dashboard title="dotfiles-mgr" standalone="${standalone}"></system-dashboard>`
        : '<system-dashboard title="dotfiles-mgr"></system-dashboard>')
  writeFileSync('dist/index.html', html, 'utf8')

  const bundle = readFileSync('dist/bundle.js', 'utf8')
  if (bundle.includes('</script')) {
    console.error('\nFATAL: bundle contains </script> which would break HTML parsing if inlined')
    process.exit(1)
  }
  const checks = [
    ['SystemDashboard component', 'system-dashboard'],
    ['terminal-view component', 'terminal-view'],
    ['ReactiveComponent (extends HTMLElement)', 'extends HTMLElement'],
    ['Shadow DOM', 'attachShadow'],
  ]
  let ok = true
  for (const [name, pattern] of checks) {
    const found = bundle.includes(pattern)
    console.log(`${found ? 'OK' : 'MISS'} ${name}`)
    if (!found) ok = false
  }
  console.log(ok ? '\nBuild OK, output in dist/index.html' : '\nSome components missing!')
}

main().catch(e => { console.error('Build failed:', e); process.exit(1) })
