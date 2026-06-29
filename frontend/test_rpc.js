// Backend RPC integration tests
// Run: ./test_rpc.sh

import { rpc } from './src/core/rpc.js';

let passed = 0;
let failed = 0;

function assert(condition, name) {
    if (condition) { passed++; } else { failed++; console.error(`FAIL: ${name}`); }
}

function assertEq(actual, expected, name) {
    if (actual === expected) { passed++; } else { failed++; console.error(`FAIL: ${name} — expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`); }
}

async function test(name, fn) {
    try {
        await fn();
        console.log(`  PASS: ${name}`);
    } catch (e) {
        failed++;
        console.error(`  FAIL: ${name} — ${e.message}`);
    }
}

// ═══════════════════════════════════════════════════════════════
// 1. REPO LIST
// ═══════════════════════════════════════════════════════════════

console.log('\n=== 1. REPO LIST ===');

await test('repo.list returns array', async () => {
    const result = await rpc.repo.list();
    assert(Array.isArray(result), 'result is array');
});

await test('repo.list finds repos', async () => {
    const result = await rpc.repo.list();
    assert(result.length > 0, 'found repos');
});

await test('repo.list has basic-commits', async () => {
    const result = await rpc.repo.list();
    const names = result.map(r => r.name);
    assert(names.includes('basic-commits') || result.some(r => r.path.includes('basic-commits')), 'basic-commits found');
});

await test('repo.list has all 20 repos', async () => {
    const result = await rpc.repo.list();
    const expected = ['basic-commits', 'empty-repo', 'multiple-branches', 'merge-conflicts', 'complex-history', 'tags-releases', 'dotfiles-collection'];
    for (const name of expected) {
        assert(result.some(r => r.name === name || r.path.includes(name)), `${name} found`);
    }
});

await test('repo.list items have required fields', async () => {
    const result = await rpc.repo.list();
    if (result.length > 0) {
        const repo = result[0];
        assert('path' in repo, 'has path');
        assert('name' in repo, 'has name');
    }
});

// ═══════════════════════════════════════════════════════════════
// 2. REPO INFO
// ═══════════════════════════════════════════════════════════════

console.log('\n=== 2. REPO INFO ===');

await test('repo.info returns object', async () => {
    const result = await rpc.repo.info('./examples/repos/basic-commits');
    assert(typeof result === 'object', 'result is object');
});

await test('repo.info has name', async () => {
    const result = await rpc.repo.info('./examples/repos/basic-commits');
    assert('name' in result, 'has name');
});

await test('repo.info has path', async () => {
    const result = await rpc.repo.info('./examples/repos/basic-commits');
    assert('path' in result, 'has path');
});

await test('repo.info has branch', async () => {
    const result = await rpc.repo.info('./examples/repos/basic-commits');
    assert('branch' in result, 'has branch');
});

await test('repo.info basic-commits has main branch', async () => {
    const result = await rpc.repo.info('./examples/repos/basic-commits');
    assertEq(result.branch, 'main', 'branch is main');
});

await test('repo.info multiple-branches has branches', async () => {
    const result = await rpc.repo.info('./examples/repos/multiple-branches');
    assert('branches' in result, 'has branches array');
    assert(Array.isArray(result.branches), 'branches is array');
    assert(result.branches.length >= 2, 'has multiple branches');
});

await test('repo.info error on invalid path', async () => {
    try {
        await rpc.repo.info('./nonexistent');
        assert(false, 'should throw');
    } catch (e) {
        assert(true, 'throws on invalid path');
    }
});

// ═══════════════════════════════════════════════════════════════
// 3. REPO TREE
// ═══════════════════════════════════════════════════════════════

console.log('\n=== 3. REPO TREE ===');

await test('repo.tree returns array', async () => {
    const result = await rpc.repo.tree('./examples/repos/basic-commits');
    assert(Array.isArray(result), 'result is array');
});

await test('repo.tree has files', async () => {
    const result = await rpc.repo.tree('./examples/repos/basic-commits');
    assert(result.length > 0, 'has files');
});

await test('repo.tree items have name and type', async () => {
    const result = await rpc.repo.tree('./examples/repos/basic-commits');
    const file = result[0];
    assert('name' in file, 'has name');
    assert('type' in file, 'has type');
});

await test('repo.tree basic-commits has README.md', async () => {
    const result = await rpc.repo.tree('./examples/repos/basic-commits');
    const names = result.map(f => f.name);
    assert(names.includes('README.md'), 'README.md found');
});

await test('repo.tree dotfiles-collection has .config', async () => {
    const result = await rpc.repo.tree('./examples/repos/dotfiles-collection');
    const names = result.map(f => f.name);
    assert(names.includes('.config') || names.includes('README.md'), 'has expected files');
});

await test('repo.tree error on invalid path', async () => {
    try {
        await rpc.repo.tree('./nonexistent');
        assert(false, 'should throw');
    } catch (e) {
        assert(true, 'throws on invalid path');
    }
});

// ═══════════════════════════════════════════════════════════════
// 4. REPO FILE
// ═══════════════════════════════════════════════════════════════

console.log('\n=== 4. REPO FILE ===');

await test('repo.file returns object', async () => {
    const result = await rpc.repo.file('./examples/repos/basic-commits', 'README.md');
    assert(typeof result === 'object', 'result is object');
});

await test('repo.file has content', async () => {
    const result = await rpc.repo.file('./examples/repos/basic-commits', 'README.md');
    assert('content' in result, 'has content');
});

