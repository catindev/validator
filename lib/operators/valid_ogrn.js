const { outcome } = require("../outcome");
const { get, assertFieldName } = require("./path");

function digits(s) { return String(s).replace(/\D/g, ""); }
function allSame(s) { return /^([0-9])\1+$/.test(s); }

function isValidOgrn(d) {
  if (!(d.length === 13 || d.length === 15)) return { ok: false, reason: "length" };
  if (allSame(d)) return { ok: false, reason: "all_same" };
  if (!/^\d+$/.test(d)) return { ok: false, reason: "nan" };

  if (d.length === 13) {
    const n = BigInt(d.slice(0, 12));
    const mod = n % 11n;
    const c = Number(mod % 10n);
    return { ok: c === Number(d[12]), reason: "checksum13" };
  }
  const n = BigInt(d.slice(0, 14));
  const mod = n % 13n;
  const c = Number(mod % 10n);
  return { ok: c === Number(d[14]), reason: "checksum15" };
}

module.exports = function valid_ogrn(ctx, rule) {
  const field = rule.field;
  assertFieldName(field);

  const v = get(ctx.payload, field);
  if (v == null || String(v).trim() === "") return [];
  const d = digits(v);
  const r = isValidOgrn(d);
  if (r.ok) return [];
  return [outcome(rule.level || "ERROR", rule.code || "OGRN_INVALID", rule.message || "ОГРН/ОГРНИП некорректен", {
    field,
    rule_id: ctx.ruleId,
    details: { reason: r.reason, digits: d }
  })];
};
