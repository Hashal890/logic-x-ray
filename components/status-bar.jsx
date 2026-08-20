export default function StatusBar({ stepCount, speed, isPaused }) {
  return (
    <div
      style={{
        position: "absolute",
        top: 16,
        left: 16,
        display: "flex",
        alignItems: "center",
        gap: 10,
        background: isPaused ? "rgba(245,158,11,.15)" : "#0f172a",
        border: `1px solid ${isPaused ? "#f59e0b" : "#334155"}`,
        borderRadius: 8,
        padding: "6px 12px",
        fontSize: 12,
        color: isPaused ? "#fbbf24" : "#94a3b8",
        zIndex: 15,
        pointerEvents: "none",
      }}
    >
      <span style={{ fontWeight: 700 }}>
        {isPaused ? "⏸ Paused" : "▶ Running"} · Step {stepCount}
      </span>
      <span
        style={{
          fontSize: 10,
          background: "#1e293b",
          padding: "1px 7px",
          borderRadius: 4,
          border: "1px solid #334155",
          color: "#64748b",
        }}
      >
        {speed.toFixed(1)}s/step
      </span>
    </div>
  );
}
