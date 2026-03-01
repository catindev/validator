const path = require("path");
const fs = require("fs");
const { readJson, writeJson, rmrf, assert, deepEqual, runEngine } = require("../lib/utils");

function projectRoot() { return path.resolve(__dirname, "..", ".."); }
function rulesRoot() { return path.join(projectRoot(), "rules"); }
function manifest() { return readJson(path.join(rulesRoot(), "manifest.json")); }
function pv() { return String(manifest().pipelines_version); }
function lv() { return String(manifest().library_version); }

/**
 * Creates a minimal self-contained pipeline under rules/pipelines/<pv>/_engine_tests/<pv>/index.json
 * and local rule files in the same folder. This avoids depending on existing business rules.
 */
function createLocalTestPipeline() {
  const base = path.join(rulesRoot(), "pipelines", pv(), "_engine_tests", pv());
  rmrf(path.join(rulesRoot(), "pipelines", pv(), "_engine_tests"));
  fs.mkdirSync(base, { recursive: true });

  // local rule: require beneficiary.type
  writeJson(path.join(base, "r_not_empty.json"), {
    "rule_id": "local.r_not_empty",
    "operator": "not_empty",
    "level": "ERROR",
    "code": "TYPE_REQUIRED",
    "message": "type required",
    "field": "beneficiary.type"
  });

  // local rule: equals UL_RESIDENT
  writeJson(path.join(base, "r_equals.json"), {
    "rule_id": "local.r_equals",
    "operator": "equals",
    "level": "ERROR",
    "code": "TYPE_EXPECTED",
    "message": "type must be UL_RESIDENT",
    "field": "beneficiary.type",
    "value": "UL_RESIDENT"
  });

  // pipeline uses local rules by short name (no dot)
  writeJson(path.join(base, "index.json"), [
    { "rule": "r_not_empty" },
    { "rule": "r_equals" }
  ]);

  return base;
}

async function runEngineSuite() {
  console.log("\n== Suite 1: Engine core features (tailored) ==");

  const base = createLocalTestPipeline();

  const okBody = "tests/fixtures/engine/body_ok.json";
  const badBody = "tests/fixtures/engine/body_bad.json";

  // 1) Happy path: returns OK when type matches
  {
    const { parsed } = runEngine([`/_engine_tests/${pv()}`, okBody], projectRoot());
    assert(parsed.status === "OK", "Expected OK for matching type");
  }

  // 2) Negative: wrong type -> ERRORS with TYPE_EXPECTED
  {
    const { parsed } = runEngine([`/_engine_tests/${pv()}`, badBody], projectRoot());
    assert(parsed.status === "ERRORS", "Expected ERRORS for wrong type");
    assert(parsed.errors[0].code === "TYPE_EXPECTED", "Expected TYPE_EXPECTED");
  }

  // 3) Determinism
  {
    const a = runEngine([`/_engine_tests/${pv()}`, badBody], projectRoot()).parsed;
    const b = runEngine([`/_engine_tests/${pv()}`, badBody], projectRoot()).parsed;
    assert(deepEqual(a, b), "Expected deterministic output");
  }

  // 4) Pipeline not found -> PIPELINE_NOT_FOUND
  {
    const { parsed } = runEngine(["/no_such_pipeline", okBody], projectRoot());
    assert(parsed.status === "EXCEPTION", "Expected EXCEPTION");
    assert(parsed.errors[0].code === "PIPELINE_NOT_FOUND", "Expected PIPELINE_NOT_FOUND");
  }

  // 5) Non-library dotted ref should error IMPORT_FORMAT_INVALID
  {
    const testDir = path.join(rulesRoot(), "pipelines", pv(), "_engine_tests", pv());
    writeJson(path.join(testDir, "index.json"), [ { "rule": "common.contacts_any" } ]);
    const { parsed } = runEngine([`/_engine_tests/${pv()}`, okBody], projectRoot());
    assert(parsed.status === "EXCEPTION", "Expected EXCEPTION");
    assert(parsed.errors[0].code === "IMPORT_FORMAT_INVALID", "Expected IMPORT_FORMAT_INVALID");
  }

  // 6) Group forbids BLOCK/EXCEPTION by declaration
  // Use any existing BLOCK rule if present in library; else create a local BLOCK rule.
  {
    const libBlock = path.join(rulesRoot(), "library", lv(), "tax", "blk_tin_country_usa.json");
    const testDir = path.join(rulesRoot(), "pipelines", pv(), "_engine_tests", pv());
    if (!fs.existsSync(libBlock)) {
      writeJson(path.join(testDir, "r_block.json"), {
        "rule_id": "local.r_block",
        "operator": "not_empty",
        "level": "BLOCK",
        "code": "BLOCKED",
        "message": "blocked",
        "field": "x.y"
      });
      writeJson(path.join(testDir, "index.json"), [ [ { "rule": "r_block" } ] ]);
    } else {
      writeJson(path.join(testDir, "index.json"), [ [ { "rule": "libriary.tax.blk_tin_country_usa" } ] ]);
    }
    const { parsed } = runEngine([`/_engine_tests/${pv()}`, okBody], projectRoot());
    assert(parsed.status === "EXCEPTION", "Expected EXCEPTION");
    assert(parsed.errors[0].code === "GROUP_FORBIDS_LEVEL", "Expected GROUP_FORBIDS_LEVEL");
  }

  // 7) Pipeline cycle detection (library pipelines) - create in library/_engine_tests
  {
    const libDir = path.join(rulesRoot(), "library", lv(), "_engine_tests");
    rmrf(libDir);
    fs.mkdirSync(libDir, { recursive: true });
    writeJson(path.join(libDir, "a.json"), [{ "pipeline": "libriary._engine_tests.b" }]);
    writeJson(path.join(libDir, "b.json"), [{ "pipeline": "libriary._engine_tests.a" }]);

    const testDir = path.join(rulesRoot(), "pipelines", pv(), "_engine_tests", pv());
    writeJson(path.join(testDir, "index.json"), [ [ { "pipeline": "libriary._engine_tests.a" } ] ]);

    const { parsed } = runEngine([`/_engine_tests/${pv()}`, okBody], projectRoot());
    assert(parsed.status === "EXCEPTION", "Expected EXCEPTION");
    assert(parsed.errors[0].code === "PIPELINE_CYCLE", "Expected PIPELINE_CYCLE");
    rmrf(libDir);
  }

  // cleanup
  rmrf(path.join(rulesRoot(), "pipelines", pv(), "_engine_tests"));
  console.log("✅ Engine core suite passed");
}

module.exports = { runEngineSuite };
