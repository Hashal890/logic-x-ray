// Finds the node closest to `target` (by straight-line distance between
// their ReactFlow positions), excluding target itself. Returns null if
// nothing is within `maxDistance` — used by the canvas drag-to-reorder
// feature to decide which sibling a dropped node should swap with.
export function findNearestNode(target, candidates, maxDistance) {
  let nearest = null;
  let nearestDist = Infinity;

  for (const n of candidates) {
    if (n.id === target.id) continue;
    const dx = n.position.x - target.position.x;
    const dy = n.position.y - target.position.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist < nearestDist) {
      nearestDist = dist;
      nearest = n;
    }
  }

  return nearest && nearestDist <= maxDistance ? nearest : null;
}
