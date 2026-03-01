const { outcome } = require("../outcome");
const { get, assertFieldName } = require("./path");

module.exports = function in_dictionary(ctx, rule) {
  const field = rule.field;
  const dictName = rule.dictionary || rule.value;
  assertFieldName(field);

  if (typeof dictName !== "string" || dictName.trim() === "") {
    return [outcome("EXCEPTION", "RULE_INVALID", "in_dictionary requires dictionary (or value) name", { field, rule_id: ctx.ruleId })];
  }

  const v = get(ctx.payload, field);
  if (v == null || String(v).trim() === "") return [];

  const dict = ctx.dictionaries.getDictionary(dictName);
  const key = String(v);

  let ok = false;
  if (Array.isArray(dict)) ok = dict.includes(key);
  else if (dict && typeof dict === "object") ok = Object.prototype.hasOwnProperty.call(dict, key);

  if (ok) return [];
  return [outcome(rule.level || "ERROR", rule.code || "NOT_IN_DICTIONARY", rule.message || "Value is not allowed", {
    field,
    rule_id: ctx.ruleId,
    details: { dictionary: dictName }
  })];
};
