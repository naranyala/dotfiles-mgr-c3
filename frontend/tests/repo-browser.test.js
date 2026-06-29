import test from 'node:test';
import assert from 'node:assert';
import { RpcError } from '../src/core/errors.js';

// We can't easily test DOM web components without jsdom,
// but we can extract and test the tree building logic that was so critical!

test('buildTree properly constructs recursive tree', (t) => {
    // Re-create the logic from RepoSidebar
    function buildTree(repos) {
        const root = { name: '', path: '', type: 'folder', repos: [], folders: {} };
        
        repos.forEach(repo => {
            const relPath = repo.name;
            const parts = relPath.split('/');
            let current = root;
            
            for (let i = 0; i < parts.length - 1; i++) {
                const part = parts[i];
                if (!current.folders[part]) {
                    current.folders[part] = { name: part, path: parts.slice(0, i + 1).join('/'), type: 'folder', repos: [], folders: {} };
                }
                current = current.folders[part];
            }
            
            current.repos.push({ ...repo, displayName: parts[parts.length - 1] });
        });
        return root;
    }
    
    const repos = [
        { name: 'repos/basic-commits', path: '/abs/repos/basic-commits' },
        { name: 'repos/cherry-pick-history', path: '/abs/repos/cherry-pick-history' },
        { name: 'bare-repo.git', path: '/abs/bare-repo.git' }
    ];
    
    const tree = buildTree(repos);
    
    assert.strictEqual(tree.repos.length, 1);
    assert.strictEqual(tree.repos[0].displayName, 'bare-repo.git');
    
    assert.ok(tree.folders['repos']);
    assert.strictEqual(tree.folders['repos'].repos.length, 2);
    assert.strictEqual(tree.folders['repos'].repos[0].displayName, 'basic-commits');
    assert.strictEqual(tree.folders['repos'].repos[1].displayName, 'cherry-pick-history');
});
