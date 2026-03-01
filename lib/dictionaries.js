const path = require("path");
const { readJson, exists } = require("./fs");
const { EngineError } = require("./errors");

function createDictionaryProvider({ rulesRoot, dictionariesVersion }) {
  const cache = new Map();

  function getDictionary(name) {
    const key = String(name);
    if (cache.has(key)) return cache.get(key);

    const p = path.join(rulesRoot, "dictionaries", String(dictionariesVersion), `${key}.json`);
    if (!exists(p)) throw new EngineError("DICTIONARY_NOT_FOUND", `Dictionary not found: ${key}`, { name: key, path: p, dictionariesVersion });

    const dict = readJson(p);
    cache.set(key, dict);
    return dict;
  }

  return { getDictionary };
}

module.exports = { createDictionaryProvider };
