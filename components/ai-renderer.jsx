import CodeBlock from "./code-block";
import TextSegment from "./text-segment";
import { parseAIText } from "../lib/parse-ai";

// these are already shown as sidebar cards, so drop them from the raw text
const SKIP_HEADINGS = /^(errors|complexity|suggestions)$/i;

function suppressExtractedSections(raw) {
  const lines = raw.split("\n");
  const out = [];
  let skipping = false;

  for (const line of lines) {
    const t = line.trim();

    const isHeading =
      /^\*\*[^*]{2,30}\*\*:?$/.test(t) ||
      /^[A-Z][A-Z\s]{2,28}[A-Z]:?$/.test(t) ||
      /^#{1,3}\s+/.test(t);

    if (isHeading) {
      const label = t
        .replace(/^#{1,3}\s+/, "")
        .replace(/\*\*/g, "")
        .replace(/:$/, "")
        .trim();
      skipping = SKIP_HEADINGS.test(label);
    }

    if (!skipping) out.push(line);
  }

  return out.join("\n");
}

// pairs each code block with the title line right before it so they
// render as one unit instead of two loosely-spaced segments
function buildSegmentPairs(segs) {
  const pairs = [];
  let i = 0;
  while (i < segs.length) {
    const seg = segs[i];
    if (
      seg.type === "text" &&
      i + 1 < segs.length &&
      segs[i + 1].type === "code"
    ) {
      const lines = seg.content.trimEnd().split("\n");
      const lastLine = lines[lines.length - 1].trim();
      const isTitle = /^#{1,3}\s+/.test(lastLine) || lastLine.length < 80;

      if (isTitle) {
        const beforeTitle = lines.slice(0, -1).join("\n");
        pairs.push({ type: "text", content: beforeTitle });
        pairs.push({ type: "titled-code", title: lastLine, code: segs[i + 1] });
        i += 2;
        continue;
      }
    }
    pairs.push(seg);
    i++;
  }
  return pairs;
}

export default function AIRenderer({ text, onInsert }) {
  const cleaned = suppressExtractedSections(text);
  const segs = parseAIText(cleaned);
  const pairs = buildSegmentPairs(segs);

  let codeIndex = 0;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
      {pairs.map((seg, i) => {
        if (seg.type === "titled-code") {
          const idx = codeIndex++;
          return (
            <div key={i} style={{ marginBottom: 8 }}>
              <div
                style={{
                  fontSize: 11,
                  color: "#64748b",
                  marginBottom: 4,
                  paddingLeft: 2,
                  fontStyle: "italic",
                }}
              >
                {seg.title.replace(/^#{1,3}\s+/, "").replace(/`/g, "")}
              </div>
              <CodeBlock
                lang={seg.code.lang}
                content={seg.code.content}
                index={idx}
                onInsert={onInsert}
              />
            </div>
          );
        }

        if (seg.type === "code") {
          return (
            <CodeBlock
              key={i}
              lang={seg.lang}
              content={seg.content}
              index={codeIndex++}
              onInsert={onInsert}
            />
          );
        }

        if (seg.content?.trim()) {
          return <TextSegment key={i} content={seg.content} />;
        }

        return null;
      })}
    </div>
  );
}
