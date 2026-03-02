import { makeNode, makeEdge, NODE_TYPES } from "../nodeStyles";

// PHP parser — regex/heuristic, handles:
// classes, interfaces, traits, abstract classes,
// functions, arrow functions, closures,
// if/elseif/else, switch/case, match,
// for/foreach/while/do-while,
// try/catch/finally, return/throw/break/continue,
// use/require/include, variable declarations ($var =)

const COL_W = 200;
const ROW_H = 80;

let _id;
const uid = (p) => `${p}_${++_id}`;

const MOD =
  "(?:(?:public|private|protected|static|abstract|final|readonly)\\s+)*";

const PATTERNS = [
  // namespace / use
  {
    re: /^namespace\s+([\w\\]+)/,
    type: NODE_TYPES.import,
    label: (m) => `namespace ${m[1]}`,
  },
  {
    re: /^use\s+([\w\\, ]+)/,
    type: NODE_TYPES.import,
    label: (m) => `use ${m[1].trim().slice(0, 50)}`,
  },
  {
    re: /^require(?:_once)?\s*(.+)/,
    type: NODE_TYPES.import,
    label: (m) => `require ${m[1].replace(/[;'"]/g, "").trim().slice(0, 40)}`,
  },
  {
    re: /^include(?:_once)?\s*(.+)/,
    type: NODE_TYPES.import,
    label: (m) => `include ${m[1].replace(/[;'"]/g, "").trim().slice(0, 40)}`,
  },

  // class / interface / trait / abstract class / enum
  {
    re: new RegExp(
      `^${MOD}(class|interface|trait|enum)\\s+(\\w+)(?:\\s+extends\\s+(\\w+))?(?:\\s+implements\\s+([\\w,\\s]+))?`,
    ),
    type: NODE_TYPES.class,
    label: (m) =>
      `${m[1]} ${m[2]}${m[3] ? ` extends ${m[3]}` : ""}${m[4] ? ` implements ${m[4].trim()}` : ""}`,
  },

  // function / method (including arrow fn)
  {
    re: new RegExp(
      `^${MOD}function\\s+(\\w+)\\s*\\(([^)]*)\\)(?:\\s*:\\s*[\\w?|]+)?`,
    ),
    type: NODE_TYPES.function,
    label: (m) => `${m[1]}(${m[2]})`,
  },
  // closure / anonymous function
  {
    re: /^(?:static\s+)?function\s*\(([^)]*)\)/,
    type: NODE_TYPES.function,
    label: (m) => `closure(${m[1]})`,
  },
  // arrow function  fn($x) =>
  {
    re: /^fn\s*\(([^)]*)\)\s*=>/,
    type: NODE_TYPES.function,
    label: (m) => `fn(${m[1]}) =>`,
  },

  // for / foreach / while / do
  {
    re: /^for\s*\((.+?)\)/,
    type: NODE_TYPES.loop,
    label: (m) => `for (${m[1].slice(0, 40)})`,
  },
  {
    re: /^foreach\s*\((.+?)\)/,
    type: NODE_TYPES.loop,
    label: (m) => `foreach (${m[1].slice(0, 40)})`,
  },
  {
    re: /^while\s*\((.+?)\)/,
    type: NODE_TYPES.loop,
    label: (m) => `while (${m[1].slice(0, 40)})`,
  },
  { re: /^do\s*\{?/, type: NODE_TYPES.loop, label: () => "do…while" },

  // if / elseif / else
  {
    re: /^if\s*\((.+?)\)/,
    type: NODE_TYPES.condition,
    label: (m) => `if (${m[1].slice(0, 40)})`,
  },
  {
    re: /^elseif\s*\((.+?)\)/,
    type: NODE_TYPES.condition,
    label: (m) => `elseif (${m[1].slice(0, 40)})`,
  },
  { re: /^else\s*\{?/, type: NODE_TYPES.condition, label: () => "else" },

  // switch / match / case
  {
    re: /^switch\s*\((.+?)\)/,
    type: NODE_TYPES.condition,
    label: (m) => `switch (${m[1]})`,
  },
  {
    re: /^match\s*\((.+?)\)/,
    type: NODE_TYPES.condition,
    label: (m) => `match (${m[1]})`,
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

  // variable  $name = ...
  {
    re: /^(\$[\w]+)\s*=(?!=)(.*)/,
    type: NODE_TYPES.variable,
    label: (m) => `${m[1]} = ${m[2].replace(/;$/, "").trim().slice(0, 40)}`,
  },
];

function tokenize(code) {
  return code
    .replace(/\/\/[^\n]*/g, "")
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/#[^\n]*/g, "") // PHP # comments
    .split("\n")
    .map((raw) => ({
      text: raw.trim(),
      indent: raw.length - raw.trimStart().length,
    }))
    .filter((l) => l.text && l.text !== "<?php" && l.text !== "?>");
}

function classifyLine(text) {
  for (const { re, type, label } of PATTERNS) {
    const m = text.match(re);
    if (m) return { type, label: label(m) };
  }
  return null;
}

function buildNodes(lines) {
  const nodes = [];
  const edges = [];
  const counter = { val: 1 };
  const entryId = "entry_0";

  const stack = [{ id: null, depth: 0 }];
  let braceDepth = 0;

  lines.forEach((line) => {
    const opens = (line.text.match(/\{/g) || []).length;
    const closes = (line.text.match(/\}/g) || []).length;

    const info = classifyLine(line.text);
    if (info) {
      const parentId = stack[stack.length - 1].id;
      const nodeDepth = stack.length - 1;
      const id = uid(info.type);
      const pos = { x: nodeDepth * COL_W, y: counter.val++ * ROW_H };
      nodes.push(makeNode(id, info.type, info.label, pos));
      if (parentId) edges.push(makeEdge(uid("e"), parentId, id));
      if (opens > closes)
        stack.push({ id, depth: braceDepth + opens - closes });
    }

    braceDepth += opens - closes;
    while (stack.length > 1 && stack[stack.length - 1].depth > braceDepth)
      stack.pop();
  });

  return { nodes, edges };
}

function calcComplexity(lines) {
  let n = 1;
  lines.forEach(({ text }) => {
    if (/\b(if|elseif|for|foreach|while|do|case|catch|match)\b/.test(text)) n++;
    if (/&&|\|\|/.test(text)) n++;
  });
  return n;
}

function buildSuggestions(complexity) {
  const s = [];
  if (complexity > 10)
    s.push("High complexity — extract logic into smaller methods.");
  if (complexity > 5)
    s.push("Consider using match expressions to simplify switch chains.");
  return s;
}

export function parsePHP(code) {
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
