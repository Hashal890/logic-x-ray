import { formatValue } from "../lib/exprEval";

// Live variable-state panel shown while the dry-run simulator is active —
// docks under the StatusBar, top-left of the canvas. Only ever shows
// values this session's conservative evaluator could actually resolve;
// anything it can't (function calls, member access, ...) renders as "?"
// rather than guessing.
export default function VariablePanel({ varState }) {
  const entries = Object.entries(varState ?? {});
  if (entries.length === 0) return null;

  return (
    <div
      style={{
        position: "absolute",
        top: 56,
        left: 16,
        background: "#0f172a",
        border: "1px solid #334155",
        borderRadius: 8,
        padding: "8px 12px",
        fontSize: 12,
        color: "#94a3b8",
        zIndex: 15,
        pointerEvents: "none",
        maxWidth: 220,
      }}
    >
      <div
        style={{
          fontSize: 10,
          fontWeight: 700,
          textTransform: "uppercase",
          letterSpacing: 1,
          color: "#64748b",
          marginBottom: 6,
        }}
      >
        Variables
      </div>
      {entries.map(([name, value]) => (
        <div
          key={name}
          style={{
            display: "flex",
            justifyContent: "space-between",
            gap: 12,
            fontFamily: "'Fira Code', monospace",
            fontSize: 12,
            lineHeight: 1.6,
          }}
        >
          <span style={{ color: "#5eead4" }}>{name}</span>
          <span style={{ color: value === undefined ? "#57534e" : "#e2e8f0" }}>
            {formatValue(value)}
          </span>
        </div>
      ))}
    </div>
  );
}
