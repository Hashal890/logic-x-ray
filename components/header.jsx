import Select from "react-select";
import { selStyles } from "../lib/select-styles";
import { SUPPORTED_LANGUAGES } from "../lib/parsers/index";

const INDENT_OPTIONS = [
  { value: 2, label: "2 spaces" },
  { value: 4, label: "4 spaces" },
  { value: 6, label: "6 spaces" },
  { value: 8, label: "8 spaces" },
  { value: "tab", label: "Tab →" },
];

const LANG_OPTIONS = SUPPORTED_LANGUAGES.map((l) => ({
  value: l.value,
  label: l.label,
}));

const iconBtnStyle = {
  background: "transparent",
  color: "#e2e8f0",
  border: "1px solid #334155",
  width: 32,
  height: 32,
  borderRadius: 6,
  cursor: "pointer",
  fontSize: 13,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  transition: "all .15s",
};

export default function Header({
  indentSize,
  onIndentChange,
  language,
  onLanguageChange,
  onFormat,
  onReset,
  onLoadDemo,
  onShare,
  onExportPng,
  onExportSvg,
  isExportingFlow,
  heatmapOn,
  onToggleHeatmap,
  minimapOn,
  onToggleMinimap,
  nodesCount = 0,
  // Simulator controls
  simIsPlaying,
  simIsPaused,
  onSimStart,
  onSimPause,
  onSimResume,
  onSimStep,
  onSimStop,
  simSpeed,
  onSimSpeedChange,
}) {
  const actions = [
    ["Format Code", onFormat],
    ["Reset to Original", onReset],
    ["Load Demo", onLoadDemo],
    ["🔗 Share", onShare],
  ];

  return (
    <header
      style={{
        height: 52,
        flexShrink: 0,
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "0 18px",
        background: "#020617",
        borderBottom: "1px solid #1e293b",
        zIndex: 10,
      }}
    >
      <span
        style={{
          fontSize: 17,
          fontWeight: 800,
          letterSpacing: 3,
          color: "#00d1b2",
        }}
      >
        LOGIC-X-RAY
      </span>

      <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
        <span style={{ color: "#475569", fontSize: 12 }}>Language:</span>
        <Select
          value={LANG_OPTIONS.find((o) => o.value === language)}
          onChange={(o) => onLanguageChange(o.value)}
          isSearchable={false}
          styles={{
            ...selStyles,
            control: (b) => ({
              ...selStyles.control(b),
              minWidth: 130,
              borderColor: "#6366f1",
            }),
            singleValue: (b) => ({ ...b, color: "#a5b4fc" }),
          }}
          options={LANG_OPTIONS}
        />

        <span style={{ color: "#475569", fontSize: 12, marginLeft: 4 }}>
          Indent:
        </span>
        <Select
          value={{
            value: indentSize,
            label: indentSize === "tab" ? "Tab" : `${indentSize} spaces`,
          }}
          onChange={(o) => onIndentChange(o.value)}
          isSearchable={false}
          styles={selStyles}
          options={INDENT_OPTIONS}
        />

        {actions.map(([label, fn]) => (
          <button
            key={label}
            onClick={fn}
            style={{
              background: "transparent",
              color: "#e2e8f0",
              border: "1px solid #334155",
              padding: "0 13px",
              height: 32,
              borderRadius: 6,
              cursor: "pointer",
              fontSize: 12,
              fontWeight: 500,
              transition: "all .15s",
              display: "flex",
              alignItems: "center",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = "#00d1b2";
              e.currentTarget.style.color = "#00d1b2";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = "#334155";
              e.currentTarget.style.color = "#e2e8f0";
            }}
          >
            {label}
          </button>
        ))}

        {/* Heatmap toggle — active state needs its own styling, so it's
            special-cased outside the generic actions loop above. */}
        <button
          onClick={onToggleHeatmap}
          title="Toggle complexity heatmap"
          style={{
            background: heatmapOn ? "#1e293b" : "transparent",
            color: heatmapOn ? "#f59e0b" : "#e2e8f0",
            border: `1px solid ${heatmapOn ? "#f59e0b" : "#334155"}`,
            padding: "0 13px",
            height: 32,
            borderRadius: 6,
            cursor: "pointer",
            fontSize: 12,
            fontWeight: 500,
            transition: "all .15s",
            display: "flex",
            alignItems: "center",
          }}
        >
          🔥 Heatmap
        </button>

        <button
          onClick={onToggleMinimap}
          title="Toggle minimap"
          style={{
            background: minimapOn ? "#1e293b" : "transparent",
            color: minimapOn ? "#00d1b2" : "#e2e8f0",
            border: `1px solid ${minimapOn ? "#00d1b2" : "#334155"}`,
            padding: "0 13px",
            height: 32,
            borderRadius: 6,
            cursor: "pointer",
            fontSize: 12,
            fontWeight: 500,
            transition: "all .15s",
            display: "flex",
            alignItems: "center",
          }}
        >
          ⊞ Map
        </button>

        <div style={{ display: "flex", gap: 4 }}>
          <button
            onClick={onExportPng}
            disabled={isExportingFlow}
            title="Export flowchart as PNG"
            style={{
              ...iconBtnStyle,
              width: "auto",
              padding: "0 10px",
              opacity: isExportingFlow ? 0.5 : 1,
              cursor: isExportingFlow ? "not-allowed" : "pointer",
            }}
          >
            ⬇ PNG
          </button>
          <button
            onClick={onExportSvg}
            disabled={isExportingFlow}
            title="Export flowchart as SVG"
            style={{
              ...iconBtnStyle,
              width: "auto",
              padding: "0 10px",
              opacity: isExportingFlow ? 0.5 : 1,
              cursor: isExportingFlow ? "not-allowed" : "pointer",
            }}
          >
            ⬇ SVG
          </button>
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            marginLeft: 6,
            paddingLeft: 12,
            borderLeft: "1px solid #1e293b",
          }}
        >
          {!simIsPlaying ? (
            <button
              onClick={onSimStart}
              disabled={nodesCount === 0}
              title="Start Simulation"
              style={{
                ...iconBtnStyle,
                width: "auto",
                padding: "0 12px",
                opacity: nodesCount === 0 ? 0.5 : 1,
                cursor: nodesCount === 0 ? "not-allowed" : "pointer",
                borderColor: "#22c55e",
                color: "#22c55e",
              }}
            >
              ▶ Start Simulation
            </button>
          ) : (
            <>
              {simIsPaused ? (
                <button
                  onClick={onSimResume}
                  title="Resume"
                  style={{ ...iconBtnStyle, borderColor: "#22c55e", color: "#22c55e" }}
                >
                  ▶
                </button>
              ) : (
                <button
                  onClick={onSimPause}
                  title="Pause"
                  style={{ ...iconBtnStyle, borderColor: "#facc15", color: "#facc15" }}
                >
                  ⏸
                </button>
              )}
              {simIsPaused && (
                <button
                  onClick={onSimStep}
                  title="Step Forward"
                  style={{ ...iconBtnStyle, borderColor: "#a78bfa", color: "#a78bfa" }}
                >
                  ▷
                </button>
              )}
              <button
                onClick={onSimStop}
                title="Stop"
                style={{ ...iconBtnStyle, borderColor: "#ef4444", color: "#ef4444" }}
              >
                ■
              </button>
              <input
                type="number"
                min={0.2}
                max={10}
                step={0.1}
                value={simSpeed}
                onChange={(e) => onSimSpeedChange(Number(e.target.value))}
                title="Speed (seconds per step)"
                style={{
                  width: 52,
                  height: 32,
                  background: "#0f172a",
                  border: "1px solid #334155",
                  borderRadius: 6,
                  color: "#e2e8f0",
                  fontSize: 12,
                  textAlign: "center",
                }}
              />
              <span style={{ color: "#475569", fontSize: 11 }}>s/step</span>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
