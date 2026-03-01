const { outcome } = require("../outcome");
const { get, assertFieldName } = require("./path");

function truthy(v) {
  if (v === true) return true;
  if (v === false) return false;
  if (v == null) return false;
  const s = String(v).trim().toLowerCase();
  if (["true","1","y","yes","да","д","t"].includes(s)) return true;
  if (["false","0","n","no","нет","н","f"].includes(s)) return false;
  return false;
}

module.exports = function cross_check(ctx, rule) {
  const fields = rule.fields;
  const constraint = rule.constraint;
  if (!Array.isArray(fields) || fields.length === 0) {
    return [outcome("EXCEPTION", "RULE_INVALID", "cross_check requires fields[]", { rule_id: ctx.ruleId })];
  }
  for (const f of fields) assertFieldName(f);

  if (constraint !== "if_code_foreign_then_flag_must_be_true") {
    return [outcome("EXCEPTION", "RULE_INVALID", "cross_check unknown constraint", { rule_id: ctx.ruleId, details: { constraint } })];
  }

  // Expected: fields[0]=fatca.foreignid, fields[1]=id.type
  const flag = get(ctx.payload, fields[0]);
  const code = get(ctx.payload, fields[1]);
  if (code == null || String(code).trim() === "") return []; // no code => skip, required is separate

  const foreignCodes = new Set(["31","32","33","34","35","36","37","99"]);
  const c = String(code).trim();
  if (!foreignCodes.has(c)) return [];

  if (truthy(flag)) return [];
  return [outcome(rule.level || "ERROR", rule.code || "CROSS_CHECK_FAILED", rule.message || "Cross-check failed", {
    field: fields[0],
    rule_id: ctx.ruleId,
    details: { constraint, code: c, expected_flag: true }
  })];
};
