import { useState } from "react";

const btnBase = {
  border: "1px solid #334155",
  borderRadius: 5,
  padding: "3px 10px",
  fontSize: 11,
  fontWeight: 600,
  cursor: "pointer",
  transition: "all .15s",
};

export default function CodeBlock({ lang, content, index, onInsert }) {
  const [open, setOpen] = useState(true);
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div
      style={{
        border: "1px solid #334155",
        borderRadius: 8,
        overflow: "hidden",
        marginBottom: 12,
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          padding: "7px 10px",
          background: "#0f172a",
          borderBottom: open ? "1px solid #1e293b" : "none",
        }}
      >
        <span
          style={{
            color: "#e2e8f0",
            fontSize: 13,
            fontWeight: 600,
            flexShrink: 0,
          }}
        >
          Version {index + 1}
        </span>
        <span
          style={{
            fontSize: 10,
            background: "#1e293b",
            color: "#00d1b2",
            padding: "1px 7px",
            borderRadius: 4,
            textTransform: "uppercase",
            letterSpacing: "0.5px",
            border: "1px solid #334155",
            flexShrink: 0,
          }}
        >
          {lang}
        </span>
        <div style={{ flex: 1 }} />

        <button
          onClick={() => onInsert(content)}
          title="Insert into editor"
          style={{
            ...btnBase,
            background: "#0f4c35",
            color: "#34d399",
            borderColor: "#065f46",
          }}
          onMouseEnter={(e) => (e.currentTarget.style.background = "#065f46")}
          onMouseLeave={(e) => (e.currentTarget.style.background = "#0f4c35")}
        >
          ↙ Insert
        </button>

        <button
          onClick={handleCopy}
          title="Copy to clipboard"
          style={{
            ...btnBase,
            background: copied ? "#1e3a5f" : "#1e293b",
            color: copied ? "#60a5fa" : "#94a3b8",
            borderColor: copied ? "#3b82f6" : "#334155",
          }}
          onMouseEnter={(e) => {
            if (!copied) e.currentTarget.style.borderColor = "#60a5fa";
          }}
          onMouseLeave={(e) => {
            if (!copied) e.currentTarget.style.borderColor = "#334155";
          }}
        >
          {copied ? "✓ Copied" : "⎘ Copy"}
        </button>

        <button
          onClick={() => setOpen((o) => !o)}
          title={open ? "Collapse" : "Expand"}
          style={{
            ...btnBase,
            background: "transparent",
            color: open ? "#00d1b2" : "#64748b",
            borderColor: open ? "#00d1b2" : "#334155",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.borderColor = "#00d1b2";
            e.currentTarget.style.color = "#00d1b2";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = open ? "#00d1b2" : "#334155";
            e.currentTarget.style.color = open ? "#00d1b2" : "#64748b";
          }}
        >
          {open ? "▼" : "▶"}
        </button>
      </div>

      {open && (
        <div
          style={{ overflowX: "auto", maxHeight: 320, background: "#020617" }}
        >
          <pre
            style={{
              margin: 0,
              padding: "12px 14px",
              fontSize: 12,
              fontFamily: "'Fira Code', monospace",
              color: "#e2e8f0",
              lineHeight: 1.6,
              whiteSpace: "pre",
            }}
          >
            {content}
          </pre>
        </div>
      )}
    </div>
  );
}
