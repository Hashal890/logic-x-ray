import { describe, it, expect } from "vitest";
import { deleteNode, commentNode, moveNode } from "./mutator";

describe("deleteNode", () => {
  it("removes the exact char range and swallows the trailing newline", () => {
    const code = "line1\nline2\nline3\n";
    const meta = { codeStart: 6, codeEnd: 11 }; // "line2"
    expect(deleteNode(code, meta)).toBe("line1\nline3\n");
  });

  it("handles a range at the start of the file", () => {
    const code = "line1\nline2\n";
    const meta = { codeStart: 0, codeEnd: 5 };
    expect(deleteNode(code, meta)).toBe("line2\n");
  });

  it("handles a range at the end of the file (no trailing newline)", () => {
    const code = "line1\nline2";
    const meta = { codeStart: 6, codeEnd: 11 };
    expect(deleteNode(code, meta)).toBe("line1\n");
  });

  it("is a no-op when the range is undefined", () => {
    const code = "line1\nline2\n";
    expect(deleteNode(code, {})).toBe(code);
  });
});

describe("commentNode", () => {
  it("prefixes a single line with // for javascript", () => {
    const code = "const a = 1;\nconst b = 2;\n";
    const meta = { lineStart: 1, lineEnd: 1 };
    expect(commentNode(code, meta, "javascript")).toBe(
      "// const a = 1;\nconst b = 2;\n",
    );
  });

  it("uses # for python", () => {
    const code = "x = 1\ny = 2\n";
    const meta = { lineStart: 1, lineEnd: 1 };
    expect(commentNode(code, meta, "python")).toBe("# x = 1\ny = 2\n");
  });

  it("preserves existing indentation", () => {
    const code = "if (x) {\n    doThing();\n}\n";
    const meta = { lineStart: 2, lineEnd: 2 };
    expect(commentNode(code, meta, "javascript")).toBe(
      "if (x) {\n    // doThing();\n}\n",
    );
  });

  it("comments every line in a multi-line range", () => {
    const code = "def foo():\n    a = 1\n    b = 2\n";
    const meta = { lineStart: 1, lineEnd: 3 };
    expect(commentNode(code, meta, "python")).toBe(
      "# def foo():\n    # a = 1\n    # b = 2\n",
    );
  });

  it("is a no-op when the line range is undefined", () => {
    const code = "a = 1\n";
    expect(commentNode(code, {}, "python")).toBe(code);
  });
});

describe("moveNode", () => {
  it("swaps two same-depth sibling single-line nodes", () => {
    const code = "const a = 1;\nconst b = 2;\nconst c = 3;\n";
    const dragged = { lineStart: 1, lineEnd: 1 };
    const target = { lineStart: 3, lineEnd: 3 };
    expect(moveNode(code, dragged, target)).toBe(
      "const c = 3;\nconst b = 2;\nconst a = 1;\n",
    );
  });

  it("swaps two multi-line blocks and keeps lines between them intact", () => {
    const code = [
      "function a() {",
      "  return 1;",
      "}",
      "const mid = true;",
      "function b() {",
      "  return 2;",
      "}",
      "",
    ].join("\n");
    const dragged = { lineStart: 1, lineEnd: 3 };
    const target = { lineStart: 5, lineEnd: 7 };
    const result = moveNode(code, dragged, target);
    expect(result).toBe(
      [
        "function b() {",
        "  return 2;",
        "}",
        "const mid = true;",
        "function a() {",
        "  return 1;",
        "}",
        "",
      ].join("\n"),
    );
  });

  it("is a no-op (unchanged code) when ranges overlap (nested nodes)", () => {
    const code = "function a() {\n  return 1;\n}\n";
    const outer = { lineStart: 1, lineEnd: 3 };
    const inner = { lineStart: 2, lineEnd: 2 };
    expect(moveNode(code, outer, inner)).toBe(code);
  });

  it("is a no-op when either node lacks a line range", () => {
    const code = "a = 1\nb = 2\n";
    expect(moveNode(code, {}, { lineStart: 2, lineEnd: 2 })).toBe(code);
  });
});
