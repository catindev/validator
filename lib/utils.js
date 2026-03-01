function isObject(x) { return x && typeof x === "object" && !Array.isArray(x); }

function isBlankString(x) { return typeof x === "string" && x.trim() === ""; }

function toNumber(x) {
  if (typeof x === "number") return x;
  if (typeof x === "string" && x.trim() !== "") {
    const n = Number(x);
    return Number.isFinite(n) ? n : NaN;
  }
  return NaN;
}

function safeJsonParse(str, filePath) {
  try { return JSON.parse(str); } catch (e) {
    const err = new Error(`Invalid JSON in ${filePath}`);
    err.cause = e;
    throw err;
  }
}

function stableSortOutcomes(list) {
  const rank = { EXCEPTION: 0, BLOCK: 1, ERROR: 2, WARNING: 3 };
  return list.slice().sort((a, b) => {
    const r = (rank[a.level] ?? 99) - (rank[b.level] ?? 99);
    if (r) return r;
    const pa = a.field || "";
    const pb = b.field || "";
    if (pa !== pb) return pa < pb ? -1 : 1;
    const ca = a.code || "";
    const cb = b.code || "";
    if (ca !== cb) return ca < cb ? -1 : 1;
    const ra = a.rule_id || "";
    const rb = b.rule_id || "";
    if (ra !== rb) return ra < rb ? -1 : 1;
    const ma = a.message || "";
    const mb = b.message || "";
    if (ma !== mb) return ma < mb ? -1 : 1;
    return 0;
  });
}

module.exports = { isObject, isBlankString, toNumber, safeJsonParse, stableSortOutcomes };
