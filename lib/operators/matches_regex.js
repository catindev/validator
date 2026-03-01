const { outcome } = require("../outcome");
const { get, assertFieldName } = require("./path");

module.exports = function matches_regex(ctx, rule) {
  const field = rule.field;
  assertFieldName(field);

  const v = get(ctx.payload, field);
  if (v == null) return [];
  const s = String(v);

  const pattern = rule.value;
  const flags = rule.flags || "";
  if (typeof pattern !== "string" || pattern === "") {
    return [outcome("EXCEPTION", "RULE_INVALID", "matches_regex requires string value (pattern)", { field, rule_id: ctx.ruleId })];
  }
  const re = new RegExp(pattern, flags);
  if (re.test(s)) return [];
  return [outcome(rule.level || "ERROR", rule.code || "FORMAT", rule.message || "Invalid format", {
    field,
    rule_id: ctx.ruleId,
    details: { pattern, flags }
  })];
};
