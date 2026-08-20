import { describe, it, expect } from "vitest";
import { nextPos, makeUid, textOf, fieldText, sameNode, humanizeType, meta } from "./common";

describe("nextPos", () => {
  it("scales x by depth and advances the shared row counter", () => {
    const counter = { val: 1 };
    expect(nextPos(counter, 0)).toEqual({ x: 0, y: 80 });
    expect(nextPos(counter, 2)).toEqual({ x: 400, y: 160 });
    expect(nextPos(counter, 0)).toEqual({ x: 0, y: 240 });
  });
});

describe("makeUid", () => {
  it("produces incrementing, prefixed ids starting at 1", () => {
    const uid = makeUid();
    expect(uid("node")).toBe("node_1");
    expect(uid("node")).toBe("node_2");
    expect(uid("edge")).toBe("edge_3");
  });

  it("keeps separate counters for separate calls to makeUid()", () => {
    expect(makeUid()("n")).toBe("n_1");
    expect(makeUid()("n")).toBe("n_1");
  });
});

describe("textOf", () => {
  it("returns an empty string for a missing node", () => {
    expect(textOf(null)).toBe("");
    expect(textOf(undefined)).toBe("");
  });

  it("collapses internal whitespace and trims", () => {
    expect(textOf({ text: "  const   x =\n  1;  " })).toBe("const x = 1;");
  });

  it("truncates with an ellipsis past the max length", () => {
    const node = { text: "a".repeat(70) };
    expect(textOf(node, 60)).toBe(`${"a".repeat(59)}…`);
  });

  it("leaves text at exactly the max length untouched", () => {
    const node = { text: "a".repeat(60) };
    expect(textOf(node, 60)).toBe("a".repeat(60));
  });
});

describe("fieldText", () => {
  it("resolves a named field and formats its text", () => {
    const nameNode = { text: "myFunction" };
    const node = { childForFieldName: (f) => (f === "name" ? nameNode : null) };
    expect(fieldText(node, "name")).toBe("myFunction");
  });

  it("returns an empty string when the field is missing", () => {
    const node = { childForFieldName: () => null };
    expect(fieldText(node, "name")).toBe("");
  });

  it("returns an empty string when the node itself is missing", () => {
    expect(fieldText(null, "name")).toBe("");
  });
});

describe("sameNode", () => {
  it("compares by stable id, not object identity", () => {
    expect(sameNode({ id: 5 }, { id: 5 })).toBe(true);
  });

  it("is false when ids differ", () => {
    expect(sameNode({ id: 5 }, { id: 6 })).toBe(false);
  });

  it("is false when either side is missing", () => {
    expect(sameNode(null, { id: 5 })).toBe(false);
    expect(sameNode({ id: 5 }, null)).toBe(false);
    expect(sameNode(null, null)).toBe(false);
  });
});

describe("humanizeType", () => {
  it("replaces underscores with spaces", () => {
    expect(humanizeType({ type: "expression_statement" })).toBe("expression statement");
  });

  it("leaves a type with no underscores unchanged", () => {
    expect(humanizeType({ type: "identifier" })).toBe("identifier");
  });
});

describe("meta", () => {
  it("pulls code/line ranges from a tree-sitter-shaped node and attaches depth", () => {
    const node = {
      startIndex: 10,
      endIndex: 25,
      startPosition: { row: 2 },
      endPosition: { row: 4 },
    };
    expect(meta(node, 3)).toEqual({
      codeStart: 10,
      codeEnd: 25,
      lineStart: 3, // rows are 0-indexed in tree-sitter, lines are 1-indexed here
      lineEnd: 5,
      depth: 3,
    });
  });
});
