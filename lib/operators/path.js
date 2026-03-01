const { EngineError } = require("../errors");

// Flat format: payload keys are "group.field" (exactly one dot).
function get(payload, field) {
  if (!field) return undefined;
  if (payload && Object.prototype.hasOwnProperty.call(payload, field)) return payload[field];

  // strict mode: do NOT support nested objects here; contract is flat.
  return undefined;
}

function assertFieldName(field) {
  if (typeof field !== "string" || field.trim() === "") throw new EngineError("FIELD_INVALID", "field must be non-empty string");
  const parts = field.split(".");
  if (parts.length !== 2) throw new EngineError("FIELD_FORMAT_INVALID", "field must be in format group.field (one dot)", { field });
  if (!parts[0] || !parts[1]) throw new EngineError("FIELD_FORMAT_INVALID", "field must be in format group.field (one dot)", { field });
  if (field.includes("..")) throw new EngineError("FIELD_FORMAT_INVALID", "field must be in format group.field (one dot)", { field });
  return true;
}

module.exports = { get, assertFieldName };
