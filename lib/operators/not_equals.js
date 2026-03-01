const { outcome } = require("../outcome");
const { get, assertFieldName } = require("./path");

module.exports = function not_equals(ctx, rule) {
  const field = rule.field;
  assertFieldName(field);

  const v = get(ctx.payload, field);
  if (v !== rule.value) return [];
  return [outcome(rule.level || "ERROR", rule.code || "EQUALS_FORBIDDEN", rule.message || "Value must not equal", {
    field,
    rule_id: ctx.ruleId,
    details: { forbidden: rule.value }
  })];
};
