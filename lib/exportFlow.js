import { getNodesBounds, getViewportForBounds } from "reactflow";
import { toPng, toSvg } from "html-to-image";

const EXPORT_PADDING = 40;
const BACKGROUND = "#0f172a";

// Renders the full flowchart (not just the visible viewport) to a PNG or SVG
// data URL and triggers a browser download — reuses ReactFlow's own bounds
// math so every node ends up in frame regardless of current pan/zoom.
export async function exportFlowchart(wrapperEl, nodes, format = "png") {
  if (!wrapperEl || !nodes?.length) return false;
  const viewportEl = wrapperEl.querySelector(".react-flow__viewport");
  if (!viewportEl) return false;

  const bounds = getNodesBounds(nodes);
  const width = Math.max(1, Math.ceil(bounds.width + EXPORT_PADDING * 2));
  const height = Math.max(1, Math.ceil(bounds.height + EXPORT_PADDING * 2));
  // `padding` here is a fraction of the bounds (0.1 = 10%), not pixels — the
  // padding was already baked into `width`/`height` above, so pass 0.
  const { x, y, zoom } = getViewportForBounds(bounds, width, height, 0.1, 2, 0);

  const options = {
    width,
    height,
    backgroundColor: BACKGROUND,
    // The flowchart uses no custom @font-face rules, and font embedding
    // scans every stylesheet in the document — including the Monaco editor's
    // CDN stylesheet, which throws a SecurityError on cssRules access
    // (cross-origin, no CORS) and corrupts the export. Skip it entirely.
    skipFonts: true,
    style: {
      width: `${width}px`,
      height: `${height}px`,
      transform: `translate(${x}px, ${y}px) scale(${zoom})`,
    },
  };

  const dataUrl = format === "svg" ? await toSvg(viewportEl, options) : await toPng(viewportEl, options);

  const link = document.createElement("a");
  link.download = `logic-x-ray-flowchart.${format}`;
  link.href = dataUrl;
  link.click();
  return true;
}
