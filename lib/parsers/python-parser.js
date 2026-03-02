import { makeNode, makeEdge, NODE_TYPES } from "../nodeStyles";

// Python uses indentation for structure, so we track indent levels
// to determine parent-child relationships between blocks.

const COL_W = 200;
const ROW_H = 80;

let _id;
const uid = (p) => `${p}_${++_id}`;

// ── Tokenise Python source into logical lines with indent level ──────────────
function tokenize(code) {
  return code
    .split("\n")
    .map((raw, i) => {
      const stripped = raw.trimEnd();
      const indent = stripped.length - stripped.trimStart().length;
      return {
        lineNo: i + 1,
        indent,
        text: stripped.trimStart(),
        raw: stripped,
      };
    })
    .filter((l) => l.text && !l.text.startsWith("#"));
}

// ── Classify a single line into a node type + label ──────────────────────────
function classify(text) {
  // imports
  if (/^import\s+/.test(text) || /^from\s+\S+\s+import/.test(text))
    return { type: NODE_TYPES.import, label: text.slice(0, 60) };

  // class
  const classMa = text.match(/^class\s+(\w+)(\(([^)]*)\))?:/);
  if (classMa)
    return {
      type: NODE_TYPES.class,
      label: `${classMa[1]}${classMa[2] ?? ""}`,
    };

  // async def / def
  const fnMa = text.match(/^(async\s+)?def\s+(\w+)\s*\(([^)]*)\):/);
  if (fnMa)
    return {
      type: NODE_TYPES.function,
      label: `${fnMa[1] ?? ""}${fnMa[2]}(${fnMa[3]})`,
    };

  // decorator
  if (/^@\w+/.test(text))
    return { type: NODE_TYPES.function, label: text.slice(0, 50) };

  // for
  const forMa = text.match(/^for\s+(.+)\s+in\s+(.+):/);
  if (forMa)
    return { type: NODE_TYPES.loop, label: `for ${forMa[1]} in ${forMa[2]}` };

  // while
  const whileMa = text.match(/^while\s+(.+):/);
  if (whileMa) return { type: NODE_TYPES.loop, label: `while ${whileMa[1]}` };

  // if / elif / else
  const ifMa = text.match(/^(if|elif)\s+(.+):/);
  if (ifMa)
    return { type: NODE_TYPES.condition, label: `${ifMa[1]} ${ifMa[2]}` };
  if (/^else\s*:/.test(text))
    return { type: NODE_TYPES.condition, label: "else" };

  // try / except / finally
  if (/^try\s*:/.test(text)) return { type: NODE_TYPES.trycatch, label: "try" };
  const excMa = text.match(/^except(\s+.+)?:/);
  if (excMa)
    return { type: NODE_TYPES.trycatch, label: `except${excMa[1] ?? ""}` };
  if (/^finally\s*:/.test(text))
    return { type: NODE_TYPES.trycatch, label: "finally" };
  if (/^with\s+.+:/.test(text))
    return { type: NODE_TYPES.trycatch, label: text.replace(/:$/, "") };

  // return / yield / raise / break / continue
  if (/^return\b/.test(text))
    return { type: NODE_TYPES.returnNode, label: text.slice(0, 60) };
  if (/^yield\b/.test(text))
    return { type: NODE_TYPES.returnNode, label: text.slice(0, 60) };
  if (/^raise\b/.test(text))
    return { type: NODE_TYPES.returnNode, label: text.slice(0, 60) };
  if (/^break\b/.test(text))
    return { type: NODE_TYPES.returnNode, label: "break" };
  if (/^continue\b/.test(text))
    return { type: NODE_TYPES.returnNode, label: "continue" };

  // variable assignment (simple: name = / name: type =)
  if (/^\w+(\s*:\s*\w+)?\s*=(?!=)/.test(text))
    return { type: NODE_TYPES.variable, label: text.slice(0, 60) };

  // map / list comprehension call
  if (
    /\bmap\s*\(/.test(text) ||
    /\bfilter\s*\(/.test(text) ||
    /\[(.*) for .* in /.test(text)
  )
    return { type: NODE_TYPES.loop, label: text.slice(0, 60) };

  // generic call expression
  if (/\w+\s*\(/.test(text))
    return { type: NODE_TYPES.function, label: text.slice(0, 60) };

  return null;
}

// ── Build nodes from token list using indent stack ───────────────────────────
function buildNodes(lines) {
  const nodes = [];
  const edges = [];
  const counter = { val: 1 };

  // Start stack with a null root so top-level nodes have no parent
  const stack = [{ id: null, indent: -1 }];

  lines.forEach((line) => {
    const info = classify(line.text);
    if (!info) return;

    // Pop stack until we find the enclosing parent
    while (stack.length > 1 && stack[stack.length - 1].indent >= line.indent) {
      stack.pop();
    }

    const parentId = stack[stack.length - 1].id;
    const depth = stack.length - 1;
    const id = uid(info.type);
    const pos = { x: depth * COL_W, y: counter.val++ * ROW_H };

    nodes.push(makeNode(id, info.type, info.label, pos));
    edges.push(makeEdge(uid("e"), parentId, id));

    // Block-openers push onto the stack
    if (
      /[:{]$/.test(line.text) ||
      ["class", "function", "loop", "condition", "trycatch"].includes(info.type)
    ) {
      stack.push({ id, indent: line.indent });
    }
  });

  return { nodes, edges };
}

function calcComplexity(lines) {
  let n = 1;
  lines.forEach(({ text }) => {
    if (/^(if|elif|for|while|except|with)\b/.test(text)) n++;
    if (/\band\b|\bor\b/.test(text)) n++;
  });
  return n;
}

function buildSuggestions(complexity) {
  const s = [];
  if (complexity > 10)
    s.push("High complexity — consider breaking into smaller functions.");
  if (complexity > 5)
    s.push("Several branches detected — add unit tests for each path.");
  return s;
}

export function parsePython(code) {
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
