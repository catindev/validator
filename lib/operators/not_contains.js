const { outcome } = require("../outcome");
const { get, assertFieldName } = require("./path");

module.exports = function not_contains(ctx, rule) {
  const field = rule.field;
  assertFieldName(field);

  const v = get(ctx.payload, field);
  if (v == null) return [];
  const needle = rule.value;
  if (typeof needle !== "string") {
    return [outcome("EXCEPTION", "RULE_INVALID", "not_contains requires string value", { field, rule_id: ctx.ruleId })];
  }
  const hay = String(v);
  if (!hay.includes(needle)) return [];
  return [outcome(rule.level || "ERROR", rule.code || "CONTAINS_FORBIDDEN", rule.message || "Value must not contain", {
    field,
    rule_id: ctx.ruleId,
    details: { needle }
  })];
};
