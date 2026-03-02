import { memo, useEffect, useRef } from "react";
import { Handle, Position, useReactFlow } from "reactflow";

/**
 * Custom ReactFlow node that measures its own rendered size and reports it
 * back via updateNodeDimensions so edges connect at the correct anchors.
 *
 * ReactFlow's built-in node wrapper sets a fixed width from node.style.width.
 * By using a custom node we bypass that and let the browser's layout engine
 * size the box naturally based on its text content.
 */
const AutoNode = memo(({ id, data, style }) => {
  const ref = useRef(null);
  const { setNodes } = useReactFlow();

  // After every render, measure the real DOM size and push it back into
  // the node's dimensions so ReactFlow positions handles correctly.
  useEffect(() => {
    if (!ref.current) return;
    const { offsetWidth: w, offsetHeight: h } = ref.current;
    if (!w || !h) return;

    setNodes((nodes) =>
      nodes.map((n) => (n.id === id ? { ...n, width: w, height: h } : n)),
    );
  }); // run after every render — catches font-load resize too

  return (
    <div ref={ref} style={style}>
      {/* Top handle — where incoming edges connect */}
      <Handle
        type="target"
        position={Position.Top}
        style={{ background: "#334155", border: "none", width: 8, height: 8 }}
      />

      {/* Label */}
      <span style={{ pointerEvents: "none" }}>{data.label}</span>

      {/* Bottom handle — where outgoing edges leave */}
      <Handle
        type="source"
        position={Position.Bottom}
        style={{ background: "#334155", border: "none", width: 8, height: 8 }}
      />
    </div>
  );
});

AutoNode.displayName = "AutoNode";

// Register with ReactFlow by passing this map to the nodeTypes prop
export const nodeTypes = { autoNode: AutoNode };

export default AutoNode;
