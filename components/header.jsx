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

// Language options shaped for react-select
const LANG_OPTIONS = SUPPORTED_LANGUAGES.map((l) => ({
  value: l.value,
  label: l.label,
}));

export default function Header({
  indentSize,
  onIndentChange,
  language,
  onLanguageChange,
  onFormat,
  onReset,
  onLoadDemo,
}) {
  const actions = [
    ["Format Code", onFormat],
    ["Reset to Original", onReset],
    ["Load Demo", onLoadDemo],
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
        {/* Language selector */}
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

        {/* Indent selector */}
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
      </div>
    </header>
  );
}
