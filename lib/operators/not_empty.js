const { outcome } = require("../outcome");
const { get, assertFieldName } = require("./path");
const { isEmptyValue } = require("./common");

module.exports = function not_empty(ctx, rule) {
  const field = rule.field;
  assertFieldName(field);

  const v = get(ctx.payload, field);
  if (!isEmptyValue(v)) return [];
  return [outcome(rule.level || "ERROR", rule.code || "REQUIRED", rule.message || "Field is required", {
    field,
    rule_id: ctx.ruleId,
    details: { expected: "not_empty" }
  })];
};
