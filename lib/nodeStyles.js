// ─── Node type keys ───────────────────────────────────────────────────────────
export const NODE_TYPES = {
  class: "class",
  function: "function",
  loop: "loop",
  condition: "condition",
  trycatch: "trycatch",
  import: "import",
  export: "export",
  returnNode: "returnNode",
  variable: "variable",
};

// ─── Base style shared by all nodes ──────────────────────────────────────────
// No width/height — the node box sizes itself around its content.
const base = {
  display: "inline-block", // shrink-wrap to content
  maxWidth: 320, // hard cap so nothing goes off-screen
  minWidth: 100,
  padding: "6px 12px",
  borderRadius: 6,
  fontSize: 12,
  fontFamily: "'Fira Code', monospace",
  border: "1px solid",
  whiteSpace: "pre-wrap", // wrap on spaces
  wordBreak: "break-word", // break long tokens
  lineHeight: 1.5,
  boxSizing: "border-box",
};

// ─── Per-type styles ──────────────────────────────────────────────────────────
export const NODE_STYLES = {
  class: {
    ...base,
    background: "#1e1b4b",
    borderColor: "#6366f1",
    borderWidth: 2,
    color: "#a5b4fc",
    fontWeight: 700,
  },
  function: {
    ...base,
    background: "#0f2a27",
    borderColor: "#00d1b2",
    color: "#5eead4",
  },
  loop: {
    ...base,
    background: "#052e16",
    borderColor: "#22c55e",
    color: "#86efac",
  },
  condition: {
    ...base,
    background: "#451a03",
    borderColor: "#f59e0b",
    color: "#fcd34d",
    borderRadius: 4,
  },
  trycatch: {
    ...base,
    background: "#2d0a0a",
    borderColor: "#ef4444",
    borderStyle: "dashed",
    color: "#fca5a5",
  },
  import: {
    ...base,
    background: "#0f172a",
    borderColor: "#475569",
    color: "#94a3b8",
    fontSize: 11,
  },
  export: {
    ...base,
    background: "#0f172a",
    borderColor: "#334155",
    color: "#64748b",
    fontSize: 11,
  },
  returnNode: {
    ...base,
    background: "#2d1040",
    borderColor: "#f472b6",
    color: "#f9a8d4",
    borderRadius: 20,
    fontSize: 11,
  },
  variable: {
    ...base,
    background: "#0f172a",
    borderColor: "#334155",
    color: "#cbd5e1",
    fontSize: 11,
  },
};

// ─── Icons ────────────────────────────────────────────────────────────────────
export const NODE_ICONS = {
  class: "◈",
  function: "ƒ",
  loop: "↺",
  condition: "◇",
  trycatch: "⚠",
  import: "↓",
  export: "↑",
  returnNode: "⏎",
  variable: "▪",
};

// ─── Factory helpers ──────────────────────────────────────────────────────────

/**
 * Build a ReactFlow node.
 * No width/height set — ReactFlow measures the rendered DOM element.
 * Labels are capped at 120 chars so no node grows absurdly large.
 */
export function makeNode(id, type, label, position, extra = {}) {
  const icon = NODE_ICONS[type] ?? "";
  const display = label.length > 120 ? label.slice(0, 117) + "…" : label;
  return {
    id,
    type: "autoNode", // our custom auto-sizing node type (see autoNode.jsx)
    position,
    data: {
      label: `${icon}${icon ? "  " : ""}${display}`,
      nodeType: type,
      ...extra,
    },
    style: NODE_STYLES[type] ?? NODE_STYLES.variable,
  };
}

export function makeEdge(id, source, target, label = "") {
  return {
    id,
    source,
    target,
    label,
    labelStyle: { fill: "#64748b", fontSize: 10 },
    labelBgStyle: { fill: "#0f172a" },
    style: { stroke: "#334155" },
    markerEnd: { type: "arrowclosed", color: "#334155" },
  };
}
