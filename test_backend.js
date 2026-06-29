const net = require('net');
const child_process = require('child_process');

// The backend is a webview app which uses RPC. We can't easily call RPC directly from JS without the webview context unless we mock the C3 backend. 
// Let's just write a small C3 script to test `libgit2::git_repository_open` on "./examples/repos/basic-commits".
