// Renders plain-text AI response segments cleanly
export default function TextSegment({ content }) {
  const lines = content.split("\n");
  const out = [];

  for (let i = 0; i < lines.length; i++) {
    const raw = lines[i];
    const t = raw.trim();

    // Skip empty lines — spacing is handled by margins, not blank lines
    if (!t) continue;

    // ── Strip markdown headings (###, ##, #) ──────────────────────────
    // These come through from AI responses and should be rendered as
    // styled labels, not shown as raw "### text"
    const headingMatch = t.match(/^#{1,3}\s+(.+)/);
    if (headingMatch) {
      out.push(
        <div
          key={i}
          style={{
            fontSize: 12,
            fontWeight: 700,
            color: "#94a3b8",
            marginTop: 14,
            marginBottom: 4,
            letterSpacing: "0.3px",
          }}
        >
          {headingMatch[1].replace(/`/g, "")}
        </div>,
      );
      continue;
    }

    // ── Bold-only lines → section subheading ─────────────────────────
    if (/^\*\*[^*]{2,60}\*\*:?$/.test(t)) {
      out.push(
        <div
          key={i}
          style={{
            fontSize: 11,
            fontWeight: 700,
            textTransform: "uppercase",
            letterSpacing: 1,
            color: "#00d1b2",
            borderBottom: "1px solid #1e293b",
            paddingBottom: 4,
            marginTop: 14,
            marginBottom: 6,
          }}
        >
          {t.replace(/\*\*/g, "").replace(/:$/, "")}
        </div>,
      );
      continue;
    }

    // ── List items ────────────────────────────────────────────────────
    if (/^(\d+\.|[-•*])/.test(t)) {
      const text = t.replace(/^(\d+\.|[-•*])\s*/, "");
      const parts = renderBold(text);
      out.push(
        <div
          key={i}
          style={{
            display: "flex",
            gap: 7,
            marginBottom: 5,
            alignItems: "flex-start",
          }}
        >
          <span
            style={{
              color: "#00d1b2",
              flexShrink: 0,
              marginTop: 2,
              fontSize: 11,
            }}
          >
            ›
          </span>
          <span style={{ color: "#cbd5e1", fontSize: 12, lineHeight: 1.6 }}>
            {parts}
          </span>
        </div>,
      );
      continue;
    }

    // ── Regular paragraph line ────────────────────────────────────────
    const parts = renderBold(t);
    out.push(
      <div
        key={i}
        style={{
          color: "#94a3b8",
          fontSize: 12,
          lineHeight: 1.6,
          marginBottom: 2,
        }}
      >
        {parts}
      </div>,
    );
  }

  return <div style={{ marginBottom: 4 }}>{out}</div>;
}

// Inline bold: **text** → <strong>
function renderBold(text) {
  return text.split(/(\*\*[^*]+\*\*)/).map((p, i) =>
    p.startsWith("**") && p.endsWith("**") ? (
      <strong key={i} style={{ color: "#e2e8f0" }}>
        {p.slice(2, -2)}
      </strong>
    ) : (
      p
    ),
  );
}
