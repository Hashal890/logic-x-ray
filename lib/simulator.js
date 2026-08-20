// Pure graph-traversal step functions — the auto-play loop and
// pause/resume/speed state live in components/app.jsx.

import { applyAssignment } from "./exprEval";

const BRANCH_TYPES = new Set(["condition", "trycatch", "loop"]);

export function buildAdjacency(flowEdges) {
  const adjacency = new Map();
  for (const e of flowEdges) {
    if (!adjacency.has(e.source)) adjacency.set(e.source, []);
    adjacency.get(e.source).push({ edgeId: e.id, targetId: e.target, label: e.label ?? "" });
  }
  return adjacency;
}

// Entry point is the first node with no incoming edge, falling back to
// flowNodes[0] for a cyclic or malformed graph.
export function findEntryNode(flowNodes, flowEdges) {
  if (!flowNodes.length) return null;
  const hasIncoming = new Set(flowEdges.map((e) => e.target));
  return flowNodes.find((n) => !hasIncoming.has(n.id)) ?? flowNodes[0];
}

// Applies a node's tracked assignment (if it is a variable-type node
// carrying varName/varOp/varValueText — see the per-language classify()
// functions in ./treeSitter/*.js) to the running variable-state map,
// returning a NEW map. Non-variable nodes, or ones without a resolvable
// left-hand name, leave the map unchanged (same reference, so callers can
// skip a re-render by comparing identity).
export function applyNodeEffect(node, varState) {
  if (node?.data?.nodeType !== "variable" || !node.data.varName) return varState;
  const { next } = applyAssignment(varState, node.data.varName, node.data.varValueText, node.data.varOp);
  return next;
}

// Returns {type:"advance", nextId}, {type:"branch", options} (condition/
// trycatch with multiple outgoing edges — caller resolves before calling
// again), or {type:"end"}.
export function nextStep(currentId, nodeById, adjacency) {
  const options = adjacency.get(currentId) ?? [];
  if (options.length === 0) return { type: "end" };

  const currentNode = nodeById.get(currentId);
  const isBranchPoint =
    options.length > 1 && BRANCH_TYPES.has(currentNode?.data?.nodeType);

  if (isBranchPoint) return { type: "branch", options };

  return { type: "advance", nextId: options[0].targetId };
}
