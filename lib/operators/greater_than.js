const { outcome } = require("../outcome");
const { get, assertFieldName } = require("./path");
const { toNumber } = require("../utils");

module.exports = function greater_than(ctx, rule) {
  const field = rule.field;
  assertFieldName(field);

  const v = get(ctx.payload, field);
  if (v == null) return [];
  const a = toNumber(v);
  const b = toNumber(rule.value);
  if (!Number.isFinite(a) || !Number.isFinite(b)) {
    return [outcome("EXCEPTION", "RULE_INVALID", "greater_than requires numeric comparable values", { field, rule_id: ctx.ruleId, details: { actual: v, expected: rule.value } })];
  }
  if (a > b) return [];
  return [outcome(rule.level || "ERROR", rule.code || "NOT_GREATER_THAN", rule.message || "Value must be greater than", {
    field,
    rule_id: ctx.ruleId,
    details: { minExclusive: b, actual: a }
  })];
};
