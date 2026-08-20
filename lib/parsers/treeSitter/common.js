// Shared helpers used by every language's classify() function.

const X_INDENT = 200;
const Y_STEP = 80;

export function nextPos(counter, depth) {
  return { x: depth * X_INDENT, y: counter.val++ * Y_STEP };
}

export function makeUid() {
  let n = 0;
  return (prefix) => `${prefix}_${++n}`;
}

// Node text, single-lined and capped — used for labels built straight from
// source rather than reconstructed field-by-field.
export function textOf(node, max = 60) {
  if (!node) return "";
  const t = node.text.replace(/\s+/g, " ").trim();
  return t.length > max ? `${t.slice(0, max - 1)}…` : t;
}

export function fieldText(node, field, max = 60) {
  return textOf(node?.childForFieldName?.(field), max);
}

// web-tree-sitter returns a fresh wrapper object on every accessor call, so
// `nodeA === nodeB` is unreliable even for the same underlying CST node —
// compare by the stable numeric `.id` instead.
export function sameNode(a, b) {
  return !!a && !!b && a.id === b.id;
}

// node.type with underscores turned into spaces — the fallback label for
// any construct a language profile doesn't explicitly recognize.
export function humanizeType(node) {
  return node.type.replace(/_/g, " ");
}

export function meta(node, depth) {
  return {
    codeStart: node.startIndex,
    codeEnd: node.endIndex,
    lineStart: node.startPosition.row + 1,
    lineEnd: node.endPosition.row + 1,
    depth,
  };
}
