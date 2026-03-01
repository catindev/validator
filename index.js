#!/usr/bin/env node
const path = require("path");
const fs = require("fs");
const { EngineError } = require("./lib/errors");
const { loadManifest } = require("./lib/manifest");
const { createDictionaryProvider } = require("./lib/dictionaries");
const { createResolver } = require("./lib/resolver");
const { createEngine } = require("./lib/engine");
const { createDslValidator } = require("./lib/dsl_validator");

function printUsage() {
  console.error("Usage:");
  console.error("  node index.js /pipeline_name [body.json]");
  console.error("  node index.js /pipeline_name/{version} [body.json]");
  console.error("  node index.js /pipeline_name/{version} --body=body.json");
}

function parseArgs(argv) {
  const args = argv.slice(2);
  if (args.length < 1) return null;

  const pipelineArg = args[0];
  const bodyArg = args.slice(1).find(a => a && !a.startsWith("--")) || null;
  const bodyFlag = args.slice(1).find(a => a && a.startsWith("--body="));
  const bodyPath = bodyFlag ? bodyFlag.split("=", 2)[1] : bodyArg;

  return { pipelineArg, bodyPath };
}

function parsePipelineArg(pipelineArg) {
  // "/name" or "/name/1"
  if (typeof pipelineArg !== "string" || !pipelineArg.startsWith("/")) {
    throw new EngineError("ARG_INVALID", "First argument must be /pipeline_name or /pipeline_name/{version}", { pipelineArg });
  }
  const parts = pipelineArg.split("/").filter(Boolean);
  if (parts.length === 0 || parts.length > 2) {
    throw new EngineError("ARG_INVALID", "Invalid pipeline arg format", { pipelineArg });
  }
  const name = parts[0];
  const version = parts.length === 2 ? Number(parts[1]) : null;
  if (parts.length === 2 && !Number.isFinite(version)) {
    throw new EngineError("ARG_INVALID", "Pipeline version must be a number", { pipelineArg });
  }
  return { name, version };
}

function readBody(bodyPath) {
  if (!bodyPath) return {};
  const p = path.resolve(process.cwd(), bodyPath);
  const raw = fs.readFileSync(p, "utf-8");
  return JSON.parse(raw);
}

(async function main() {
  try {
    const parsed = parseArgs(process.argv);
    if (!parsed) { printUsage(); process.exit(1); }

    const { name: pipelineName, version } = parsePipelineArg(parsed.pipelineArg);

    const rulesRoot = path.join(__dirname, "rules");
    const manifest = loadManifest(rulesRoot);

    const dictionaries = createDictionaryProvider({ rulesRoot, dictionariesVersion: manifest.dictionaries_version });
    const resolver = createResolver({
      rulesRoot,
      pipelineVersion: manifest.pipelines_version,
      libraryVersion: manifest.library_version
    });

    const dslValidator = createDslValidator({ resolver });

    const engine = createEngine({
      rulesRoot,
      dictionaries,
      resolver,
      dslValidator,
      limits: {
        max_depth: manifest.max_depth || 25,
        max_rules: manifest.max_rules || 5000,
        max_execution_time: manifest.max_execution_time || 3000
      }
    });

    const payload = readBody(parsed.bodyPath);
    const result = await engine.execute({ pipelineName, pipelineVersionOverride: version, payload, manifest });
    process.stdout.write(JSON.stringify(result, null, 2) + "\n");
    process.exit(result.status === "OK" ? 0 : 2);
  } catch (e) {
    const err = e;
    const code = err && err.code ? err.code : "UNHANDLED";
    const out = {
      status: "EXCEPTION",
      errors: [{
        level: "EXCEPTION",
        code,
        message: err && err.message ? err.message : String(err),
        field: null,
        rule_id: "engine",
        details: err && err.details ? err.details : null
      }],
      warnings: [],
      meta: null
    };
    process.stderr.write(JSON.stringify(out, null, 2) + "\n");
    process.exit(1);
  }
})();
