import { makeNode, makeEdge, NODE_TYPES } from "../nodeStyles";

const COL_W = 200;
const ROW_H = 80;

let _id;
const uid = (p) => `${p}_${++_id}`;

const MODIFIERS =
  "(?:(?:public|private|protected|static|final|abstract|synchronized|native|transient|volatile|default)\\s+)*";

const PATTERNS = [
  // imports
  {
    re: /^import\s+(static\s+)?([\w.*]+);/,
    type: NODE_TYPES.import,
    label: (m) => `import ${m[2]}`,
  },

  // class / interface / enum / record
  {
    re: new RegExp(
      `^${MODIFIERS}(class|interface|enum|record)\\s+(\\w+)(?:<[^>]*>)?(?:\\s+extends\\s+([\\w<>, ]+))?(?:\\s+implements\\s+([\\w<>,\\s]+))?\\s*[{(]`,
    ),
    type: NODE_TYPES.class,
    label: (m) =>
      `${m[1]} ${m[2]}${m[3] ? ` extends ${m[3].trim()}` : ""}${m[4] ? ` implements ${m[4].trim()}` : ""}`,
  },

  // constructor  ClassName(...)
  {
    re: new RegExp(
      `^${MODIFIERS}(\\w+)\\s*\\(([^)]*)\\)\\s*(?:throws[\\w,\\s]*)?\\s*\\{`,
    ),
    type: NODE_TYPES.function,
    label: (m) => `${m[1]}(${m[2]})`,
  },

  // method  returnType name(...)
  {
    re: new RegExp(
      `^${MODIFIERS}([\\w<>\\[\\]?,\\s]+)\\s+(\\w+)\\s*\\(([^)]*)\\)\\s*(?:throws[\\w,\\s]*)?\\s*[{;]`,
    ),
    type: NODE_TYPES.function,
    label: (m) => `${m[2]}(${m[3].slice(0, 40)}) : ${m[1].trim()}`,
  },

  // for / enhanced for
  {
    re: /^for\s*\((.+?)\)/,
    type: NODE_TYPES.loop,
    label: (m) => `for (${m[1].slice(0, 40)})`,
  },
  {
    re: /^while\s*\((.+?)\)/,
    type: NODE_TYPES.loop,
    label: (m) => `while (${m[1].slice(0, 40)})`,
  },
  { re: /^do\s*\{?/, type: NODE_TYPES.loop, label: () => "do…while" },

  // if / else if / else
  {
    re: /^if\s*\((.+?)\)/,
    type: NODE_TYPES.condition,
    label: (m) => `if (${m[1].slice(0, 40)})`,
  },
  {
    re: /^else\s+if\s*\((.+?)\)/,
    type: NODE_TYPES.condition,
    label: (m) => `else if (${m[1].slice(0, 40)})`,
  },
  { re: /^else\s*\{?/, type: NODE_TYPES.condition, label: () => "else" },

  // switch / case
  {
    re: /^switch\s*\((.+?)\)/,
    type: NODE_TYPES.condition,
    label: (m) => `switch (${m[1]})`,
  },
  {
    re: /^case\s+(.+):/,
    type: NODE_TYPES.condition,
    label: (m) => `case ${m[1]}`,
  },
  { re: /^default\s*:/, type: NODE_TYPES.condition, label: () => "default" },

  // try / catch / finally
  { re: /^try\s*\{?/, type: NODE_TYPES.trycatch, label: () => "try" },
  {
    re: /^catch\s*\((.+?)\)/,
    type: NODE_TYPES.trycatch,
    label: (m) => `catch (${m[1]})`,
  },
  { re: /^finally\s*\{?/, type: NODE_TYPES.trycatch, label: () => "finally" },

  // return / throw / break / continue
  {
    re: /^return\b(.*)/,
    type: NODE_TYPES.returnNode,
    label: (m) => `return ${m[1].replace(/;$/, "").trim().slice(0, 40)}`,
  },
  {
    re: /^throw\b(.*)/,
    type: NODE_TYPES.returnNode,
    label: (m) => `throw ${m[1].replace(/;$/, "").trim().slice(0, 40)}`,
  },
  { re: /^break\b/, type: NODE_TYPES.returnNode, label: () => "break" },
  { re: /^continue\b/, type: NODE_TYPES.returnNode, label: () => "continue" },

  // variable declaration
  {
    re: new RegExp(`^${MODIFIERS}([\\w<>\\[\\]?,\\s]+)\\s+(\\w+)\\s*=`),
    type: NODE_TYPES.variable,
    label: (m) => `${m[1].trim()} ${m[2]} = …`,
  },
];

// ── Strip comments and tokenise ───────────────────────────────────────────────
function tokenize(code) {
  return code
    .replace(/\/\/[^\n]*/g, "")
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .split("\n")
    .map((raw) => ({
      text: raw.trim(),
      indent: raw.length - raw.trimStart().length,
    }))
    .filter((l) => l.text);
}

function classifyLine(text) {
  for (const { re, type, label } of PATTERNS) {
    const m = text.match(re);
    if (m) return { type, label: label(m) };
  }
  return null;
}

// ── Build nodes tracking brace depth for parent/child ────────────────────────
function buildNodes(lines) {
  const nodes = [];
  const edges = [];
  const counter = { val: 0 };

  // Stack entries: { id, openDepth }
  // id = null means "no parent" (top level)
  const stack = [{ id: null, openDepth: 0 }];
  let braceDepth = 0;

  lines.forEach((line) => {
    const opens = (line.text.match(/\{/g) || []).length;
    const closes = (line.text.match(/\}/g) || []).length;

    const info = classifyLine(line.text);

    if (info) {
      // Determine parent from top of stack
      const parentId = stack[stack.length - 1].id;
      const nodeDepth = stack.length - 1;
      const id = uid(info.type);
      const pos = { x: nodeDepth * COL_W, y: counter.val++ * ROW_H };

      nodes.push(makeNode(id, info.type, info.label, pos));

      // Only draw edge when there is a real structural parent
      if (parentId !== null) {
        edges.push(makeEdge(uid("e"), parentId, id));
      }

      // If this line opens a new scope, push it as the new parent
      if (opens > closes) {
        stack.push({ id, openDepth: braceDepth + opens });
      }
    }

    // Update brace depth
    braceDepth += opens - closes;

    // Pop stack entries whose scope has closed
    while (stack.length > 1 && stack[stack.length - 1].openDepth > braceDepth) {
      stack.pop();
    }
  });

  return { nodes, edges };
}

// ── Complexity & suggestions ──────────────────────────────────────────────────
function calcComplexity(lines) {
  let n = 1;
  lines.forEach(({ text }) => {
    if (/\b(if|else if|for|while|do|case|catch)\b/.test(text)) n++;
    if (/&&|\|\|/.test(text)) n++;
  });
  return n;
}

function buildSuggestions(complexity) {
  const s = [];
  if (complexity > 10)
    s.push("High complexity — split large methods into smaller ones.");
  if (complexity > 5)
    s.push("Consider using polymorphism to reduce conditional chains.");
  return s;
}

// ── Public API ────────────────────────────────────────────────────────────────
export function parseJava(code) {
  _id = 0;
  try {
    const lines = tokenize(code);
    const { nodes, edges } = buildNodes(lines);
    const complexity = calcComplexity(lines);
    return {
      flowNodes: nodes,
      flowEdges: edges,
      complexity,
      suggestions: buildSuggestions(complexity),
    };
  } catch (e) {
    return { error: e.message };
  }
}
