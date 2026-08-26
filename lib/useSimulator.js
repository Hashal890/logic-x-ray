import { useCallback, useEffect, useRef, useState } from "react";
import {
  buildAdjacency,
  findEntryNode,
  nextStep,
  applyNodeEffect,
} from "./simulator";

const emptySimState = () => ({
  currentNodeId: null,
  isPlaying: false,
  isPaused: false,
  stepCount: 0,
  visitedEdgeIds: new Set(),
  awaitingBranch: null,
  varState: {},
});

// Owns the whole dry-run simulator: play/pause/step/stop, speed and the
// step-by-step graph walk itself. Pulled out of App so that component only
// has to deal with wiring the result into the flowchart and the toolbar.
export function useSimulator({ nodes, edges, onComplete }) {
  const [simState, setSimState] = useState(emptySimState);
  const [simSpeed, setSimSpeed] = useState(1); // seconds per step, 0.2-10

  const simSpeedRef = useRef(simSpeed);
  const simTimeoutRef = useRef(null);
  const simStateRef = useRef(simState);
  const nodesRef = useRef(nodes);
  const edgesRef = useRef(edges);

  useEffect(() => {
    simSpeedRef.current = simSpeed;
  }, [simSpeed]);
  useEffect(() => {
    simStateRef.current = simState;
  }, [simState]);
  useEffect(() => {
    nodesRef.current = nodes;
    edgesRef.current = edges;
  }, [nodes, edges]);

  const stop = useCallback(() => {
    if (simTimeoutRef.current) clearTimeout(simTimeoutRef.current);
    setSimState(emptySimState());
  }, []);

  // setTimeout rather than setInterval, so a mid-run speed change is picked
  // up on the very next tick instead of waiting out whatever interval is
  // already in flight.
  const scheduleAutoStep = useCallback(() => {
    if (simTimeoutRef.current) clearTimeout(simTimeoutRef.current);
    simTimeoutRef.current = setTimeout(() => {
      advanceRef.current();
    }, simSpeedRef.current * 1000);
  }, []);

  // respectPause is true for the scheduled auto-play tick (it should back
  // off while paused) and false for a manual "step forward" click, which
  // exists specifically to advance one node while paused.
  const advanceRef = useRef(() => {});
  const advance = useCallback(
    (respectPause = true) => {
      const prev = simStateRef.current;
      if (!prev.currentNodeId || prev.awaitingBranch) return;
      if (respectPause && prev.isPaused) return;

      const adjacency = buildAdjacency(edgesRef.current);
      const nodeById = new Map(nodesRef.current.map((n) => [n.id, n]));
      const step = nextStep(prev.currentNodeId, nodeById, adjacency);
      const currentNode = nodeById.get(prev.currentNodeId);
      const varState = applyNodeEffect(currentNode, prev.varState);

      if (step.type === "end") {
        setSimState((s) => ({
          ...s,
          isPlaying: true,
          currentNodeId: null,
          varState,
        }));
        onComplete?.(prev.stepCount);
        return;
      }

      if (step.type === "branch") {
        setSimState((s) => ({
          ...s,
          awaitingBranch: { options: step.options },
          varState,
        }));
        return;
      }

      const edgeToTarget = adjacency
        .get(prev.currentNodeId)
        ?.find((o) => o.targetId === step.nextId);
      setSimState((s) => ({
        ...s,
        currentNodeId: step.nextId,
        stepCount: s.stepCount + 1,
        visitedEdgeIds: edgeToTarget
          ? new Set(s.visitedEdgeIds).add(edgeToTarget.edgeId)
          : s.visitedEdgeIds,
        varState,
      }));

      if (prev.isPlaying && !prev.isPaused) scheduleAutoStep();
    },
    [onComplete, scheduleAutoStep],
  );
  advanceRef.current = advance;

  const start = useCallback(() => {
    const entry = findEntryNode(nodesRef.current, edgesRef.current);
    if (!entry) return;
    setSimState({
      ...emptySimState(),
      currentNodeId: entry.id,
      isPlaying: true,
    });
    scheduleAutoStep();
  }, [scheduleAutoStep]);

  const pause = useCallback(() => {
    if (simTimeoutRef.current) clearTimeout(simTimeoutRef.current);
    setSimState((s) => ({ ...s, isPaused: true }));
  }, []);

  const resume = useCallback(() => {
    setSimState((s) => ({ ...s, isPaused: false }));
    scheduleAutoStep();
  }, [scheduleAutoStep]);

  const step = useCallback(() => advance(false), [advance]);

  const setSpeed = useCallback((v) => {
    setSimSpeed(Math.max(0.2, Math.min(10, v || 1)));
  }, []);

  const chooseBranch = useCallback(
    (targetId) => {
      const prev = simStateRef.current;
      const chosen = prev.awaitingBranch?.options?.find(
        (o) => o.targetId === targetId,
      );
      if (!chosen) return;
      setSimState((s) => ({
        ...s,
        currentNodeId: chosen.targetId,
        stepCount: s.stepCount + 1,
        visitedEdgeIds: new Set(s.visitedEdgeIds).add(chosen.edgeId),
        awaitingBranch: null,
        varState: prev.varState,
      }));
      if (prev.isPlaying && !prev.isPaused) scheduleAutoStep();
    },
    [scheduleAutoStep],
  );

  return {
    simState,
    simSpeed,
    start,
    pause,
    resume,
    step,
    stop,
    setSpeed,
    chooseBranch,
  };
}
