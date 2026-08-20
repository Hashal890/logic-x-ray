// Core palette
export const COLOR = {
  // Backgrounds
  bgDeep: "#020617", // deepest — header, sidebar
  bgBase: "#0f172a", // canvas, cards
  bgRaised: "#1e293b", // borders, resize handle, raised surfaces
  bgHover: "#334155", // hover state

  // Brand / accent
  teal: "#00d1b2",
  tealDark: "#009f87",

  // Simulator
  simActive: "#facc15",
  simBranch: "#a78bfa",

  // Heatmap
  heatCold: "#3b82f6",
  heatWarm: "#f59e0b",
  heatHot: "#ef4444",

  // Complexity bands
  complexLow: "#22c55e",
  complexMedium: "#f59e0b",
  complexHigh: "#ef4444",

  // Text
  textPrimary: "#e2e8f0",
  textSecondary: "#94a3b8",
  textMuted: "#475569",
  textFaint: "#334155",

  // Node types
  nodeClass: { bg: "#1e1b4b", border: "#6366f1", text: "#a5b4fc" },
  nodeFunction: { bg: "#0f2a27", border: "#00d1b2", text: "#5eead4" },
  nodeLoop: { bg: "#052e16", border: "#22c55e", text: "#86efac" },
  nodeCondition: { bg: "#451a03", border: "#f59e0b", text: "#fcd34d" },
  nodeTryCatch: { bg: "#2d0a0a", border: "#ef4444", text: "#fca5a5" },
  nodeImport: { bg: "#0f172a", border: "#475569", text: "#94a3b8" },
  nodeExport: { bg: "#0f172a", border: "#334155", text: "#64748b" },
  nodeReturn: { bg: "#2d1040", border: "#f472b6", text: "#f9a8d4" },
  nodeVariable: { bg: "#0f172a", border: "#334155", text: "#cbd5e1" },
};

// Typography
export const FONT = {
  mono: "'Fira Code', 'Cascadia Code', 'JetBrains Mono', monospace",
  system: "'Inter', 'Segoe UI', system-ui, -apple-system, sans-serif",
};

// Spacing / sizing
export const SIZE = {
  headerH: 52,
  simBarH: 34,
  sidebarW: 380,
  resizeW: 5,
  editorDefaultPct: 38,
  borderRadius: 8,
  borderRadiusSm: 5,
};

// Z-index layers
export const Z = {
  header: 10,
  overlay: 100,
  tooltip: 200,
};

// Animation durations
export const ANIM = {
  fast: "0.15s",
  normal: "0.25s",
  slow: "0.4s",
};
