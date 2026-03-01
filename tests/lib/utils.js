const { spawnSync } = require("child_process");
const fs = require("fs");
const path = require("path");

function readJson(p) { return JSON.parse(fs.readFileSync(p, "utf8")); }
function writeJson(p, obj) {
  fs.mkdirSync(path.dirname(p), { recursive: true });
  fs.writeFileSync(p, JSON.stringify(obj, null, 2), "utf8");
}
function rmrf(p) { if (fs.existsSync(p)) fs.rmSync(p, { recursive: true, force: true }); }

function assert(cond, msg) { if (!cond) throw new Error(msg); }
function deepEqual(a, b) { return JSON.stringify(a) === JSON.stringify(b); }

function runEngine(args, cwd) {
  const proc = spawnSync(process.execPath, ["index.js", ...args], { cwd, encoding: "utf8" });
  if (proc.error) throw proc.error;

  const out = (proc.stdout || "").trim();
  const err = (proc.stderr || "").trim();
  const text = out || err; // engine may print JSON to stderr on exceptions

  if (!text) throw new Error("Empty stdout/stderr from engine.");
  let parsed;
  try { parsed = JSON.parse(text); }
  catch {
    throw new Error("Engine output is not JSON. stdout=\n" + out + "\n\nstderr=\n" + err);
  }
  return { parsed, stdout: out, stderr: err, code: proc.status };
}

module.exports = { readJson, writeJson, rmrf, assert, deepEqual, runEngine };
