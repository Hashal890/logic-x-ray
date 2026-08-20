import { describe, it, expect } from "vitest";
import { makeNode, makeEdge, depthColor, NODE_STYLES } from "./nodeStyles";

describe("makeNode", () => {
  it("prefixes the label with the type's icon", () => {
    const node = makeNode("n1", "function", "add(a, b)", { x: 0, y: 0 });
    expect(node.data.label).toBe("ƒ  add(a, b)");
  });

  it("carries the type through to data.nodeType and picks the matching style", () => {
    const node = makeNode("n1", "loop", "for (;;)", { x: 0, y: 0 });
    expect(node.data.nodeType).toBe("loop");
    expect(node.style).toBe(NODE_STYLES.loop);
  });

  it("falls back to the variable style for an unrecognized type", () => {
    const node = makeNode("n1", "totally_unknown", "x", { x: 0, y: 0 });
    expect(node.style).toBe(NODE_STYLES.variable);
    expect(node.data.label).toBe("x"); // no icon, so no leading spaces either
  });

  it("truncates labels over 120 characters", () => {
    const long = "a".repeat(150);
    const node = makeNode("n1", "statement", long, { x: 0, y: 0 });
    // icon "•" + two spaces + 117 chars + ellipsis
    expect(node.data.label).toBe(`•  ${"a".repeat(117)}…`);
  });

  it("leaves a label at exactly 120 characters untouched", () => {
    const exact = "a".repeat(120);
    const node = makeNode("n1", "statement", exact, { x: 0, y: 0 });
    expect(node.data.label).toBe(`•  ${exact}`);
  });

  it("merges extra fields into data and keeps the given id/position/type", () => {
    const node = makeNode("n42", "variable", "x = 1", { x: 10, y: 20 }, { depth: 3 });
    expect(node.id).toBe("n42");
    expect(node.type).toBe("autoNode");
    expect(node.position).toEqual({ x: 10, y: 20 });
    expect(node.data.depth).toBe(3);
  });
});

describe("makeEdge", () => {
  it("defaults to an empty label", () => {
    const edge = makeEdge("e1", "a", "b");
    expect(edge.label).toBe("");
  });

  it("carries source/target/label through", () => {
    const edge = makeEdge("e1", "a", "b", "else");
    expect(edge.id).toBe("e1");
    expect(edge.source).toBe("a");
    expect(edge.target).toBe("b");
    expect(edge.label).toBe("else");
  });
});

describe("depthColor", () => {
  it("returns the cold color at depth 0", () => {
    expect(depthColor(0)).toBe("#3b82f6");
  });

  it("returns the warm color at depth 4", () => {
    expect(depthColor(4)).toBe("#f59e0b");
  });

  it("returns the hot color at depth 8 and beyond", () => {
    expect(depthColor(8)).toBe("#ef4444");
    expect(depthColor(20)).toBe(depthColor(8));
  });

  it("clamps negative depth to the cold end", () => {
    expect(depthColor(-5)).toBe(depthColor(0));
  });

  it("treats a missing depth as 0", () => {
    expect(depthColor(undefined)).toBe(depthColor(0));
  });

  it("produces a distinct color partway through each half of the gradient", () => {
    const shallow = depthColor(2);
    const deep = depthColor(6);
    expect(shallow).toMatch(/^#[0-9a-f]{6}$/);
    expect(deep).toMatch(/^#[0-9a-f]{6}$/);
    expect(shallow).not.toBe(depthColor(0));
    expect(shallow).not.toBe(depthColor(4));
    expect(deep).not.toBe(depthColor(4));
    expect(deep).not.toBe(depthColor(8));
  });
});
