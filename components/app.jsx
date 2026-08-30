"use client";

import React, { useState, useCallback, useEffect, useRef } from "react";
import ReactFlow, {
  Background,
  Controls,
  MiniMap,
  ReactFlowProvider,
} from "reactflow";
import "reactflow/dist/style.css";
import Editor from "@monaco-editor/react";
import { js_beautify } from "js-beautify";

import { processCodeStructure } from "../lib/logicEngine";
import { AI_PROMPT, DEFAULT_SNIPPET, DEFAULT_SNIPPETS } from "../lib/constants";
import { extractAIMeta, looksIncomplete } from "../lib/parse-ai";
import { SUPPORTED_LANGUAGES } from "../lib/parsers/index";
import { deleteNode, commentNode, moveNode } from "../lib/mutator";
import { NODE_STYLES } from "../lib/nodeStyles";
import { exportFlowchart } from "../lib/exportFlow";
import { findNearestNode } from "../lib/nodeGeometry";
import { useSimulator } from "../lib/useSimulator";
import { useShareLink } from "../lib/useShareLink";

import Header from "./header";
import Sidebar from "./sidebar";
import ZoomManager from "./zoom-manager";
import Toast from "./toast";
import StatusBar from "./status-bar";
import VariablePanel from "./variable-panel";
import { nodeTypes } from "./auto-node";

const DROP_THRESHOLD_PX = 120;

