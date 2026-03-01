const { readJson, exists } = require("./fs");
const { EngineError } = require("./errors");

function loadPipelineFile(pipelineFilePath) {
  if (!exists(pipelineFilePath)) throw new EngineError("PIPELINE_NOT_FOUND", `Pipeline not found: ${pipelineFilePath}`, { path: pipelineFilePath });
  const data = readJson(pipelineFilePath);

  // pipeline file can be either:
  // - array of steps (preferred)
  // - object with "steps": [...]
  if (Array.isArray(data)) return data;
  if (data && typeof data === "object" && Array.isArray(data.steps)) return data.steps;

  throw new EngineError("PIPELINE_INVALID", "Pipeline JSON must be an array of steps (or {steps:[]})", { path: pipelineFilePath });
}

module.exports = { loadPipelineFile };
