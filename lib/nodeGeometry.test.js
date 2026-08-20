import { describe, it, expect } from "vitest";
import { findNearestNode } from "./nodeGeometry";

describe("findNearestNode", () => {
  it("picks the closest candidate within range", () => {
    const target = { id: "a", position: { x: 0, y: 0 } };
    const candidates = [
      target,
      { id: "b", position: { x: 100, y: 0 } },
      { id: "c", position: { x: 30, y: 0 } },
    ];
    expect(findNearestNode(target, candidates, 120).id).toBe("c");
  });

  it("excludes the target itself even if it's in the candidate list", () => {
    const target = { id: "a", position: { x: 0, y: 0 } };
    const candidates = [target];
    expect(findNearestNode(target, candidates, 120)).toBeNull();
  });

  it("returns null when nothing is within maxDistance", () => {
    const target = { id: "a", position: { x: 0, y: 0 } };
    const candidates = [{ id: "b", position: { x: 500, y: 500 } }];
    expect(findNearestNode(target, candidates, 120)).toBeNull();
  });

  it("measures straight-line distance, not axis-aligned", () => {
    const target = { id: "a", position: { x: 0, y: 0 } };
    // distance is 5 (3-4-5 triangle) — within 5, outside 4
    const candidates = [{ id: "b", position: { x: 3, y: 4 } }];
    expect(findNearestNode(target, candidates, 5).id).toBe("b");
    expect(findNearestNode(target, candidates, 4)).toBeNull();
  });
});
