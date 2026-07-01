import { spawn } from "node:child_process";
import { readdirSync, statSync, existsSync } from "node:fs";
import { join, resolve } from "node:path";

const HOME = process.env.HOME || process.env.USERPROFILE || "";
const REPOS_DIR = join(HOME, ".local", "share", "dotfiles-mgr", "repos");
const PROJECT_ROOT = resolve(process.cwd());

function listDir(dir, maxDepth = 1, depth = 0) {
  if (!existsSync(dir) || depth >= maxDepth) return [];
  try {
    return readdirSync(dir).map((name) => {
      const full = join(dir, name);
      try {
        const s = statSync(full);
        return { name, type: s.isDirectory() ? "directory" : "file", path: full };
      } catch {
        return { name, type: "unknown", path: full };
      }
    });
  } catch {
    return [];
  }
}

function listRepos() {
  if (!existsSync(REPOS_DIR)) {
    return { repos: [], storage: REPOS_DIR, found: false };
  }
  const repos = readdirSync(REPOS_DIR).map((name) => {
    const path = join(REPOS_DIR, name);
    let branch = null;
    try {
      const out = spawnSync("git", ["-C", path, "branch", "--show-current"], {
        encoding: "utf-8",
      });
      branch = out.stdout?.trim() || null;
    } catch {}
    return { name, path, branch };
  });
  return { repos, storage: REPOS_DIR, found: true };
}

function appInfo() {
  const binary = join(PROJECT_ROOT, "dotfiles-mgr");
  if (!existsSync(binary)) {
    return { binary, built: false };
  }
  const s = statSync(binary);
  return { binary, built: true, size: s.size, modified: s.mtime };
}

function sourceTree(subdir) {
  const dir = join(PROJECT_ROOT, "src", subdir);
  return listDir(dir, 2);
}

function projectStructure() {
  return {
    root: listDir(PROJECT_ROOT, 1),
    c3: listDir(join(PROJECT_ROOT, "src"), 1),
    frontend: listDir(join(PROJECT_ROOT, "frontend"), 1),
    scripts: listDir(join(PROJECT_ROOT, "scripts"), 1),
  };
}

const TOOLS = {
  dotfiles_list_repos: {
    description: "List tracked dotfiles repositories in the app storage directory.",
    inputSchema: { type: "object", properties: {} },
    execute: () => listRepos(),
  },
  dotfiles_app_info: {
    description: "Check if the dotfiles-mgr application binary exists and its metadata.",
    inputSchema: { type: "object", properties: {} },
    execute: () => appInfo(),
  },
  c3_source_tree: {
    description: "List the C3 backend source tree (src/).",
    inputSchema: { type: "object", properties: {} },
    execute: () => sourceTree(""),
  },
  c3_core_tree: {
    description: "List the C3 core modules (src/core/).",
    inputSchema: { type: "object", properties: {} },
    execute: () => sourceTree("core"),
  },
  c3_plugins_tree: {
    description: "List the C3 plugins (src/plugins/).",
    inputSchema: { type: "object", properties: {} },
    execute: () => sourceTree("plugins"),
  },
  frontend_source_tree: {
    description: "List the JavaScript frontend source tree (frontend/).",
    inputSchema: { type: "object", properties: {} },
    execute: () => listDir(join(PROJECT_ROOT, "frontend"), 2),
  },
  project_structure: {
    description: "Return an overview of the project structure (root, src, frontend, scripts).",
    inputSchema: { type: "object", properties: {} },
    execute: () => projectStructure(),
  },
};

function buildResponse(id, result, contentType = "text") {
  if (contentType === "raw") {
    return JSON.stringify({ jsonrpc: "2.0", id, result });
  }
  return JSON.stringify({ jsonrpc: "2.0", id, result: { content: [{ type: contentType, text: JSON.stringify(result) }] } });
}

function buildError(id, code, message) {
  return JSON.stringify({ jsonrpc: "2.0", id, error: { code, message } });
}

function handleRequest(req) {
  const { id, method, params } = req;

  if (method === "initialize") {
    return buildResponse(id, {
      protocolVersion: "2025-11-25",
      capabilities: { tools: {} },
      serverInfo: { name: "dotfiles-mgr-mcp", version: "0.1.0" },
    }, "raw");
  }

  if (method === "initialized") {
    return buildResponse(id, {}, "raw");
  }

  if (method === "tools/list") {
    const tools = Object.entries(TOOLS).map(([name, t]) => ({
      name,
      description: t.description,
      inputSchema: t.inputSchema,
    }));
    return buildResponse(id, { tools }, "raw");
  }

  if (method === "tools/call") {
    const { name, arguments: args } = params || {};
    const tool = TOOLS[name];
    if (!tool) {
      return buildError(id, -32601, `Unknown tool: ${name}`);
    }
    try {
      const result = tool.execute(args || {});
      return buildResponse(id, result);
    } catch (err) {
      return buildError(id, -32603, err.message);
    }
  }

  return buildError(id, -32601, `Method not found: ${method}`);
}

let buffer = "";
const encoder = new TextEncoder();
const decoder = new TextDecoder();

process.stdin.setEncoding("utf-8");
process.stdin.on("data", (chunk) => {
  buffer += chunk;
  let boundary = buffer.indexOf("\n");
  while (boundary !== -1) {
    const line = buffer.slice(0, boundary).trim();
    buffer = buffer.slice(boundary + 1);
    if (line) {
      try {
        const req = JSON.parse(line);
        if (req) {
          const res = handleRequest(req);
          process.stdout.write(res + "\n");
        }
      } catch {
        // ignore malformed lines
      }
    }
    boundary = buffer.indexOf("\n");
  }
});
