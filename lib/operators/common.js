const { isBlankString, isObject } = require("../utils");

function isEmptyValue(v) {
  if (v == null) return true;
  if (typeof v === "string") return v.trim() === "";
  if (Array.isArray(v)) return v.length === 0;
  if (isObject(v)) return Object.keys(v).length === 0;
  return false;
}

function isFilledValue(v) { return !isEmptyValue(v); }

module.exports = { isEmptyValue, isFilledValue };
