const { outcome } = require("../outcome");
const { get, assertFieldName } = require("./path");
const { isEmptyValue } = require("./common");

module.exports = function is_empty(ctx, rule) {
  const field = rule.field;
  assertFieldName(field);

  const v = get(ctx.payload, field);
  if (isEmptyValue(v)) return [];
  return [outcome(rule.level || "ERROR", rule.code || "MUST_BE_EMPTY", rule.message || "Field must be empty", {
    field,
    rule_id: ctx.ruleId,
    details: { expected: "empty" }
  })];
};
