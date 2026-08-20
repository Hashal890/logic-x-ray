// Pure string ops on {codeStart, codeEnd, lineStart, lineEnd} metadata —
// no ReactFlow node objects here, just node.data.

const LANG_COMMENT = {
  javascript: "//",
  typescript: "//",
  java: "//",
  php: "//",
  c: "//",
  cpp: "//",
  python: "#",
};

function hasRange(meta) {
  return (
    meta &&
    Number.isFinite(meta.codeStart) &&
    Number.isFinite(meta.codeEnd) &&
    meta.codeEnd >= meta.codeStart
  );
}

function hasLineRange(meta) {
  return (
    meta &&
    Number.isFinite(meta.lineStart) &&
    Number.isFinite(meta.lineEnd) &&
    meta.lineEnd >= meta.lineStart
  );
}

function rangesOverlap(a, b) {
  return a.lineStart <= b.lineEnd && b.lineStart <= a.lineEnd;
}

export function deleteNode(code, meta) {
  if (!hasRange(meta)) return code;
  let end = meta.codeEnd;
  if (code[end] === "\n") end += 1; // don't leave a blank line behind
  return code.slice(0, meta.codeStart) + code.slice(end);
}

export function commentNode(code, meta, language) {
  if (!hasLineRange(meta)) return code;
  const token = LANG_COMMENT[language] ?? "//";
  const lines = code.split("\n");
  const start = meta.lineStart - 1;
  const end = Math.min(meta.lineEnd - 1, lines.length - 1);
  if (start < 0 || start > end) return code;

  for (let i = start; i <= end; i++) {
    const line = lines[i];
    const indentLen = line.length - line.trimStart().length;
    lines[i] =
      line.slice(0, indentLen) + token + " " + line.slice(indentLen);
  }
  return lines.join("\n");
}

// Swaps the two nodes' source lines. Returns `code` unchanged if either
// range is missing or the two overlap (nested nodes can't be swapped).
export function moveNode(code, draggedMeta, targetMeta) {
  if (!hasLineRange(draggedMeta) || !hasLineRange(targetMeta)) return code;
  if (rangesOverlap(draggedMeta, targetMeta)) return code;

  const lines = code.split("\n");
  const [a, b] =
    draggedMeta.lineStart < targetMeta.lineStart
      ? [draggedMeta, targetMeta]
      : [targetMeta, draggedMeta];

  if (b.lineEnd > lines.length) return code;

  const aBlock = lines.slice(a.lineStart - 1, a.lineEnd);
  const between = lines.slice(a.lineEnd, b.lineStart - 1);
  const bBlock = lines.slice(b.lineStart - 1, b.lineEnd);

  const reordered = [
    ...lines.slice(0, a.lineStart - 1),
    ...bBlock,
    ...between,
    ...aBlock,
    ...lines.slice(b.lineEnd),
  ];

  return reordered.join("\n");
}
