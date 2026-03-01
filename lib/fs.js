const fs = require("fs");
const path = require("path");
const { EngineError } = require("./errors");
const { safeJsonParse } = require("./utils");

function exists(p) {
  try { fs.accessSync(p); return true; } catch { return false; }
}

function readText(p) {
  try { return fs.readFileSync(p, "utf-8"); }
  catch (e) { throw new EngineError("FS_READ_FAILED", `Failed to read file: ${p}`, { path: p, cause: String(e && e.message || e) }); }
}

function readJson(p) {
  const raw = readText(p);
  return safeJsonParse(raw, p);
}

function ensureDirSafe(root, p) {
  const full = path.resolve(p);
  const r = path.resolve(root);
  if (!full.startsWith(r)) {
    throw new EngineError("PATH_TRAVERSAL", "Unsafe path outside rules root", { root: r, path: full });
  }
  return full;
}

module.exports = { exists, readText, readJson, ensureDirSafe };
