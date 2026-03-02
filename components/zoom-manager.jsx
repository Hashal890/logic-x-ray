import { useEffect } from "react";
import { useReactFlow } from "reactflow";

// Centers the canvas on the first node after the graph loads.
// Works without an entry node — finds whatever node appears first.
export default function ZoomManager({ nodes }) {
  const { setCenter } = useReactFlow();

  useEffect(() => {
    if (!nodes.length) return;
    const t = setTimeout(() => {
      const first = nodes[0];
      if (first?.position) {
        const w = first.width ?? 400;
        const h = first.height ?? 500;
        setCenter(first.position.x + w / 2, first.position.y + h / 2, {
          zoom: 1.4,
          duration: 800,
        });
      }
    }, 200);
    return () => clearTimeout(t);
  }, [nodes, setCenter]);

  return null;
}
