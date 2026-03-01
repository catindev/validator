const { runEngineSuite } = require("./engine_core");
const { runBtSuite } = require("./bt_validation");

async function runAll() {
  await runEngineSuite();
  await runBtSuite();
}
module.exports = { runAll };
