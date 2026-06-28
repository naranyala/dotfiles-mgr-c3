#!/bin/bash
set -euo pipefail


# Compile the build script
echo "Compiling build.c3..."
c3c compile build.c3

# Run the build script
echo "Running build script..."
./build

echo "Build finished, looking for executable..."

# Find and run the correct executable
if [ -f "./dotfiles-mgr" ]; then
    echo "Running ./dotfiles-mgr"
    exec ./dotfiles-mgr
else
    echo "Error: Executable not found. Build might have failed or output name is unknown."
    exit 1
fi
