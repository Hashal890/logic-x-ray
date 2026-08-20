// Deliberately conservative "evaluator" for the simulator's live variable
// panel. This is NOT a real interpreter — it recognizes literals and a
// handful of arithmetic/comparison shapes over already-tracked variables,
// and returns `undefined` (shown as "?" in the UI) for anything else,
// rather than guessing. Function calls, member/index access, and anything
// language-specific (f-strings, template literals, ...) are intentionally
// left unresolved — a wrong guess would be worse than an honest "?".

const NUMBER_RE = /^-?\d+(\.\d+)?$/;
const DQUOTE_RE = /^"([^"\\]*(\\.[^"\\]*)*)"$/;
const SQUOTE_RE = /^'([^'\\]*(\\.[^'\\]*)*)'$/;

const BINARY_OPS = {
  "+": (a, b) => (typeof a === "string" || typeof b === "string" ? `${a}${b}` : a + b),
  "-": (a, b) => a - b,
  "*": (a, b) => a * b,
  "/": (a, b) => (b === 0 ? undefined : a / b),
  "%": (a, b) => (b === 0 ? undefined : a % b),
  "==": (a, b) => a == b, // eslint-disable-line eqeqeq -- intentional loose compare for cross-language literals
  "===": (a, b) => a === b,
  "!=": (a, b) => a != b, // eslint-disable-line eqeqeq
  "!==": (a, b) => a !== b,
  "<": (a, b) => a < b,
  ">": (a, b) => a > b,
  "<=": (a, b) => a <= b,
  ">=": (a, b) => a >= b,
  "&&": (a, b) => a && b,
  "||": (a, b) => a || b,
  and: (a, b) => a && b,
  or: (a, b) => a || b,
};

const AUGMENTED_OPS = {
  "+=": "+",
  "-=": "-",
  "*=": "*",
  "/=": "/",
  "%=": "%",
};

function literal(text) {
  const t = text.trim();
  if (NUMBER_RE.test(t)) return Number(t);
  if (t === "true" || t === "True") return true;
  if (t === "false" || t === "False") return false;
  if (t === "null" || t === "None" || t === "nil" || t === "undefined") return null;
  const dq = t.match(DQUOTE_RE);
  if (dq) return dq[1];
  const sq = t.match(SQUOTE_RE);
  if (sq) return sq[1];
  return undefined;
}

// Splits "a OP b" into [left, op, right] for the small set of binary ops
// above, respecting simple parens/quotes so we don't split inside them.
// Only ever called on short, already-truncated label text.
function splitBinary(text) {
  const ops = Object.keys(BINARY_OPS).sort((a, b) => b.length - a.length);
  let depth = 0;
  let inStr = null;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inStr) {
      if (c === "\\") i++;
      else if (c === inStr) inStr = null;
      continue;
    }
    if (c === '"' || c === "'") {
      inStr = c;
      continue;
    }
    if (c === "(" || c === "[") depth++;
    if (c === ")" || c === "]") depth--;
    if (depth !== 0) continue;
    for (const op of ops) {
      if (text.startsWith(op, i)) {
        const before = text.slice(0, i).trim();
        const after = text.slice(i + op.length).trim();
        if (!before || !after) continue;
        return [before, op, after];
      }
    }
  }
  return null;
}

// Resolves a source-text expression against the current tracked-variable
// map. Returns `undefined` when the shape isn't one of the recognized
// literal/identifier/binary-op cases.
export function evalExpr(text, varState) {
  if (text === undefined || text === null) return undefined;
  const t = text.trim().replace(/;\s*$/, "");
  if (!t) return undefined;

  const lit = literal(t);
  if (lit !== undefined) return lit;

  if (/^[A-Za-z_$][\w$]*$/.test(t)) {
    return Object.prototype.hasOwnProperty.call(varState, t) ? varState[t] : undefined;
  }

  const unary = t.match(/^(-|!|not\s+)(.+)$/);
  if (unary) {
    const inner = evalExpr(unary[2], varState);
    if (inner === undefined) return undefined;
    return unary[1] === "-" ? -inner : !inner;
  }

  const parts = splitBinary(t);
  if (parts) {
    const [leftText, op, rightText] = parts;
    const left = evalExpr(leftText, varState);
    const right = evalExpr(rightText, varState);
    if (left === undefined || right === undefined) return undefined;
    return BINARY_OPS[op](left, right);
  }

  return undefined;
}

// Applies a variable/assignment node's tracked fields to `varState`,
// returning a NEW state object (never mutates the input) plus a bool for
// "did we actually learn anything." `opText` is the assignment operator as
// it appears in source ("=", "+=", ...); anything else is treated as plain
// "=" for augmented forms this evaluator doesn't special-case.
export function applyAssignment(varState, name, valueText, opText = "=") {
  if (!name) return { next: varState, changed: false };

  let resolved;
  if (opText && opText !== "=" && AUGMENTED_OPS[opText]) {
    const current = varState[name];
    const delta = evalExpr(valueText, varState);
    resolved =
      current === undefined || delta === undefined
        ? undefined
        : BINARY_OPS[AUGMENTED_OPS[opText]](current, delta);
  } else if (opText === "++") {
    resolved = varState[name] === undefined ? undefined : varState[name] + 1;
  } else if (opText === "--") {
    resolved = varState[name] === undefined ? undefined : varState[name] - 1;
  } else if (opText === "??=") {
    const current = varState[name];
    resolved = current === undefined || current === null ? evalExpr(valueText, varState) : current;
  } else {
    resolved = evalExpr(valueText, varState);
  }

  return { next: { ...varState, [name]: resolved }, changed: true };
}

export function formatValue(v) {
  if (v === undefined) return "?";
  if (v === null) return "null";
  if (typeof v === "string") return `"${v}"`;
  return String(v);
}
