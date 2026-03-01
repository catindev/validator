const { outcome } = require("../outcome");
const { get, assertFieldName } = require("./path");

module.exports = function length_max(ctx, rule) {
  const field = rule.field;
  assertFieldName(field);

  const v = get(ctx.payload, field);
  if (v == null) return [];
  const s = String(v);
  const n = Number(rule.value);
  if (!Number.isFinite(n)) {
    return [outcome("EXCEPTION", "RULE_INVALID", "length_max requires numeric value", { field, rule_id: ctx.ruleId, details: { value: rule.value } })];
  }
  if (s.length <= n) return [];
  return [outcome(rule.level || "ERROR", rule.code || "LENGTH_MAX", rule.message || `Length must be <= ${n}`, {
    field,
    rule_id: ctx.ruleId,
    details: { max: n, actual: s.length }
  })];
};
