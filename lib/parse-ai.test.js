import { describe, it, expect } from "vitest";
import {
  looksIncomplete,
  responseHasPlaceholderCode,
  parseAIText,
  extractAIMeta,
} from "./parse-ai";

const longOriginal = Array.from({ length: 20 }, (_, i) => `line ${i}`).join("\n");

describe("looksIncomplete", () => {
  it("flags a '// ...' placeholder", () => {
    expect(looksIncomplete("function f() {\n  // ...\n}", longOriginal)).toBe(true);
  });

  it("flags 'rest of the code' / 'remains unchanged' phrasing", () => {
    expect(looksIncomplete("// rest of the code stays the same", longOriginal)).toBe(true);
    expect(looksIncomplete("everything else remains unchanged\n", longOriginal)).toBe(true);
  });

  it("flags a candidate far shorter than the original", () => {
    const candidate = "line 1\nline 2\nline 3";
    expect(looksIncomplete(candidate, longOriginal)).toBe(true);
  });

  it("does not flag a full-length candidate with no placeholder text", () => {
    const candidate = Array.from({ length: 20 }, (_, i) => `updated line ${i}`).join("\n");
    expect(looksIncomplete(candidate, longOriginal)).toBe(false);
  });

  it("ignores the length check for a short original file", () => {
    const shortOriginal = "a\nb\nc";
    expect(looksIncomplete("a", shortOriginal)).toBe(false);
  });
});

describe("responseHasPlaceholderCode", () => {
  it("detects a placeholder inside a fenced code block", () => {
    const raw = "Here you go:\n```js\nfunction f() {\n  // ...\n}\n```";
    expect(responseHasPlaceholderCode(raw)).toBe(true);
  });

  it("ignores placeholder-like phrasing outside of code blocks", () => {
    const raw = "The rest of the code remains unchanged.\n```js\nconst x = 1;\n```";
    expect(responseHasPlaceholderCode(raw)).toBe(false);
  });

  it("returns false for a clean response", () => {
    const raw = "```js\nfunction add(a, b) {\n  return a + b;\n}\n```";
    expect(responseHasPlaceholderCode(raw)).toBe(false);
  });
});

describe("parseAIText", () => {
  it("splits surrounding text from a fenced code block", () => {
    const segs = parseAIText("before\n```js\nconst x = 1;\n```\nafter");
    expect(segs).toEqual([
      { type: "text", content: "before\n" },
      { type: "code", lang: "js", content: "const x = 1;" },
      { type: "text", content: "\nafter" },
    ]);
  });

  it("defaults to 'js' when the fence has no language tag", () => {
    const segs = parseAIText("```\nconst x = 1;\n```");
    expect(segs[0]).toEqual({ type: "code", lang: "js", content: "const x = 1;" });
  });

  it("skips an empty code fence", () => {
    const segs = parseAIText("text before\n```\n```\ntext after");
    expect(segs.some((s) => s.type === "code")).toBe(false);
  });

  it("captures an unterminated fence through to the end of the text", () => {
    const segs = parseAIText("```js\nconst x = 1;");
    expect(segs).toEqual([{ type: "code", lang: "js", content: "const x = 1;" }]);
  });
});

describe("extractAIMeta", () => {
  it("extracts a complexity number regardless of phrasing order", () => {
    expect(extractAIMeta("Complexity: 7").aiComplexity).toBe(7);
    expect(extractAIMeta("7 (complexity)").aiComplexity).toBe(7);
  });

  it("returns null complexity when no number is present", () => {
    expect(extractAIMeta("No complexity info here.").aiComplexity).toBeNull();
  });

  it("extracts bullet ('-'/'•') and numbered suggestions", () => {
    const raw = [
      "- Extract this block into its own function for readability.",
      "1. Use a Map instead of an object for the lookup table.",
      "• Rename the variable to something more descriptive.",
    ].join("\n");
    const { aiSuggestions } = extractAIMeta(raw);
    expect(aiSuggestions).toEqual([
      "Extract this block into its own function for readability.",
      "Use a Map instead of an object for the lookup table.",
      "Rename the variable to something more descriptive.",
    ]);
  });

  it("does not treat an asterisk bullet as a suggestion marker", () => {
    const raw = "* This line uses an asterisk bullet, which the parser does not recognize.";
    expect(extractAIMeta(raw).aiSuggestions).toEqual([]);
  });

  it("skips section headers and noise lines", () => {
    const raw = [
      "- **SUGGESTIONS**",
      "- SHORT",
      "- This one is a real suggestion long enough to keep around.",
    ].join("\n");
    const { aiSuggestions } = extractAIMeta(raw);
    expect(aiSuggestions).toEqual([
      "This one is a real suggestion long enough to keep around.",
    ]);
  });

  it("ignores suggestion-like lines inside code blocks", () => {
    const raw = "```js\n// - not a real suggestion, just a comment in code that is long\n```";
    expect(extractAIMeta(raw).aiSuggestions).toEqual([]);
  });
});
