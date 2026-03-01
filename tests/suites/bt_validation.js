const path = require("path");
const fs = require("fs");
const { assert, runEngine } = require("../lib/utils");

function projectRoot() { return path.resolve(__dirname, "..", ".."); }

function mustBeExecutable(pipeline, body) {
  const { parsed } = runEngine([`/${pipeline}`, body], projectRoot());
  // If rule schema is incompatible with engine (RULE_INVALID), fail hard with guidance.
  if (parsed.status === "EXCEPTION" && parsed.errors && parsed.errors[0] && parsed.errors[0].code === "RULE_INVALID") {
    const e = parsed.errors[0];
    throw new Error(
      `Pipeline '${pipeline}' is not executable: RULE_INVALID in rule_id=${e.rule_id}.\n` +
      `Message: ${e.message}.\n` +
      `Fix rule JSON to match current operator contract (per dopik), then rerun tests.`
    );
  }
  return parsed;
}

function expectHasError(res, predicate, msg) {
  assert(res.errors && res.errors.length > 0, "Expected errors array");
  assert(res.errors.some(predicate), msg);
}

async function runBtSuite() {
  console.log("\n== Suite 2: BT validation (pre-ABS) pipelines ==");

  const fixtures = "tests/fixtures/bt";
  const types = [
    ["ul_resident", `${fixtures}/ul_resident_missing_inn.json`],
    ["ul_nonresident", `${fixtures}/ul_nonresident_missing_latname.json`],
    ["ip_resident", `${fixtures}/ip_resident_missing_ogrnip.json`],
    ["ip_nonresident", `${fixtures}/ip_nonresident_missing_inn_kio.json`],
    ["fl_resident", `${fixtures}/fl_resident_missing_birth_date.json`],
    ["fl_nonresident", `${fixtures}/fl_nonresident_missing_id_type.json`]
  ];

  // 0) Executability gate for each pipeline
  for (const [pipe, body] of types) {
    mustBeExecutable(pipe, body);
  }

  // 1) Each pipeline should reject incomplete payloads (status not OK)
  for (const [pipe, body] of types) {
    const res = mustBeExecutable(pipe, body);
    assert(res.status !== "OK", `Expected non-OK for negative fixture in ${pipe}`);
  }

  // 2) Contact requirement for UL: no contacts -> should produce an error mentioning contacts.* paths
  {
    const res = mustBeExecutable("ul_resident", `${fixtures}/ul_resident_no_contacts.json`);
    expectHasError(res,
      (e) => e.rule_id && String(e.rule_id).includes("contacts") || (e.details && e.details.paths && e.details.paths.some(p => String(p).startsWith("contacts."))),
      "Expected a contacts-related error (at least one contact)"
    );
  }

  console.log("✅ BT validation suite passed (structure + key invariants)");
}

module.exports = { runBtSuite };
