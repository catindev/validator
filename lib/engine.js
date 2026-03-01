const path = require("path");
const { EngineError } = require("./errors");
const { loadPipelineFile } = require("./pipeline_loader");
const { loadRuleFile } = require("./rule_loader");
const { getOperator } = require("./operators");
const { stableSortOutcomes } = require("./utils");
const { outcome } = require("./outcome");

function createEngine({ rulesRoot, dictionaries, resolver, dslValidator, limits }) {
  const maxDepth = (limits && limits.max_depth) || 25;
  const maxRules = (limits && limits.max_rules) || 5000;
  const validatedPipelines = new Set();
  const maxExecutionTime = (limits && limits.max_execution_time) || 3000;

  async function runPipelineFile(pipelineFilePath, ctx, depth) {
    if (depth > maxDepth) throw new EngineError("MAX_DEPTH", `Max pipeline depth exceeded: ${maxDepth}`, { maxDepth });
    if (dslValidator && !validatedPipelines.has(pipelineFilePath)) {
  dslValidator.validatePipelineFile(pipelineFilePath);
  validatedPipelines.add(pipelineFilePath);
}
const steps = loadPipelineFile(pipelineFilePath);
    const currentPipelineDir = path.dirname(pipelineFilePath);

    const results = [];
    for (let i = 0; i < steps.length; i++) {
      ctx.current_step = { file: pipelineFilePath, index: i };
      const step = steps[i];
      const out = await runStep(step, currentPipelineDir, ctx, depth);
      results.push(...out);

      // stop conditions
      if (out.some(o => o.level === "EXCEPTION" || o.level === "BLOCK")) return results;

      // global limits
      ctx._ruleCount += out.filter(o => o.rule_id).length;
      if (ctx._ruleCount > maxRules) {
        results.push(outcome("EXCEPTION", "MAX_RULES", `Max rules exceeded: ${maxRules}`, { rule_id: "engine.limits" }));
        return results;
      }
      if (Date.now() - ctx._startedAt > maxExecutionTime) {
        results.push(outcome("EXCEPTION", "MAX_EXECUTION_TIME", `Max execution time exceeded: ${maxExecutionTime}ms`, { rule_id: "engine.limits" }));
        return results;
      }
    }
    return results;
  }

  async function runStep(step, currentPipelineDir, ctx, depth) {
    // group is an array
    if (Array.isArray(step)) {
      const groupOut = [];
      for (const s of step) {
        const out = await runStep(s, currentPipelineDir, ctx, depth + 1);
        // forbid BLOCK/EXCEPTION inside group (as per earlier constraint)
        const stop = out.find(o => o.level === "EXCEPTION" || o.level === "BLOCK");
        if (stop) {
          return [outcome("EXCEPTION", "STOP_IN_GROUP", "BLOCK/EXCEPTION is not allowed inside group", {
            rule_id: "engine.group",
            details: { offending: stop }
          })];
        }
        groupOut.push(...out);
      }
      return groupOut;
    }

    // step must be object with rule or pipeline
    if (!step || typeof step !== "object") {
      return [outcome("EXCEPTION", "STEP_FORMAT_INVALID", "Step must be an object, an array (group), or a string is not allowed", { rule_id: "engine.dsl" })];
    }

    // allow shorthand string? No, per spec we keep strict.
    if (!("rule" in step) && !("pipeline" in step)) {
      return [outcome("EXCEPTION", "STEP_FORMAT_INVALID", "Step must contain rule or pipeline", { rule_id: "engine.dsl", details: { step } })];
    }
    if ("rule" in step && "pipeline" in step) {
      return [outcome("EXCEPTION", "STEP_FORMAT_INVALID", "Step cannot contain both rule and pipeline", { rule_id: "engine.dsl", details: { step } })];
    }

    const resolved = resolver.resolveStepFile(step, currentPipelineDir);

    if (resolved.type === "pipeline") {
      // cycle detection: based on file path stack
      if (ctx._stack.includes(resolved.path)) {
        throw new EngineError("PIPELINE_CYCLE", "Pipeline import cycle detected", { stack: ctx._stack.concat([resolved.path]) });
      }
      ctx._stack.push(resolved.path);
      try {
        return await runPipelineFile(resolved.path, ctx, depth + 1);
      } finally {
        ctx._stack.pop();
      }
    }

    // rule
    const ruleObj = loadRuleFile(resolved.path);

    const opName = ruleObj.operator;
    const op = getOperator(opName);
    if (!op) {
      return [outcome("EXCEPTION", "OPERATOR_UNKNOWN", `Unknown operator: ${opName}`, { rule_id: ctx.ruleId, details: { operator: opName, file: resolved.path } })];
    }

    // merge step-level overrides? we keep strict: step is only {rule:"..."} and all params in file.
    const ruleId = ruleObj.rule_id || resolved.ref || path.basename(resolved.path, ".json");
    const ruleCtx = {
      payload: ctx.payload,
      dictionaries,
      ruleId
    };

    const outs = op(ruleCtx, ruleObj) || [];
    // normalize rule_id if operator forgot it
    return outs.map(o => Object.assign({}, o, { rule_id: o.rule_id || ruleId }));
  }

  async function execute({ pipelineName, pipelineVersionOverride, payload, manifest }) {
    const version = pipelineVersionOverride ?? manifest.pipelines_version;
    const indexPath = resolver.rootPipelineIndexPath(pipelineName, version);

    const ctx = {
      payload,
      _startedAt: Date.now(),
      _ruleCount: 0,
      _stack: [indexPath],
      current_step: null
    };

    const outcomes = await runPipelineFile(indexPath, ctx, 0);
    const sorted = stableSortOutcomes(outcomes);

    const errors = sorted.filter(o => o.level === "ERROR" || o.level === "BLOCK" || o.level === "EXCEPTION");
    const warnings = sorted.filter(o => o.level === "WARNING");

    let status = "OK";
    if (sorted.some(o => o.level === "EXCEPTION")) status = "EXCEPTION";
    else if (sorted.some(o => o.level === "BLOCK")) status = "BLOCK";
    else if (sorted.some(o => o.level === "ERROR")) status = "ERRORS";

    return {
      status,
      errors,
      warnings,
      meta: {
        pipeline: pipelineName,
        pipeline_version: String(version),
        dictionaries_version: String(manifest.dictionaries_version),
        library_version: String(manifest.library_version)
      }
    };
  }

  return { execute };
}

module.exports = { createEngine };
