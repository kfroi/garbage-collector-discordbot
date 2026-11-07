// Errors are plain built-in Error objects tagged with a `kind` (no custom classes).
// kinds: input | not_found | rate_limited | network | timeout | api | internal
function makeError(kind, message, extra = {}) {
  return Object.assign(new Error(message), { kind }, extra);
}

const inputError = (message, usage) => makeError('input', message, { usage });

module.exports = { makeError, inputError };
