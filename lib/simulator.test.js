import { describe, it, expect } from "vitest";
import { buildAdjacency, findEntryNode, nextStep, applyNodeEffect } from "./simulator";

describe("buildAdjacency", () => {
  it("builds a Map keyed by source with edge/target/label entries", () => {
    const edges = [
      { id: "e1", source: "a", target: "b", label: "" },
      { id: "e2", source: "a", target: "c", label: "else" },
      { id: "e3", source: "b", target: "c", label: "" },
    ];
    const adj = buildAdjacency(edges);
    expect(adj.get("a")).toEqual([
      { edgeId: "e1", targetId: "b", label: "" },
      { edgeId: "e2", targetId: "c", label: "else" },
    ]);
    expect(adj.get("b")).toEqual([{ edgeId: "e3", targetId: "c", label: "" }]);
    expect(adj.has("c")).toBe(false);
  });

  it("returns an empty Map for no edges", () => {
    expect(buildAdjacency([]).size).toBe(0);
  });
});

describe("findEntryNode", () => {
  it("picks the node with no incoming edge", () => {
    const nodes = [{ id: "a" }, { id: "b" }, { id: "c" }];
    const edges = [
      { source: "a", target: "b" },
      { source: "b", target: "c" },
    ];
    expect(findEntryNode(nodes, edges).id).toBe("a");
  });

  it("falls back to flowNodes[0] when every node has an incoming edge", () => {
    const nodes = [{ id: "a" }, { id: "b" }];
    const edges = [
      { source: "a", target: "b" },
      { source: "b", target: "a" },
    ];
    expect(findEntryNode(nodes, edges).id).toBe("a");
  });

  it("returns null for an empty graph", () => {
    expect(findEntryNode([], [])).toBeNull();
  });
});

describe("nextStep", () => {
  const nodeById = new Map([
    ["fn_1", { id: "fn_1", data: { nodeType: "function" } }],
    ["if_2", { id: "if_2", data: { nodeType: "condition" } }],
    ["ret_3", { id: "ret_3", data: { nodeType: "returnNode" } }],
    ["ret_4", { id: "ret_4", data: { nodeType: "returnNode" } }],
    ["try_5", { id: "try_5", data: { nodeType: "trycatch" } }],
  ]);

  it("returns advance when there is exactly one outgoing edge", () => {
    const adjacency = buildAdjacency([{ id: "e1", source: "fn_1", target: "if_2" }]);
    expect(nextStep("fn_1", nodeById, adjacency)).toEqual({
      type: "advance",
      nextId: "if_2",
    });
  });

  it("returns branch for a condition node with multiple outgoing edges", () => {
    const edges = [
      { id: "e1", source: "if_2", target: "ret_3", label: "" },
      { id: "e2", source: "if_2", target: "ret_4", label: "else" },
    ];
    const adjacency = buildAdjacency(edges);
    const result = nextStep("if_2", nodeById, adjacency);
    expect(result.type).toBe("branch");
    expect(result.options).toEqual([
      { edgeId: "e1", targetId: "ret_3", label: "" },
      { edgeId: "e2", targetId: "ret_4", label: "else" },
    ]);
  });

  it("returns branch for a trycatch node with multiple outgoing edges", () => {
    const edges = [
      { id: "e1", source: "try_5", target: "ret_3", label: "" },
      { id: "e2", source: "try_5", target: "ret_4", label: "catch" },
    ];
    const adjacency = buildAdjacency(edges);
    expect(nextStep("try_5", nodeById, adjacency).type).toBe("branch");
  });

  it("does NOT treat a non-branch node with multiple outgoing edges as a branch", () => {
    const edges = [
      { id: "e1", source: "fn_1", target: "ret_3", label: "" },
      { id: "e2", source: "fn_1", target: "ret_4", label: "" },
    ];
    const adjacency = buildAdjacency(edges);
    const result = nextStep("fn_1", nodeById, adjacency);
    expect(result.type).toBe("advance");
    expect(result.nextId).toBe("ret_3");
  });

  it("returns end when there are no outgoing edges", () => {
    const adjacency = buildAdjacency([]);
    expect(nextStep("ret_3", nodeById, adjacency)).toEqual({ type: "end" });
  });
});

describe("applyNodeEffect", () => {
  it("applies a variable node's assignment to the state map", () => {
    const node = { data: { nodeType: "variable", varName: "x", varOp: "=", varValueText: "5" } };
    expect(applyNodeEffect(node, {})).toEqual({ x: 5 });
  });

  it("applies an augmented assignment against existing state", () => {
    const node = { data: { nodeType: "variable", varName: "x", varOp: "+=", varValueText: "1" } };
    expect(applyNodeEffect(node, { x: 10 })).toEqual({ x: 11 });
  });

  it("leaves state unchanged (same reference) for a non-variable node", () => {
    const state = { x: 1 };
    const node = { data: { nodeType: "condition" } };
    expect(applyNodeEffect(node, state)).toBe(state);
  });

  it("leaves state unchanged for a variable node with no resolvable name", () => {
    const state = { x: 1 };
    const node = { data: { nodeType: "variable", varName: null } };
    expect(applyNodeEffect(node, state)).toBe(state);
  });

  it("leaves state unchanged when node/data is missing", () => {
    const state = { x: 1 };
    expect(applyNodeEffect(null, state)).toBe(state);
    expect(applyNodeEffect({}, state)).toBe(state);
  });
});
