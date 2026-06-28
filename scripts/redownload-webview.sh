#!/bin/bash
set -e

# Change directory to the root of the project
cd "$(dirname "$0")/.."

echo "Deleting existing webview folder..."
rm -rf webview

echo "Downloading fresh copy of webview..."
git clone --depth 1 https://github.com/webview/webview.git

echo "Webview has been successfully redownloaded."
