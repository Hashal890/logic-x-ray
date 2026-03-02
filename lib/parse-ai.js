// Splits raw AI response text into { type: "text" | "code", content, lang? } segments
export function parseAIText(raw) {
  const segs = [];
  const text = raw.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  const re = /```(\w*)\n?([\s\S]*?)(?:```|$)/g;
  let last = 0,
    m;

  while ((m = re.exec(text)) !== null) {
    const codeContent = m[2].trim();
    if (!codeContent) continue;
    if (m.index > last)
      segs.push({ type: "text", content: text.slice(last, m.index) });
    segs.push({ type: "code", lang: m[1] || "js", content: codeContent });
    last = m.index + m[0].length;
  }

  if (last < text.length)
    segs.push({ type: "text", content: text.slice(last) });
  return segs;
}

/**
 * Scrape the AI's plain-text response for:
 *   - A complexity number
 *   - Bullet suggestions (real actionable items only)
 *
 * Returns { aiComplexity: number|null, aiSuggestions: string[] }
 */
export function extractAIMeta(raw) {
  // Strip code blocks before scanning prose
  const text = raw.replace(/```[\s\S]*?```/g, "");

  // ── Complexity ──────────────────────────────────────────────────
  let aiComplexity = null;
  const cxPatterns = [
    /complexity[^\d]{0,20}(\d+)/i,
    /(\d+)[^\d]{0,20}complexity/i,
  ];
  for (const pat of cxPatterns) {
    const m = text.match(pat);
    if (m) {
      aiComplexity = parseInt(m[1], 10);
      break;
    }
  }

  // ── Suggestions ─────────────────────────────────────────────────
  const aiSuggestions = text
    .split("\n")
    .map((l) => l.trim())
    // Must start with a real list marker: "- ", "• ", "1. ", "2. " etc.
    .filter((l) => /^(\d+\.|[-•])\s+/.test(l))
    // Strip the leading marker
    .map((l) => l.replace(/^(\d+\.|[-•])\s*/, "").trim())
    // Reject lines that are markdown section headers (contain ** or are ALL CAPS)
    .filter((l) => !/\*\*/.test(l) && !/^[A-Z\s:]{6,}$/.test(l))
    // Reject very short or very long lines (likely noise)
    .filter((l) => l.length > 15 && l.length < 300);

  return { aiComplexity, aiSuggestions };
}
