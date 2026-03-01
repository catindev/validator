class EngineError extends Error {
  constructor(code, message, details) {
    super(message);
    this.name = "EngineError";
    this.code = code;
    this.details = details || null;
  }
}

module.exports = { EngineError };
