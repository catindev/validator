const path = require("path");
const { EngineError } = require("./errors");

function parseRef(ref) {
  if (typeof ref !== "string" || ref.trim() === "") throw new EngineError("IMPORT_FORMAT_INVALID", "Empty ref in rule/pipeline", { ref });

  const parts = ref.split(".");
  // local: name
  if (parts.length === 1) return { kind: "local", name: parts[0] };

  const ns = parts[0];
  if (ns !== "library" && ns !== "libriary") {
    throw new EngineError("IMPORT_FORMAT_INVALID", "Only library.* namespace is supported for non-local refs", { ref });
  }

  if (parts.length === 2) return { kind: "library", group: null, name: parts[1] };
  if (parts.length === 3) return { kind: "library", group: parts[1], name: parts[2] };

  throw new EngineError("IMPORT_FORMAT_INVALID", "Too deep library namespace (only one group allowed)", { ref });
}

function createResolver({ rulesRoot, pipelineVersion, libraryVersion }) {
  // Root pipeline folder: /rules/pipelines/{pipelineVersion}/{pipelineName}/{pipelineVersion}/index.json
  function rootPipelineIndexPath(pipelineName, versionOverride) {
    const v = String(versionOverride ?? pipelineVersion);
    return path.join(rulesRoot, "pipelines", v, pipelineName, v, "index.json");
  }

  function localFilePath(currentPipelineDir, name) {
    // local sub pipeline or rule file: name.json
    return path.join(currentPipelineDir, `${name}.json`);
  }

  function libraryFilePath(group, name) {
    const v = String(libraryVersion);
    const base = path.join(rulesRoot, "library", v);
    return group ? path.join(base, group, `${name}.json`) : path.join(base, `${name}.json`);
  }

  function resolveStepFile(step, currentPipelineDir) {
    if (step.rule) {
      const p = parseRef(step.rule);
      if (p.kind === "local") return { type: "rule", path: localFilePath(currentPipelineDir, p.name), ref: step.rule };
      return { type: "rule", path: libraryFilePath(p.group, p.name), ref: step.rule };
    }
    if (step.pipeline) {
      const p = parseRef(step.pipeline);
      if (p.kind === "local") return { type: "pipeline", path: localFilePath(currentPipelineDir, p.name), ref: step.pipeline };
      return { type: "pipeline", path: libraryFilePath(p.group, p.name), ref: step.pipeline };
    }
    throw new EngineError("STEP_FORMAT_INVALID", "Step must have rule or pipeline", { step });
  }

  return { rootPipelineIndexPath, resolveStepFile };
}

module.exports = { createResolver };
