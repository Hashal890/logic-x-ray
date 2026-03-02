import { makeNode, makeEdge, NODE_TYPES } from "../nodeStyles";

// C / C++ regex parser — covers:
// #include / #define / using namespace,
// class / struct / union / enum (C++),
// functions (any return type),
// if/else if/else, switch/case,
// for/while/do-while,
// try/catch (C++),
// return/break/continue/goto,
// variable declarations

const COL_W = 200;
const ROW_H = 80;

let _id;
const uid = (p) => `${p}_${++_id}`;

const PATTERNS = [
  // preprocessor
  {
    re: /^#include\s*[<"]([^>"]+)[>"]/,
    type: NODE_TYPES.import,
    label: (m) => `#include <${m[1]}>`,
  },
  {
    re: /^#define\s+(\w+)(.*)/,
    type: NODE_TYPES.variable,
    label: (m) => `#define ${m[1]} ${m[2].trim().slice(0, 30)}`,
  },
  {
    re: /^using\s+namespace\s+(\w+)/,
    type: NODE_TYPES.import,
    label: (m) => `using namespace ${m[1]}`,
  },
  {
    re: /^using\s+(.+)=/,
    type: NODE_TYPES.import,
    label: (m) => `using ${m[1].trim()} = …`,
  },

  // C++ class / struct / union / enum class
  {
    re: /^(?:template\s*<[^>]*>\s*)?(?:class|struct|union|enum\s+class|enum)\s+(\w+)(?:\s*:\s*([\w,\s:]+))?/,
    type: NODE_TYPES.class,
    label: (m) =>
      `${m[0].match(/class|struct|union|enum/)[0]} ${m[1]}${m[2] ? ` : ${m[2].trim()}` : ""}`,
  },

  // function definition  returnType name(...)  {
  // Heuristic: starts with a type-like word, has parens, ends with { or just )
  {
    re: /^(?:(?:inline|static|virtual|explicit|constexpr|override|const|auto)\s+)*[\w:*&<>[\]]+\s+(?:~?\w+::)?(\w+)\s*\(([^)]*)\)\s*(?:const\s*)?(?:noexcept\s*)?(?:override\s*)?(?:->[\w:*& ]+)?\s*\{?/,
    type: NODE_TYPES.function,
    label: (m) => `${m[1]}(${m[2].slice(0, 40)})`,
  },

  // for
  {
    re: /^for\s*\((.+?)\)/,
    type: NODE_TYPES.loop,
    label: (m) => `for (${m[1].slice(0, 40)})`,
  },
  // range-based for
  {
    re: /^for\s*\(\s*(?:auto|const)&?\s+(\w+)\s*:\s*(\w+)\s*\)/,
    type: NODE_TYPES.loop,
    label: (m) => `for (auto ${m[1]} : ${m[2]})`,
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

  // C++ try / catch
  { re: /^try\s*\{?/, type: NODE_TYPES.trycatch, label: () => "try" },
  {
    re: /^catch\s*\((.+?)\)/,
    type: NODE_TYPES.trycatch,
    label: (m) => `catch (${m[1]})`,
  },

  // return / break / continue / goto / throw
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
  {
    re: /^goto\s+(\w+)/,
    type: NODE_TYPES.returnNode,
    label: (m) => `goto ${m[1]}`,
  },

  // variable declaration  type name = ... or  type name;
  {
    re: /^(?:(?:const|static|volatile|auto|register|extern|unsigned|signed|long|short)\s+)*[\w:*&<>]+\s+(\w+)\s*(?:=|;|\[)/,
    type: NODE_TYPES.variable,
    label: (m) => `var ${m[1]}`,
  },
];

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

function buildNodes(lines, lang) {
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
    if (/\b(if|else if|for|while|do|case|catch)\b/.test(text)) n++;
    if (/&&|\|\|/.test(text)) n++;
  });
  return n;
}

function buildSuggestions(complexity) {
  const s = [];
  if (complexity > 10)
    s.push("High complexity — split functions and reduce nesting.");
  if (complexity > 5)
    s.push("Deep branching detected — consider lookup tables or polymorphism.");
  return s;
}

export function parseC(code, lang = "C") {
  _id = 0;
  try {
    const lines = tokenize(code);
    const { nodes, edges } = buildNodes(lines, lang);
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
