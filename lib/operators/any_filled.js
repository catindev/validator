const { outcome } = require("../outcome");
const { get, assertFieldName } = require("./path");
const { isFilledValue } = require("./common");

module.exports = function any_filled(ctx, rule) {
  const paths = rule.paths;
  if (!Array.isArray(paths) || paths.length === 0) {
    return [outcome("EXCEPTION", "RULE_INVALID", "any_filled requires paths[]", { rule_id: ctx.ruleId })];
  }
  for (const f of paths) assertFieldName(f);

  const ok = paths.some(f => isFilledValue(get(ctx.payload, f)));
  if (ok) return [];

  // field is optional here; keep null unless provided
  return [outcome(rule.level || "ERROR", rule.code || "ANY_REQUIRED", rule.message || "At least one field must be filled", {
    field: rule.field || null,
    rule_id: ctx.ruleId,
    details: { paths }
  })];
};
