function outcome(level, code, message, opts) {
  const o = opts || {};
  return {
    level,
    code: code || null,
    message: message || null,
    field: o.field ?? null,
    rule_id: o.rule_id ?? null,
    details: o.details ?? null
  };
}

module.exports = { outcome };
