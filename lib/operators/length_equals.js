const { outcome } = require("../outcome");
const { get, assertFieldName } = require("./path");

module.exports = function length_equals(ctx, rule) {
  const field = rule.field;
  assertFieldName(field);

  const v = get(ctx.payload, field);
  if (v == null) return []; // optional unless combined with not_empty
  const s = String(v);
  const n = Number(rule.value);
  if (!Number.isFinite(n)) {
    return [outcome("EXCEPTION", "RULE_INVALID", "length_equals requires numeric value", { field, rule_id: ctx.ruleId, details: { value: rule.value } })];
  }
  if (s.length === n) return [];
  return [outcome(rule.level || "ERROR", rule.code || "LENGTH", rule.message || `Length must be ${n}`, {
    field,
    rule_id: ctx.ruleId,
    details: { expected: n, actual: s.length }
  })];
};
