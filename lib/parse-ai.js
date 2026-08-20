// AI models sometimes ignore "reproduce the full file" instructions and
// hand back an abbreviated snippet instead (e.g. "// rest unchanged") —
// inserting that would silently wipe out the rest of the user's code.
const PLACEHOLDER_RE =
  /(\/\/|#|\/\*)\s*\.\.\.|rest (of the )?(code|file)|remains? (the )?(same|unchanged)|same as (before|above)|unchanged\)?\s*$/im;

export function looksIncomplete(candidate, originalCode) {
  if (PLACEHOLDER_RE.test(candidate)) return true;
  const originalLines = originalCode.trim().split("\n").length;
  const candidateLines = candidate.trim().split("\n").length;
  return originalLines > 8 && candidateLines < originalLines * 0.5;
}

// Server-side check on a full AI response: does any of its fenced code
// blocks contain a placeholder instead of real code? Used to reject a
// response and fall through to the next model rather than showing the
// user (and Insert) an abbreviated snippet.
export function responseHasPlaceholderCode(raw) {
  return parseAIText(raw).some(
    (seg) => seg.type === "code" && PLACEHOLDER_RE.test(seg.content),
  );
}

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

// scrapes the AI's plain-text response for a complexity number and any
// bullet-style suggestions
export function extractAIMeta(raw) {
  const text = raw.replace(/```[\s\S]*?```/g, ""); // drop code blocks first

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

  const aiSuggestions = text
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => /^(\d+\.|[-•])\s+/.test(l)) // real list markers only
    .map((l) => l.replace(/^(\d+\.|[-•])\s*/, "").trim())
    .filter((l) => !/\*\*/.test(l) && !/^[A-Z\s:]{6,}$/.test(l)) // skip headers
    .filter((l) => l.length > 15 && l.length < 300); // skip noise

  return { aiComplexity, aiSuggestions };
}
