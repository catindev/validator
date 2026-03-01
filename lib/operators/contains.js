const { outcome } = require("../outcome");
const { get, assertFieldName } = require("./path");

module.exports = function contains(ctx, rule) {
  const field = rule.field;
  assertFieldName(field);

  const v = get(ctx.payload, field);
  if (v == null) return [];
  const needle = rule.value;
  if (typeof needle !== "string") {
    return [outcome("EXCEPTION", "RULE_INVALID", "contains requires string value", { field, rule_id: ctx.ruleId })];
  }
  const hay = String(v);
  if (hay.includes(needle)) return [];
  return [outcome(rule.level || "ERROR", rule.code || "NOT_CONTAINS", rule.message || "Value must contain", {
    field,
    rule_id: ctx.ruleId,
    details: { needle }
  })];
};
