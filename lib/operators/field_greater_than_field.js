const { outcome } = require("../outcome");
const { get, assertFieldName } = require("./path");
const { toNumber } = require("../utils");

module.exports = function field_greater_than_field(ctx, rule) {
  const field = rule.field;
  const other = rule.value_field;
  assertFieldName(field);
  assertFieldName(other);

  const v1 = get(ctx.payload, field);
  const v2 = get(ctx.payload, other);
  if (v1 == null || v2 == null) return [];

  const d1 = Date.parse(String(v1));
  const d2 = Date.parse(String(v2));
  if (!Number.isNaN(d1) && !Number.isNaN(d2)) {
    if (d1 > d2) return [];
    return [outcome(rule.level || "ERROR", rule.code || "DATE_ORDER", rule.message || "field must be greater than value_field", {
      field,
      rule_id: ctx.ruleId,
      details: { field: v1, value_field: v2 }
    })];
  }

  const a = toNumber(v1);
  const b = toNumber(v2);
  if (!Number.isFinite(a) || !Number.isFinite(b)) {
    return [outcome("EXCEPTION", "RULE_INVALID", "field_greater_than_field requires comparable values (ISO date or numbers)", {
      field,
      rule_id: ctx.ruleId,
      details: { field: v1, value_field: v2 }
    })];
  }
  if (a > b) return [];
  return [outcome(rule.level || "ERROR", rule.code || "NOT_GREATER_THAN_FIELD", rule.message || "Value must be greater than other field", {
    field,
    rule_id: ctx.ruleId,
    details: { other, fieldValue: a, otherValue: b }
  })];
};
