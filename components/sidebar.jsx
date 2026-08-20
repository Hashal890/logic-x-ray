import AIRenderer from "./ai-renderer";
import { depthColor } from "../lib/nodeStyles";

const complexityColor = (n) =>
  n > 10 ? "#ef4444" : n > 5 ? "#f59e0b" : "#22c55e";

const SectionLabel = ({ color = "#64748b", children }) => (
  <div
    style={{
      fontSize: 11,
      fontWeight: 700,
      textTransform: "uppercase",
      letterSpacing: 1,
      color,
      marginBottom: 8,
    }}
  >
    {children}
  </div>
);

function ComplexityRow({ label, value, source }) {
  const color = complexityColor(value);
  const tagColor = source === "ai" ? "#818cf8" : "#38bdf8";
  const tagBorder = source === "ai" ? "#4f46e5" : "#0369a1";
  const tagBg = source === "ai" ? "#1e1b4b" : "#0c2a3f";

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "6px 0",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <span style={{ color: "#64748b", fontSize: 12 }}>{label}</span>
        <span
          style={{
            fontSize: 9,
            fontWeight: 700,
            textTransform: "uppercase",
            letterSpacing: "0.6px",
            padding: "1px 6px",
            borderRadius: 4,
            background: tagBg,
            color: tagColor,
            border: `1px solid ${tagBorder}`,
          }}
        >
          {source === "ai" ? "AI" : "Static"}
        </span>
      </div>
      <span style={{ fontWeight: 800, fontSize: 20, color, lineHeight: 1 }}>
        {value}
      </span>
    </div>
  );
}

function SuggestionItem({ text, accentColor }) {
  return (
    <div
      style={{
        display: "flex",
        gap: 7,
        marginBottom: 6,
        alignItems: "flex-start",
      }}
    >
      <span style={{ color: accentColor, flexShrink: 0, marginTop: 1 }}>›</span>
      <span style={{ color: "#cbd5e1", fontSize: 12, lineHeight: 1.5 }}>
        {text}
      </span>
    </div>
  );
}

