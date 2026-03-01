const { outcome } = require("../outcome");
const { get, assertFieldName } = require("./path");

function parseComparable(value) {
  if (value == null) return { type: "null", value: null };

  // Special tokens (keep engine pure: token expands deterministically at runtime time)
  // $today => start of next day (exclusive upper bound for "not in future" checks)
  // $now   => current instant
  if (typeof value === "string") {
    const s = value.trim();
    if (s === "$today") {
      const d = new Date();
      d.setHours(0, 0, 0, 0);
      d.setDate(d.getDate() + 1);
      return { type: "date", value: d.getTime(), repr: "$today(+1d@00:00)" };
    }
    if (s === "$now") {
      return { type: "date", value: Date.now(), repr: "$now" };
    }

    // ISO date/datetime
    if (/^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2}:\d{2}(\.\d{1,3})?)?(Z|[+-]\d{2}:\d{2})?$/.test(s)) {
      const t = Date.parse(s);
      if (!Number.isNaN(t)) return { type: "date", value: t, repr: s };
    }

    // number string
    const n = Number(s.replace(",", "."));
    if (Number.isFinite(n)) return { type: "number", value: n, repr: s };
  }

  if (typeof value === "number" && Number.isFinite(value)) {
    return { type: "number", value, repr: String(value) };
  }

  return { type: "unknown", value, repr: typeof value };
}

function ensureSameType(a, b) {
  if (a.type === "number" && b.type === "number") return "number";
  if (a.type === "date" && b.type === "date") return "date";
  return null;
}


module.exports = function greater_than(ctx, rule) {
  const field = rule.field;
  assertFieldName(field);

  const v = get(ctx.payload, field);
  if (v == null) return [];

  const a = parseComparable(v);
  const b = parseComparable(rule.value);
  const t = ensureSameType(a, b);

  if (!t) {
    return [outcome("EXCEPTION", "RULE_INVALID", "greater_than requires comparable values (number-number or date-date)", {
      field,
      rule_id: ctx.ruleId,
      details: { actual: v, expected: rule.value, actualParsed: a, expectedParsed: b }
    })];
  }

  if (a.value > b.value) return [];

  return [outcome(rule.level || "ERROR", rule.code || "NOT_GREATER_THAN", rule.message || "Value must be greater than", {
    field,
    rule_id: ctx.ruleId,
    details: { minExclusive: b.repr || rule.value, actual: a.repr || v }
  })];
};
