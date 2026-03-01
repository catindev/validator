const path = require("path");
const { readJson, exists } = require("./fs");
const { EngineError } = require("./errors");

function loadManifest(rulesRoot) {
  const p = path.join(rulesRoot, "manifest.json");
  if (!exists(p)) throw new EngineError("MANIFEST_NOT_FOUND", `manifest.json not found in ${rulesRoot}`, { path: p });

  const m = readJson(p);
  // Expected keys (minimal):
  // - dictionaries_version
  // - library_version
  // - pipelines_version
  if (m == null || typeof m !== "object") throw new EngineError("MANIFEST_INVALID", "manifest.json must be an object");
  if (m.dictionaries_version == null) throw new EngineError("DICTIONARIES_VERSION_MISSING", "manifest.json missing dictionaries_version");
  if (m.library_version == null) throw new EngineError("LIBRARY_VERSION_MISSING", "manifest.json missing library_version");
  if (m.pipelines_version == null) throw new EngineError("PIPELINES_VERSION_MISSING", "manifest.json missing pipelines_version");
  return m;
}

module.exports = { loadManifest };
