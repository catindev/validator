const { outcome } = require("../outcome");
const { get, assertFieldName } = require("./path");

function digits(s) { return String(s).replace(/\D/g, ""); }
function allSame(s) { return /^([0-9])\1+$/.test(s); }

function checksum(weights, arr) {
  let sum = 0;
  for (let i = 0; i < weights.length; i++) sum += weights[i] * arr[i];
  return (sum % 11) % 10;
}

function isValidInn(d) {
  if (!(d.length === 10 || d.length === 12)) return { ok: false, reason: "length" };
  if (allSame(d)) return { ok: false, reason: "all_same" };
  if (!/^\d+$/.test(d)) return { ok: false, reason: "nan" };
  const arr = d.split("").map(x => Number(x));

  if (d.length === 10) {
    const c = checksum([2,4,10,3,5,9,4,6,8], arr);
    return { ok: c === arr[9], reason: "checksum10" };
  }
  const c11 = checksum([7,2,4,10,3,5,9,4,6,8], arr);
  const c12 = checksum([3,7,2,4,10,3,5,9,4,6,8], arr);
  return { ok: (c11 === arr[10]) && (c12 === arr[11]), reason: "checksum12" };
}

module.exports = function valid_inn(ctx, rule) {
  const field = rule.field;
  assertFieldName(field);

  const v = get(ctx.payload, field);
  if (v == null || String(v).trim() === "") return [];
  const d = digits(v);
  const r = isValidInn(d);
  if (r.ok) return [];
  return [outcome(rule.level || "ERROR", rule.code || "INN_INVALID", rule.message || "ИНН некорректен", {
    field,
    rule_id: ctx.ruleId,
    details: { reason: r.reason, digits: d }
  })];
};
