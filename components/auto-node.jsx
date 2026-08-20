import { memo, useEffect, useRef, useState } from "react";
import { Handle, Position, useReactFlow } from "reactflow";
import { depthColor } from "../lib/nodeStyles";

// no position:absolute here — the wrapper div handles that, otherwise
// both buttons stack on top of each other instead of sitting side by side
const actionBtnStyle = {
  width: 20,
  height: 20,
  borderRadius: "50%",
  border: "1px solid #334155",
  background: "#0f172a",
  color: "#94a3b8",
  fontSize: 10,
  lineHeight: "18px",
  textAlign: "center",
  cursor: "pointer",
  padding: 0,
  flexShrink: 0,
};

// custom node so the box sizes itself around its text instead of ReactFlow's
// default fixed-width wrapper — we measure it and report it back so edges
// still anchor at the right spot
const AutoNode = memo(({ id, data, style }) => {
  const ref = useRef(null);
  const { setNodes } = useReactFlow();
  const [hovered, setHovered] = useState(false);

  useEffect(() => {
    if (!ref.current) return;
    const { offsetWidth: w, offsetHeight: h } = ref.current;
    if (!w || !h) return;

    setNodes((nodes) =>
      nodes.map((n) => (n.id === id ? { ...n, width: w, height: h } : n)),
    );
  }); // no deps on purpose — also catches font-load resize

  const heatColor =
    data.heatmapEnabled && Number.isFinite(data.depth)
      ? depthColor(data.depth)
      : null;

  const mergedStyle = {
    ...style,
    ...(heatColor ? { background: heatColor, borderColor: heatColor } : {}),
    position: "relative",
    cursor: "pointer",
  };

  const animClass = !data.heatmapEnabled
    ? ""
    : data.depth >= 7
      ? "node-pulse"
      : data.depth >= 4
        ? "node-glow"
        : "";
  const simClass = data.simActive
    ? "node-active-glow"
    : data.simBranchCandidate
      ? "node-branch-glow"
      : "";

  const handleClick = () => {
    if (data.simBranchCandidate) {
      data.onBranchChoose?.();
    } else {
      data.onNodeClick?.();
    }
  };

  return (
    <div
      ref={ref}
      style={mergedStyle}
      className={[animClass, simClass].filter(Boolean).join(" ")}
      onClick={handleClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <Handle
        type="target"
        position={Position.Top}
        style={{ background: "#334155", border: "none", width: 8, height: 8 }}
      />

      <span style={{ pointerEvents: "none" }}>{data.label}</span>

      {data.heatmapEnabled && Number.isFinite(data.depth) && data.depth >= 5 && (
        <span
          title={`Nesting depth ${data.depth}`}
          style={{
            position: "absolute",
            top: -9,
            left: -9,
            fontSize: 12,
            lineHeight: 1,
          }}
        >
          ⚠
        </span>
      )}

      {hovered && (data.onDelete || data.onComment) && (
        <div
          style={{ position: "absolute", top: -11, right: -11, display: "flex", gap: 4 }}
        >
          {data.onComment && (
            <button
              title="Comment out"
              style={actionBtnStyle}
              onClick={(e) => {
                e.stopPropagation();
                data.onComment();
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = "#00d1b2";
                e.currentTarget.style.color = "#00d1b2";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = "#334155";
                e.currentTarget.style.color = "#94a3b8";
              }}
            >
              //
            </button>
          )}
          {data.onDelete && (
            <button
              title="Delete"
              style={actionBtnStyle}
              onClick={(e) => {
                e.stopPropagation();
                data.onDelete();
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = "#ef4444";
                e.currentTarget.style.color = "#ef4444";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = "#334155";
                e.currentTarget.style.color = "#94a3b8";
              }}
            >
              ✕
            </button>
          )}
        </div>
      )}

      <Handle
        type="source"
        position={Position.Bottom}
        style={{ background: "#334155", border: "none", width: 8, height: 8 }}
      />
    </div>
  );
});

AutoNode.displayName = "AutoNode";

export const nodeTypes = { autoNode: AutoNode };

export default AutoNode;
