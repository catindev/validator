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
 * - referenced file must exist
 * - referenced file must be valid type:
 *    - rule step -> JSON object with operator
 *    - pipeline step -> JSON array (or {steps:[]})
 *
 * Additional strictness:
 * - inside group, BLOCK/EXCEPTION rules are forbidden by DECLARATION:
 *   a) rule with level BLOCK/EXCEPTION
 *   b) pipeline that contains such rules (transitively)
 *
 * This validator runs BEFORE execution so errors are deterministic.
 */
function createDslValidator({ resolver }) {
  const checkedRules = new Map();     // ruleFilePath -> { level }
  const checkedPipelines = new Map(); // pipelineFilePath -> { containsBlocked: bool, containsException: bool }

  function stepKeysOk(step) {
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
    return k;
  }

  function getRuleDeclLevel(ruleFilePath) {
    if (checkedRules.has(ruleFilePath)) return checkedRules.get(ruleFilePath);
    const rule = loadRuleFile(ruleFilePath);
    const level = rule.level || "ERROR";
    const info = { level: String(level).toUpperCase() };
    checkedRules.set(ruleFilePath, info);
    return info;
  }

  function scanPipelineForForbiddenLevels(pipelineFilePath, stack) {
    if (checkedPipelines.has(pipelineFilePath)) return checkedPipelines.get(pipelineFilePath);
    const st = stack || [];
    if (st.includes(pipelineFilePath)) {
      throw new EngineError("PIPELINE_CYCLE", "Pipeline import cycle detected during validation", { stack: st.concat([pipelineFilePath]) });
    }

    const steps = loadPipelineFile(pipelineFilePath);
    const dir = path.dirname(pipelineFilePath);

    let containsBlocked = false;
    let containsException = false;

    for (const s of steps) {
      if (Array.isArray(s)) {
        // group: scan items
        for (const g of s) {
          const k = validateStep(g, dir, true, st.concat([pipelineFilePath]));
          // validateStep returns stats when k is pipeline scan; but we keep global flags anyway
          if (k && k.containsBlocked) containsBlocked = true;
          if (k && k.containsException) containsException = true;
        }
        continue;
      }
      const k = validateStep(s, dir, false, st.concat([pipelineFilePath]));
      if (k && k.containsBlocked) containsBlocked = true;
      if (k && k.containsException) containsException = true;
    }

    const info = { containsBlocked, containsException };
    checkedPipelines.set(pipelineFilePath, info);
    return info;
  }

  function validateStep(step, currentPipelineDir, inGroup, stack) {
    if (Array.isArray(step)) {
      // nested group: everything inside is inGroup
      for (const s of step) validateStep(s, currentPipelineDir, true, stack);
      return null;
    }
    if (!isObject(step)) {
      throw new EngineError("STEP_FORMAT_INVALID", "Step must be an object or array (group)", { step });
    }

    stepKeysOk(step);

    const resolved = resolver.resolveStepFile(step, currentPipelineDir);
    if (!exists(resolved.path)) {
      throw new EngineError("PIPELINE_NOT_FOUND", `Referenced ${resolved.type} not found`, { ref: resolved.ref, path: resolved.path });
    }

    if (resolved.type === "rule") {
      const info = getRuleDeclLevel(resolved.path);
      if (inGroup && (info.level === "BLOCK" || info.level === "EXCEPTION")) {
        throw new EngineError("GROUP_FORBIDS_LEVEL", "BLOCK/EXCEPTION rules are forbidden inside group", {
          ref: resolved.ref,
          path: resolved.path,
          level: info.level
        });
      }
      return { containsBlocked: info.level === "BLOCK", containsException: info.level === "EXCEPTION" };
    }

    // pipeline
    const pinfo = scanPipelineForForbiddenLevels(resolved.path, stack || []);
    if (inGroup && (pinfo.containsBlocked || pinfo.containsException)) {
      throw new EngineError("GROUP_FORBIDS_LEVEL", "Pipeline contains BLOCK/EXCEPTION rules and cannot be used inside group", {
        ref: resolved.ref,
        path: resolved.path,
        containsBlocked: pinfo.containsBlocked,
        containsException: pinfo.containsException
      });
    }
    return pinfo;
  }

  function validatePipelineFile(pipelineFilePath) {
    const steps = loadPipelineFile(pipelineFilePath);
    const dir = path.dirname(pipelineFilePath);
    for (const s of steps) {
      if (Array.isArray(s)) {
        for (const g of s) validateStep(g, dir, true, [pipelineFilePath]);
      } else {
        validateStep(s, dir, false, [pipelineFilePath]);
      }
    }
  }

  return { validatePipelineFile };
}

module.exports = { createDslValidator };
