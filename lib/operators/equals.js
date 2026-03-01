const { outcome } = require("../outcome");
const { get, assertFieldName } = require("./path");

module.exports = function equals(ctx, rule) {
  const field = rule.field;
  assertFieldName(field);

  const v = get(ctx.payload, field);
  if (v === rule.value) return [];
  return [outcome(rule.level || "ERROR", rule.code || "NOT_EQUAL", rule.message || "Value must equal", {
    field,
    rule_id: ctx.ruleId,
    details: { expected: rule.value, actual: v }
  })];
};
