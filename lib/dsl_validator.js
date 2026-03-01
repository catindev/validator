const path = require("path");
const { EngineError } = require("./errors");
const { loadPipelineFile } = require("./pipeline_loader");
const { loadRuleFile } = require("./rule_loader");
const { exists } = require("./fs");
const { isObject } = require("./utils");

/**
 * Strict DSL validation:
 * - step is either object with exactly one key: rule|pipeline
 * - or group: array of steps
 * - no strings / numbers / null
 * - library namespace depth validation happens in resolver.parseRef
 * - referenced file must exist
 * - referenced file must be valid type:
 *    - rule step -> JSON object with operator
 *    - pipeline step -> JSON array (or {steps:[]})
 *
 * This validator runs BEFORE execution so errors are deterministic.
 */
function createDslValidator({ resolver }) {
  function validateStep(step, currentPipelineDir) {
    if (Array.isArray(step)) {
      for (const s of step) validateStep(s, currentPipelineDir);
      return;
    }
    if (!isObject(step)) {
      throw new EngineError("STEP_FORMAT_INVALID", "Step must be an object or array (group)", { step });
    }

    const keys = Object.keys(step);
    if (keys.length !== 1) {
      throw new EngineError("STEP_FORMAT_INVALID", "Step must have exactly one key (rule|pipeline)", { step });
    }
    const k = keys[0];
    if (k !== "rule" && k !== "pipeline") {
      throw new EngineError("STEP_FORMAT_INVALID", "Step key must be rule or pipeline", { step });
    }

    const ref = step[k];
    if (typeof ref !== "string" || ref.trim() === "") {
      throw new EngineError("IMPORT_FORMAT_INVALID", "rule/pipeline ref must be non-empty string", { step });
    }

    const resolved = resolver.resolveStepFile(step, currentPipelineDir);
    if (!exists(resolved.path)) {
      throw new EngineError("PIPELINE_NOT_FOUND", `Referenced ${resolved.type} not found`, { ref: resolved.ref, path: resolved.path });
    }

    if (resolved.type === "rule") {
      loadRuleFile(resolved.path); // throws on invalid
      return;
    }
    // pipeline
    loadPipelineFile(resolved.path); // throws on invalid
  }

  function validatePipelineFile(pipelineFilePath) {
    const steps = loadPipelineFile(pipelineFilePath);
    const dir = path.dirname(pipelineFilePath);
    for (const s of steps) validateStep(s, dir);
  }

  return { validatePipelineFile };
}

module.exports = { createDslValidator };