export default function App() {
  const [code, setCode] = useState(DEFAULT_SNIPPET);
  const [originalCode, setOriginalCode] = useState(DEFAULT_SNIPPET);
  const [isOriginalLocked, setOriginalLocked] = useState(false);
  const [language, setLanguage] = useState("javascript");

  const [nodes, setNodes] = useState([]);
  const [edges, setEdges] = useState([]);
  const [suggestions, setSuggestions] = useState([]);
  const [complexity, setComplexity] = useState(1);
  const [error, setError] = useState(null);

  const [aiAnalysis, setAiAnalysis] = useState("");
  const [aiComplexity, setAiComplexity] = useState(null);
  const [aiSuggestions, setAiSuggestions] = useState([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const [indentSize, setIndentSize] = useState(2);
  const [editorWidth, setEditorWidth] = useState(35);
  const timerRef = useRef(null);
  const syncSeqRef = useRef(0);

  const [toast, setToast] = useState(null);
  const toastTimerRef = useRef(null);
  const editorRef = useRef(null);
  const monacoRef = useRef(null);
  const decorationIdsRef = useRef([]);
  const jumpTimerRef = useRef(null);
  const flowWrapperRef = useRef(null);
  const reactFlowInstanceRef = useRef(null);
  const [isExportingFlow, setIsExportingFlow] = useState(false);

  const showToast = useCallback((message) => {
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    setToast(message);
    toastTimerRef.current = setTimeout(() => setToast(null), 2000);
  }, []);

  const { share: handleShare } = useShareLink({
    code,
    language,
    indentSize,
    onNotify: showToast,
    onRestore: (shared) => {
      setCode(shared.code);
      setOriginalCode(shared.code);
      setOriginalLocked(false);
      setLanguage(shared.language);
      if (shared.indentSize !== undefined) setIndentSize(shared.indentSize);
    },
  });

  const handleExportFlow = useCallback(
    async (format) => {
      if (nodes.length === 0) {
        showToast("Nothing to export yet");
        return;
      }
      setIsExportingFlow(true);
      try {
        // The plain `nodes` state only carries positions — ReactFlow measures
        // each node's actual rendered width/height into its own internal
        // store, which is what the bounds math in exportFlowchart needs.
        const measuredNodes = reactFlowInstanceRef.current?.getNodes() ?? nodes;
        const ok = await exportFlowchart(flowWrapperRef.current, measuredNodes, format);
        showToast(ok ? `⬇ Exported as ${format.toUpperCase()}` : "⚠ Export failed");
      } catch {
        showToast("⚠ Export failed");
      }
      setIsExportingFlow(false);
    },
    [nodes, showToast],
  );

  const [minimapOn, setMinimapOn] = useState(true);

  // always-on by default — this is meant to be ambient structural feedback,
  // not an on-demand analysis step; users can still switch it off
  const [heatmapOn, setHeatmapOn] = useState(true);
  const heatmapOnRef = useRef(heatmapOn);

  // nodeTypes is a static map in ReactFlow, so the toggle can't reach nodes
  // as a prop — bake it into node.data instead. The ref lets sync()'s
  // closure read the current value without being recreated on every toggle.
  useEffect(() => {
    heatmapOnRef.current = heatmapOn;
    setNodes((ns) =>
      ns.map((n) => ({ ...n, data: { ...n.data, heatmapEnabled: heatmapOn } })),
    );
  }, [heatmapOn]);

  const sim = useSimulator({
    nodes,
    edges,
    onComplete: (stepCount) => showToast(`✓ Simulation complete — ${stepCount} steps`),
  });

  // same data-injection trick as the heatmap toggle above
  useEffect(() => {
    setNodes((ns) =>
      ns.map((n) => ({
        ...n,
        data: {
          ...n.data,
          simActive: sim.simState.currentNodeId === n.id,
          simBranchCandidate:
            sim.simState.awaitingBranch?.options?.some((o) => o.targetId === n.id) ??
            false,
          onBranchChoose: () => sim.chooseBranch(n.id),
        },
      })),
    );
    setEdges((es) =>
      es.map((e) => ({
        ...e,
        animated: sim.simState.visitedEdgeIds.has(e.id),
        style: {
          ...e.style,
          stroke: sim.simState.visitedEdgeIds.has(e.id) ? "#22c55e" : "#334155",
        },
      })),
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sim.simState]);

  useEffect(() => {
    sim.stop();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [code, language]);

  const monacoLang =
    SUPPORTED_LANGUAGES.find((l) => l.value === language)?.monaco ??
    "javascript";

  const lockOriginalThen = useCallback(
    (action) => {
      if (!isOriginalLocked) {
        setOriginalCode(code);
        setOriginalLocked(true);
      }
      action();
    },
    [isOriginalLocked, code],
  );

  const handleLanguageChange = (lang) => {
    const snippet = DEFAULT_SNIPPETS[lang] ?? DEFAULT_SNIPPET;
    setLanguage(lang);
    setCode(snippet);
    setOriginalCode(snippet);
    setOriginalLocked(false);
    setAiAnalysis("");
    setAiComplexity(null);
    setAiSuggestions([]);
  };

  const handleFormat = () =>
    lockOriginalThen(() =>
      setCode(
        js_beautify(code, {
          indent_size: indentSize === "tab" ? 1 : Number(indentSize),
          indent_char: indentSize === "tab" ? "\t" : " ",
          indent_with_tabs: indentSize === "tab",
          preserve_newlines: true,
          max_preserve_newlines: 2,
          brace_style: "collapse,preserve-inline",
        }),
      ),
    );

  const handleInsert = useCallback(
    (newCode) => {
      // The AI is asked for the whole file, but smaller models sometimes
      // abbreviate anyway — inserting that would wipe out the rest of the
      // user's code, so confirm before replacing when it looks partial.
      if (looksIncomplete(newCode, code)) {
        const proceed = window.confirm(
          "This AI suggestion looks like a partial snippet, not the full file — inserting it may delete the rest of your code. Insert anyway?",
        );
        if (!proceed) return;
      }
      lockOriginalThen(() => setCode(newCode));
    },
    [lockOriginalThen, code],
  );

  const handleReset = () => setCode(originalCode);

  const jumpToLine = useCallback((lineStart, lineEnd) => {
    const editor = editorRef.current;
    const monaco = monacoRef.current;
    if (!editor || !monaco || !lineStart) return;

    editor.revealLineInCenter(lineStart);
    decorationIdsRef.current = editor.deltaDecorations(
      decorationIdsRef.current,
      [
        {
          range: new monaco.Range(lineStart, 1, lineEnd || lineStart, 1),
          options: { isWholeLine: true, className: "line-jump-highlight" },
        },
      ],
    );

    if (jumpTimerRef.current) clearTimeout(jumpTimerRef.current);
    jumpTimerRef.current = setTimeout(() => {
      decorationIdsRef.current = editor.deltaDecorations(
        decorationIdsRef.current,
        [],
      );
    }, 1800);
  }, []);

  // Mutate against `code` directly rather than a setCode functional updater —
  // Strict Mode double-invokes updaters in dev, which would apply the same
  // node.data offsets twice against an already-shrunk string.
  const handleDeleteNode = useCallback(
    (node) => {
      lockOriginalThen(() => {
        setCode(deleteNode(code, node.data));
        showToast(`✕ Deleted "${node.data.label}"`);
      });
    },
    [lockOriginalThen, showToast, code],
  );

  const handleCommentNode = useCallback(
    (node) => {
      lockOriginalThen(() => {
        setCode(commentNode(code, node.data, language));
        showToast(`// Commented out "${node.data.label}"`);
      });
    },
    [lockOriginalThen, showToast, code, language],
  );

  const handleMoveNode = useCallback(
    (draggedNode, targetNode) => {
      lockOriginalThen(() => {
        const next = moveNode(code, draggedNode.data, targetNode.data);
        if (next === code) {
          showToast("Can't move here");
        } else {
          setCode(next);
          showToast(`Moved "${draggedNode.data.label}"`);
        }
      });
    },
    [lockOriginalThen, showToast, code],
  );

  // onNodeDragStart/Stop also fire for a plain click (mousedown+mouseup with
  // ~0 movement), so a click-to-jump or branch-choice click would otherwise
  // misfire as a drag-drop reorder — require real movement first.
  const dragStartPosRef = useRef(null);
  const MIN_DRAG_DISTANCE_PX = 10;

  const onNodeDragStart = useCallback((_evt, draggedNode) => {
    dragStartPosRef.current = { id: draggedNode.id, ...draggedNode.position };
  }, []);

  const onNodeDragStop = useCallback(
    (_evt, draggedNode) => {
      const start = dragStartPosRef.current;
      dragStartPosRef.current = null;
      if (!start || start.id !== draggedNode.id) return;

      const movedDist = Math.sqrt(
        (draggedNode.position.x - start.x) ** 2 +
          (draggedNode.position.y - start.y) ** 2,
      );
      if (movedDist < MIN_DRAG_DISTANCE_PX) return;

      const nearest = findNearestNode(draggedNode, nodes, DROP_THRESHOLD_PX);
      if (nearest) {
        handleMoveNode(draggedNode, nearest);
      }
    },
    [nodes, handleMoveNode],
  );

  const handleLoadDemo = () => {
    const snippet = DEFAULT_SNIPPETS[language] ?? DEFAULT_SNIPPET;
    setCode(snippet);
    setOriginalCode(snippet);
    setOriginalLocked(false);
    setAiAnalysis("");
    setAiComplexity(null);
    setAiSuggestions([]);
  };

  const sync = useCallback(
    (v, lang) => {
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(async () => {
        const seq = ++syncSeqRef.current;
        const r = await processCodeStructure(v, lang);
        if (seq !== syncSeqRef.current) return; // a newer keystroke already superseded this parse

        if (r.error) {
          setError(r.error);
          setNodes([]);
          setEdges([]);
          setSuggestions([]);
          setComplexity(1);
        } else {
          setError(null);
          setNodes(
            r.flowNodes.map((n) => ({
              ...n,
              data: {
                ...n.data,
                onDelete: () => handleDeleteNode(n),
                onComment: () => handleCommentNode(n),
                onNodeClick: () => jumpToLine(n.data.lineStart, n.data.lineEnd),
                heatmapEnabled: heatmapOnRef.current,
              },
            })),
          );
          setEdges(
            r.flowEdges.map((e) => ({
              ...e,
              markerEnd: { type: "arrowclosed" },
            })),
          );
          setSuggestions(r.suggestions || []);
          setComplexity(r.complexity || 1);
        }
      }, 400);
    },
    [handleDeleteNode, handleCommentNode, jumpToLine],
  );

  useEffect(() => {
    sync(code, language);
  }, [sync, code, language]);

  const handleAnalyze = async () => {
    if (!code.trim()) return;
    setIsAnalyzing(true);
    setAiAnalysis("__loading__");
    setAiComplexity(null);
    setAiSuggestions([]);

    try {
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: AI_PROMPT(code, language) }),
      });
      const data = await res.json();

      if (!res.ok || data.error) {
        setAiAnalysis(data.error || "Analysis failed.");
      } else {
        const result = data.result || "No analysis generated.";
        setAiAnalysis(result);
        const { aiComplexity: cx, aiSuggestions: suggs } =
          extractAIMeta(result);
        setAiComplexity(cx);
        setAiSuggestions(suggs);
      }
    } catch {
      setAiAnalysis("Network error. Please try again.");
    }

    setIsAnalyzing(false);
  };

  const onResizeDown = (e) => {
    e.preventDefault();
    const sx = e.clientX,
      sw = editorWidth;
    const mv = (ev) =>
      setEditorWidth(
        Math.max(
          20,
          Math.min(70, sw + ((ev.clientX - sx) / window.innerWidth) * 100),
        ),
      );
    const up = () => {
      document.removeEventListener("mousemove", mv);
      document.removeEventListener("mouseup", up);
    };
    document.addEventListener("mousemove", mv);
    document.addEventListener("mouseup", up);
  };

  return (
    <div
      style={{
        height: "100vh",
        display: "flex",
        flexDirection: "column",
        background: "#0f172a",
        overflow: "hidden",
        fontFamily: "system-ui, sans-serif",
      }}
    >
      <Header
        indentSize={indentSize}
        onIndentChange={setIndentSize}
        language={language}
        onLanguageChange={handleLanguageChange}
        onFormat={handleFormat}
        onReset={handleReset}
        onLoadDemo={handleLoadDemo}
        onShare={handleShare}
        onExportPng={() => handleExportFlow("png")}
        onExportSvg={() => handleExportFlow("svg")}
        isExportingFlow={isExportingFlow}
        heatmapOn={heatmapOn}
        onToggleHeatmap={() => setHeatmapOn((v) => !v)}
        minimapOn={minimapOn}
        onToggleMinimap={() => setMinimapOn((v) => !v)}
        nodesCount={nodes.length}
        simIsPlaying={sim.simState.isPlaying}
        simIsPaused={sim.simState.isPaused}
        onSimStart={sim.start}
        onSimPause={sim.pause}
        onSimResume={sim.resume}
        onSimStep={sim.step}
        onSimStop={sim.stop}
        simSpeed={sim.simSpeed}
        onSimSpeedChange={sim.setSpeed}
      />

      <div
        style={{ flex: 1, display: "flex", overflow: "hidden", minHeight: 0 }}
      >
        <div
          style={{
            width: `${editorWidth}%`,
            flexShrink: 0,
            minWidth: 0,
            overflow: "hidden",
          }}
        >
          <Editor
            height="100%"
            theme="vs-dark"
            language={monacoLang}
            value={code}
            onChange={(v) => setCode(v || "")}
            onMount={(editor, monaco) => {
              editor.focus();
              editorRef.current = editor;
              monacoRef.current = monaco;
              // stop these from reaching ReactFlow's own shortcuts (pan/deselect/delete-node)
              const BLOCKED = new Set([" ", "Escape", "Backspace", "Delete"]);
              editor.getDomNode()?.addEventListener(
                "keydown",
                (e) => {
                  if (BLOCKED.has(e.key)) e.stopPropagation();
                },
                true,
              );
            }}
            options={{
              fontSize: 14,
              fontFamily: "'Fira Code', monospace",
              wordWrap: "on",
              minimap: { enabled: false },
              insertSpaces: true,
              tabSize: 2,
              scrollBeyondLastLine: false,
            }}
          />
        </div>

        <div
          onMouseDown={onResizeDown}
          style={{
            width: 5,
            flexShrink: 0,
            background: "#1e293b",
            cursor: "col-resize",
            zIndex: 5,
            transition: "background .15s",
          }}
          onMouseEnter={(e) => (e.currentTarget.style.background = "#00d1b2")}
          onMouseLeave={(e) => (e.currentTarget.style.background = "#1e293b")}
        />

        <div
          ref={flowWrapperRef}
          style={{
            flex: 1,
            minWidth: 0,
            position: "relative",
            overflow: "hidden",
          }}
        >
          <ReactFlowProvider>
            <ReactFlow
              nodes={nodes}
              edges={edges}
              nodeTypes={nodeTypes}
              onInit={(instance) => (reactFlowInstanceRef.current = instance)}
              onNodeDragStart={onNodeDragStart}
              onNodeDragStop={onNodeDragStop}
              fitView={false}
              defaultViewport={{ x: 0, y: 0, zoom: 1.2 }}
              minZoom={0.3}
              maxZoom={2.5}
              disableKeyboardA11y={true}
              panOnScroll={false}
              panActivationKeyCode={null}
              selectionKeyCode={null}
              multiSelectionKeyCode={null}
              deleteKeyCode={null}
              zoomActivationKeyCode={null}
              style={{ width: "100%", height: "100%" }}
            >
              <ZoomManager nodes={nodes} />
              <Background color="#1e293b" gap={24} />
              <Controls style={{ bottom: 16, left: 16 }} />
              {minimapOn && (
                <MiniMap
                  style={{ background: "#0f172a" }}
                  maskColor="rgba(15,23,42,.6)"
                  nodeColor={(n) =>
                    NODE_STYLES[n.data?.nodeType]?.borderColor ?? "#334155"
                  }
                />
              )}
            </ReactFlow>
          </ReactFlowProvider>

          {sim.simState.currentNodeId !== null && (
            <StatusBar
              stepCount={sim.simState.stepCount}
              speed={sim.simSpeed}
              isPaused={sim.simState.isPaused}
            />
          )}
          {sim.simState.currentNodeId !== null && (
            <VariablePanel varState={sim.simState.varState} />
          )}

          <div
            style={{
              position: "absolute",
              top: 16,
              right: 16,
              background: "#0f172a",
              border: "1px solid #334155",
              borderRadius: 8,
              padding: "6px 12px",
              fontSize: 12,
              color: "#94a3b8",
              zIndex: 15,
              pointerEvents: "none",
            }}
          >
            {nodes.length} nodes · {edges.length} edges
          </div>

          <Toast message={toast} />

          {error && (
            <div
              style={{
                position: "absolute",
                bottom: 16,
                left: 16,
                right: 16,
                background: "rgba(239,68,68,.12)",
                border: "1px solid #ef4444",
                borderRadius: 8,
                padding: 14,
                color: "#fca5a5",
                fontSize: 13,
                backdropFilter: "blur(6px)",
                zIndex: 20,
                pointerEvents: "none",
              }}
            >
              <strong>Parse Error</strong>
              <div style={{ margin: "5px 0" }}>{error}</div>
            </div>
          )}
        </div>

        <Sidebar
          complexity={complexity}
          suggestions={suggestions}
          aiComplexity={aiComplexity}
          aiSuggestions={aiSuggestions}
          aiAnalysis={aiAnalysis}
          isAnalyzing={isAnalyzing}
          onAnalyze={handleAnalyze}
          onInsert={handleInsert}
          nodes={nodes}
          edges={edges}
          onJumpToNode={(n) => jumpToLine(n.data.lineStart, n.data.lineEnd)}
        />
      </div>
    </div>
  );
}
