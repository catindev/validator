const path = require("path");
const { readJson, exists } = require("./fs");
const { EngineError } = require("./errors");
const { isObject } = require("./utils");

function loadRuleFile(ruleFilePath) {
  if (!exists(ruleFilePath)) throw new EngineError("RULE_NOT_FOUND", `Rule not found: ${ruleFilePath}`, { path: ruleFilePath });
  const obj = readJson(ruleFilePath);
  if (!isObject(obj)) throw new EngineError("RULE_INVALID", "Rule JSON must be an object", { path: ruleFilePath });

  // Minimal required: operator
  if (typeof obj.operator !== "string" || obj.operator.trim() === "") {
    throw new EngineError("RULE_INVALID", "Rule JSON missing operator", { path: ruleFilePath });
  }
  return obj;
}

module.exports = { loadRuleFile };
