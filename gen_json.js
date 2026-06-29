const fs = require('fs');
const path = require('path');

function getRepos(dir) {
    let repos = [];
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
        if (entry.name === '.git') {
            return [dir];
        } else if (entry.name.endsWith('.git') && entry.isDirectory()) {
            repos.push(path.join(dir, entry.name));
        }
    }
    
    for (const entry of entries) {
        if (entry.isDirectory() && entry.name !== '.git') {
            const subRepos = getRepos(path.join(dir, entry.name));
            repos = repos.concat(subRepos);
        }
    }
    return repos;
}

const allRepos = getRepos('./examples');
const reposJson = allRepos.map(r => {
    const p = './' + r.split(path.sep).join('/');
    const name = path.basename(r);
    return {
        id: name.toLowerCase().replace(/[^a-z0-9]/g, '-'),
        name: name,
        path: p,
        type: 'local'
    };
});

const defaultJson = [
  {
    id: "laboratory",
    name: "Laboratory",
    groups: [
      {
        id: "examples",
        name: "Examples",
        repos: reposJson
      }
    ]
  }
];

console.log(JSON.stringify(defaultJson).replace(/"/g, '\\"'));
