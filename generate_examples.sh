#!/bin/bash
set -euo pipefail

mkdir -p examples
cd examples

echo "Generating git laboratory workspace..."

# 1. Normal Repo
echo "-> Creating normal repo..."
mkdir -p normal-repo
cd normal-repo
git init
echo "Hello World" > README.md
git add README.md
git commit -m "Initial commit"
echo "Update" >> README.md
git add README.md
git commit -m "Update README"
cd ..

# 2. Repo with branches
echo "-> Creating branched repo..."
mkdir -p branched-repo
cd branched-repo
git init
echo "Initial" > main.txt
git add main.txt
git commit -m "Main branch commit"
git checkout -b feature/ui
echo "UI work" > ui.txt
git add ui.txt
git commit -m "Add UI components"
git checkout -b bugfix/login main
echo "Fix" > fix.txt
git add fix.txt
git commit -m "Fix login bug"
git checkout main
cd ..

# 3. Empty Repo
echo "-> Creating empty repo..."
mkdir -p empty-repo
cd empty-repo
git init
cd ..

# 4. Detached HEAD
echo "-> Creating detached HEAD repo..."
mkdir -p detached-head-repo
cd detached-head-repo
git init
echo "v1" > file.txt
git add file.txt
git commit -m "v1 commit"
echo "v2" > file.txt
git add file.txt
git commit -m "v2 commit"
# Checkout the first commit by its hash
FIRST_COMMIT=$(git rev-list --max-parents=0 HEAD)
git checkout $FIRST_COMMIT
cd ..

# 5. Bare Repo
echo "-> Creating bare repo..."
mkdir -p bare-repo.git
cd bare-repo.git
git init --bare
cd ..

# 6. Repo with uncommitted changes
echo "-> Creating repo with uncommitted changes..."
mkdir -p dirty-repo
cd dirty-repo
git init
echo "Tracked" > tracked.txt
git add tracked.txt
git commit -m "Initial"
echo "Modified" >> tracked.txt
echo "Untracked" > untracked.txt
cd ..

# 7. Repo with remotes
echo "-> Creating repo with remotes..."
mkdir -p remote-repo
cd remote-repo
git init
echo "Remote test" > test.txt
git add test.txt
git commit -m "Initial"
git remote add origin https://github.com/torvalds/linux.git
git remote add upstream https://github.com/git/git.git
cd ..

echo "Laboratory generation complete!"
