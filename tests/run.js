const { runAll } = require("./suites/all");
runAll()
  .then(() => { console.log("\n✅ ALL TESTS PASSED"); process.exit(0); })
  .catch((err) => { console.error("\n❌ TESTS FAILED"); console.error(err && err.stack ? err.stack : err); process.exit(1); });