export default function Sidebar({
  // static engine
  complexity,
  suggestions,
  // AI-extracted
  aiComplexity,
  aiSuggestions,
  // full AI response
  aiAnalysis,
  isAnalyzing,
  onAnalyze,
  onInsert,
  // heatmap / graph stats
  nodes = [],
  edges = [],
  onJumpToNode,
}) {
  const hasAiMeta = aiComplexity !== null && aiComplexity !== undefined;
  const hasAiSuggs = aiSuggestions?.length > 0;

  const showDivider = hasAiMeta;

  const hotspots = [...nodes]
    .filter((n) => Number.isFinite(n.data?.depth) && n.data.depth >= 1)
    .sort((a, b) => b.data.depth - a.data.depth)
    .slice(0, 3);

  return (
    <div
      style={{
        width: 400,
        flexShrink: 0,
        borderLeft: "1px solid #1e293b",
        background: "#020617",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
        minHeight: 0,
      }}
    >
      <div
        style={{
          padding: "10px 14px",
          borderBottom: "1px solid #1e293b",
          flexShrink: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <div style={{ display: "flex", alignItems: "baseline", gap: 10 }}>
          <span
            style={{
              color: "#00d1b2",
              fontWeight: 700,
              fontSize: 13,
              letterSpacing: 1,
            }}
          >
            CODE ANALYSIS
          </span>
          <span style={{ color: "#475569", fontSize: 11 }}>
            {nodes.length} nodes · {edges.length} edges
          </span>
        </div>
        <button
          onClick={onAnalyze}
          disabled={isAnalyzing}
          style={{
            background: isAnalyzing ? "#1e293b" : "#00d1b2",
            color: isAnalyzing ? "#475569" : "#020617",
            border: "none",
            borderRadius: 6,
            padding: "5px 12px",
            fontSize: 12,
            fontWeight: 700,
            cursor: isAnalyzing ? "not-allowed" : "pointer",
            transition: "all .2s",
          }}
        >
          {isAnalyzing ? "Analyzing…" : "Analyze with AI"}
        </button>
      </div>

      <div
        style={{
          flex: 1,
          overflowY: "auto",
          overflowX: "hidden",
          padding: "14px 14px 20px 14px",
          minHeight: 0,
        }}
      >
        <div
          style={{
            background: "#0f172a",
            border: "1px solid #1e293b",
            borderRadius: 8,
            padding: "8px 12px",
            marginBottom: 16,
          }}
        >
          <SectionLabel color="#475569">Cyclomatic Complexity</SectionLabel>
          <ComplexityRow
            label="Static parser"
            value={complexity}
            source="static"
          />
          {showDivider && (
            <div style={{ borderTop: "1px solid #1e293b", margin: "2px 0" }} />
          )}
          {hasAiMeta && (
            <ComplexityRow
              label="AI analysis"
              value={aiComplexity}
              source="ai"
            />
          )}
          {!hasAiMeta && (
            <div style={{ fontSize: 11, color: "#334155", paddingTop: 4 }}>
              Run "Analyze with AI" to see AI complexity
            </div>
          )}
          {hasAiMeta && Math.abs(complexity - aiComplexity) > 2 && (
            <div
              style={{
                marginTop: 8,
                padding: "5px 8px",
                background: "rgba(245,158,11,.08)",
                border: "1px solid #78350f",
                borderRadius: 5,
                fontSize: 11,
                color: "#fbbf24",
              }}
            >
              ⚠ Values differ by {Math.abs(complexity - aiComplexity)} — parsers
              use different counting rules
            </div>
          )}
        </div>

        {hotspots.length > 0 && (
          <div style={{ marginBottom: 16 }}>
            <SectionLabel color="#f59e0b">⚠ Complexity Hotspots</SectionLabel>
            {hotspots.map((n) => {
              const color = depthColor(n.data.depth);
              return (
                <div
                  key={n.id}
                  onClick={() => onJumpToNode?.(n)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: 8,
                    padding: "6px 8px",
                    marginBottom: 4,
                    borderRadius: 6,
                    background: "#0f172a",
                    border: "1px solid #1e293b",
                    cursor: onJumpToNode ? "pointer" : "default",
                  }}
                >
                  <span
                    style={{
                      color: "#cbd5e1",
                      fontSize: 12,
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {n.data.label}
                  </span>
                  <span
                    style={{
                      flexShrink: 0,
                      fontSize: 10,
                      fontWeight: 700,
                      padding: "1px 7px",
                      borderRadius: 10,
                      background: `${color}22`,
                      color,
                      border: `1px solid ${color}`,
                    }}
                  >
                    depth {n.data.depth}
                  </span>
                </div>
              );
            })}
            <div style={{ fontSize: 11, color: "#334155", marginTop: 4 }}>
              Tip: deeply nested blocks are harder to test — consider
              extracting them into named functions.
            </div>
          </div>
        )}

        {suggestions.length > 0 && (
          <div style={{ marginBottom: 16 }}>
            <SectionLabel color="#38bdf8">⚙ Static Suggestions</SectionLabel>
            {suggestions.map((s, i) => (
              <SuggestionItem key={i} text={s} accentColor="#38bdf8" />
            ))}
          </div>
        )}

        {hasAiSuggs && (
          <div style={{ marginBottom: 16 }}>
            <SectionLabel color="#818cf8">✦ AI Suggestions</SectionLabel>
            {aiSuggestions.map((s, i) => (
              <SuggestionItem key={i} text={s} accentColor="#818cf8" />
            ))}
          </div>
        )}

        {aiAnalysis && (
          <>
            <div
              style={{
                fontSize: 11,
                fontWeight: 700,
                textTransform: "uppercase",
                letterSpacing: 1,
                color: "#00d1b2",
                marginBottom: 10,
                borderTop: "1px solid #1e293b",
                paddingTop: 14,
              }}
            >
              AI Analysis
            </div>
            {aiAnalysis === "__loading__" ? (
              <div
                style={{
                  textAlign: "center",
                  padding: "30px 0",
                  color: "#475569",
                }}
              >
                <div style={{ fontSize: 28, marginBottom: 10 }}>⏳</div>
                <div style={{ fontSize: 13 }}>Analyzing your code…</div>
              </div>
            ) : (
              <AIRenderer text={aiAnalysis} onInsert={onInsert} />
            )}
          </>
        )}
      </div>
    </div>
  );
}