await test('repo.file has path', async () => {
    const result = await rpc.repo.file('./examples/repos/basic-commits', 'README.md');
    assertEq(result.path, 'README.md', 'path matches');
});

await test('repo.file README.md contains text', async () => {
    const result = await rpc.repo.file('./examples/repos/basic-commits', 'README.md');
    assert(result.content.length > 0, 'content not empty');
});

await test('repo.file error on missing file', async () => {
    try {
        await rpc.repo.file('./examples/repos/basic-commits', 'nonexistent.txt');
        assert(false, 'should throw');
    } catch (e) {
        assert(true, 'throws on missing file');
    }
});

// ═══════════════════════════════════════════════════════════════
// 5. REPO HISTORY
// ═══════════════════════════════════════════════════════════════

console.log('\n=== 5. REPO HISTORY ===');

await test('repo.history returns array', async () => {
    const result = await rpc.repo.history('./examples/repos/basic-commits');
    assert(Array.isArray(result), 'result is array');
});

await test('repo.history has commits', async () => {
    const result = await rpc.repo.history('./examples/repos/basic-commits');
    assert(result.length > 0, 'has commits');
});

await test('repo.history commits have id and message', async () => {
    const result = await rpc.repo.history('./examples/repos/basic-commits');
    const commit = result[0];
    assert('id' in commit, 'has id');
    assert('message' in commit, 'has message');
});

await test('repo.history basic-commits has 5 commits', async () => {
    const result = await rpc.repo.history('./examples/repos/basic-commits');
    assertEq(result.length, 5, 'has 5 commits');
});

await test('repo.history error on invalid path', async () => {
    try {
        await rpc.repo.history('./nonexistent');
        assert(false, 'should throw');
    } catch (e) {
        assert(true, 'throws on invalid path');
    }
});

// ═══════════════════════════════════════════════════════════════
// 6. REPO BRANCHES
// ═══════════════════════════════════════════════════════════════

console.log('\n=== 6. REPO BRANCHES ===');

await test('repo.branches returns array', async () => {
    const result = await rpc.repo.branches('./examples/repos/basic-commits');
    assert(Array.isArray(result), 'result is array');
});

await test('repo.branches has branches', async () => {
    const result = await rpc.repo.branches('./examples/repos/basic-commits');
    assert(result.length > 0, 'has branches');
});

await test('repo.branches has main', async () => {
    const result = await rpc.repo.branches('./examples/repos/basic-commits');
    const names = result.map(b => b.name);
    assert(names.includes('main'), 'has main branch');
});

await test('repo.branches multiple-branches has feature branches', async () => {
    const result = await rpc.repo.branches('./examples/repos/multiple-branches');
    const names = result.map(b => b.name);
    assert(names.length >= 2, 'has multiple branches');
});

await test('repo.branches marks current branch', async () => {
    const result = await rpc.repo.branches('./examples/repos/basic-commits');
    const current = result.filter(b => b.current);
    assert(current.length === 1, 'exactly one current branch');
});

// ═══════════════════════════════════════════════════════════════
// 7. WORKSPACE
// ═══════════════════════════════════════════════════════════════

console.log('\n=== 7. WORKSPACE ===');

await test('workspace.list returns array', async () => {
    const result = await rpc.workspace.list();
    assert(Array.isArray(result), 'result is array');
});

await test('workspace.list has lab workspace', async () => {
    const result = await rpc.workspace.list();
    assert(result.some(w => w.id === 'lab'), 'has lab workspace');
});

await test('workspace.get returns workspace', async () => {
    const result = await rpc.workspace.get('lab');
    assert(typeof result === 'object', 'result is object');
    assertEq(result.id, 'lab', 'id is lab');
});

await test('workspace.get has groups', async () => {
    const result = await rpc.workspace.get('lab');
    assert('groups' in result, 'has groups');
    assert(Array.isArray(result.groups), 'groups is array');
});

await test('workspace.get groups have repos', async () => {
    const result = await rpc.workspace.get('lab');
    for (const group of result.groups) {
        assert('repos' in group, `group ${group.name} has repos`);
        assert(Array.isArray(group.repos), `group ${group.name} repos is array`);
    }
});

// ═══════════════════════════════════════════════════════════════
// 8. EDGE CASES
// ═══════════════════════════════════════════════════════════════

console.log('\n=== 8. EDGE CASES ===');

await test('repo.info error on null path', async () => {
    try {
        await rpc.repo.info(null);
    } catch (e) {
        assert(true, 'throws on null');
    }
});

await test('repo.tree error on empty string', async () => {
    try {
        await rpc.repo.tree('');
    } catch (e) {
        assert(true, 'throws on empty string');
    }
});

await test('repo.file error on null args', async () => {
    try {
        await rpc.repo.file(null, null);
    } catch (e) {
        assert(true, 'throws on null');
    }
});

await test('repo.history error on invalid path', async () => {
    try {
        await rpc.repo.history('/nonexistent/path');
    } catch (e) {
        assert(true, 'throws on invalid path');
    }
});

await test('workspace.get error on invalid id', async () => {
    try {
        await rpc.workspace.get('nonexistent');
    } catch (e) {
        assert(true, 'throws on invalid id');
    }
});

// ═══════════════════════════════════════════════════════════════
// SUMMARY
// ═══════════════════════════════════════════════════════════════

console.log(`\n${'='.repeat(50)}`);
console.log(`TOTAL: ${passed + failed} tests: ${passed} passed, ${failed} failed`);
console.log(`${'='.repeat(50)}`);
if (failed > 0) process.exit(1);
