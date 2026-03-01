const not_empty = require("./not_empty");
const is_empty = require("./is_empty");
const length_equals = require("./length_equals");
const length_max = require("./length_max");
const matches_regex = require("./matches_regex");
const not_matches_regex = require("./not_matches_regex");
const equals = require("./equals");
const not_equals = require("./not_equals");
const contains = require("./contains");
const not_contains = require("./not_contains");
const greater_than = require("./greater_than");
const less_than = require("./less_than");
const field_less_than_field = require("./field_less_than_field");
const field_greater_than_field = require("./field_greater_than_field");
const any_filled = require("./any_filled");
const in_dictionary = require("./in_dictionary");
const valid_inn = require("./valid_inn");
const valid_ogrn = require("./valid_ogrn");
const cross_check = require("./cross_check");
const OPERATORS = {
  not_empty,
  is_empty,
  length_equals,
  length_max,
  matches_regex,
  not_matches_regex,
  equals,
  not_equals,
  contains,
  not_contains,
  greater_than,
  less_than,
  field_less_than_field,
  field_greater_than_field,
  any_filled,
  in_dictionary,
  valid_inn,
  valid_ogrn,
  cross_check,
};

function getOperator(name) { return OPERATORS[name] || null; }

module.exports = { OPERATORS, getOperator };
