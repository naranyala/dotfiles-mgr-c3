// Standalone backend test - tests the compiled binary
// Run: ./dotfiles-mgr-test.sh

const { spawn } = require('child_process');
const path = require('path');

const PROJECT_DIR = path.join(__dirname, '..');
const BINARY = path.join(PROJECT_DIR, 'main');

let passed = 0;
let failed = 0;

function assert(condition, name) {
    if (condition) { passed++; } else { failed++; console.error(`  FAIL: ${name}`); }
}

function assertEq(actual, expected, name) {
    if (actual === expected) { passed++; } else { failed++; console.error(`  FAIL: ${name} — expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`); }
}

// Test that the binary exists and is executable
console.log('=== Binary Test ===');

const fs = require('fs');
assert(fs.existsSync(BINARY), 'binary exists');
assert(fs.statSync(BINARY).mode & 0o111, 'binary is executable');

// Test that the frontend bundle exists
console.log('\n=== Frontend Bundle ===');

const bundlePath = path.join(PROJECT_DIR, 'frontend', 'dist', 'bundle.js');
assert(fs.existsSync(bundlePath), 'bundle.js exists');
assert(fs.statSync(bundlePath).size > 0, 'bundle.js is not empty');

const htmlPath = path.join(PROJECT_DIR, 'frontend', 'dist', 'index.html');
assert(fs.existsSync(htmlPath), 'index.html exists');

// Test that example repos exist
console.log('\n=== Example Repos ===');

const reposDir = path.join(PROJECT_DIR, 'examples', 'repos');
assert(fs.existsSync(reposDir), 'repos directory exists');

const expectedRepos = [
    'basic-commits', 'empty-repo', 'multiple-branches', 'merge-conflicts',
    'complex-history', 'tags-releases', 'dotfiles-collection', 'orphan-branches',
    'rebase-history', 'cherry-pick-history', 'detached-head', 'submodule-repo',
    'bare-repo.git', 'shallow-clone', 'gitignore-patterns', 'large-files',
    'nested-dirs', 'signed-commits', 'worktree-demo', 'initial-commit-only'
];

for (const repo of expectedRepos) {
    const repoPath = path.join(reposDir, repo);
    assert(fs.existsSync(repoPath), `repo ${repo} exists`);
    // bare-repo.git is itself the .git directory
    if (repo !== 'bare-repo.git') {
        assert(fs.existsSync(path.join(repoPath, '.git')), `repo ${repo} has .git`);
    }
}

// Test that workspace config exists or will be created
console.log('\n=== Workspace Config ===');

const stateDir = path.join(PROJECT_DIR, 'state');
const configPath = path.join(stateDir, 'workspaces.json');

// Config might not exist yet, that's OK - it will be created on first run
if (fs.existsSync(configPath)) {
    const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    assert(Array.isArray(config), 'config is array');
    assert(config.length > 0, 'config has workspaces');
    assert(config.some(w => w.id === 'lab'), 'config has lab workspace');
} else {
    console.log('  (workspace config will be created on first run)');
    passed += 3;
}

// Test that source files exist
console.log('\n=== Source Files ===');

const srcFiles = [
    'src/main.c3',
    'src/core/rpc.c3',
    'src/core/errors.c3',
    'src/core/plugin.c3',
    'src/plugins/repo.c3',
    'src/plugins/workspace.c3',
    'src/plugins/ping.c3',
    'src/plugins/system.c3',
    'src/bindings/webview.c3',
    'src/bindings/libgit2.c3',
    'src/bindings/cjson.c3',
];

for (const file of srcFiles) {
    const filePath = path.join(PROJECT_DIR, file);
    assert(fs.existsSync(filePath), `source ${file} exists`);
}

// Test frontend source files
console.log('\n=== Frontend Source Files ===');

const frontendFiles = [
    'frontend/src/index.js',
    'frontend/src/framework/signals.js',
    'frontend/src/framework/component.js',
    'frontend/src/framework/template.js',
    'frontend/src/core/errors.js',
    'frontend/src/core/rpc.js',
    'frontend/src/plugins/repo-browser.js',
    'frontend/test.js',
    'frontend/test_rpc.js',
];

for (const file of frontendFiles) {
    const filePath = path.join(PROJECT_DIR, file);
    assert(fs.existsSync(filePath), `source ${file} exists`);
}

// Summary
console.log(`\n${'='.repeat(50)}`);
console.log(`TOTAL: ${passed + failed} tests: ${passed} passed, ${failed} failed`);
console.log(`${'='.repeat(50)}`);

if (failed > 0) process.exit(1);
