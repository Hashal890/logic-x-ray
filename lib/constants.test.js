import { describe, it, expect } from "vitest";
import { AI_PROMPT } from "./constants";

describe("AI_PROMPT", () => {
  it("maps known language values to their display label", () => {
    expect(AI_PROMPT("code", "javascript")).toContain("expert JavaScript code reviewer");
    expect(AI_PROMPT("code", "cpp")).toContain("expert C++ code reviewer");
    expect(AI_PROMPT("code", "python")).toContain("expert Python code reviewer");
  });

  it("falls back to a generic label for an unrecognized language", () => {
    expect(AI_PROMPT("code", "rust")).toContain("expert code code reviewer");
  });

  it("defaults to javascript when no language is passed", () => {
    expect(AI_PROMPT("const x = 1;")).toContain("expert JavaScript code reviewer");
  });

  it("fences the code with the raw language value, not the display label", () => {
    const prompt = AI_PROMPT("int main() {}", "cpp");
    expect(prompt).toContain("```cpp\nint main() {}\n```");
  });

  it("includes the exact source code verbatim", () => {
    const code = "function weird() {\n  return `template ${1 + 1}`;\n}";
    expect(AI_PROMPT(code, "javascript")).toContain(code);
  });

  it("asks for exactly two improved versions, not one or several", () => {
    expect(AI_PROMPT("code")).toMatch(/exactly TWO improved versions/i);
  });

  it("explicitly forbids placeholder/truncated code in the response", () => {
    const prompt = AI_PROMPT("code");
    expect(prompt).toMatch(/never abbreviate, truncate, or use placeholders/i);
    expect(prompt).toContain('"// ..."');
  });

  it("keeps the ERRORS/COMPLEXITY/SUGGESTIONS/IMPROVED CODE section headers", () => {
    const prompt = AI_PROMPT("code");
    expect(prompt).toContain("**ERRORS**");
    expect(prompt).toContain("**COMPLEXITY**");
    expect(prompt).toContain("**SUGGESTIONS**");
    expect(prompt).toContain("**IMPROVED CODE EXAMPLES**");
  });
});
