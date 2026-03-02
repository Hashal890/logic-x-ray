"use client";

import React, { useState, useCallback, useEffect, useRef } from "react";
import ReactFlow, { Background, Controls, ReactFlowProvider } from "reactflow";
import "reactflow/dist/style.css";
import Editor from "@monaco-editor/react";
import { js_beautify } from "js-beautify";

import { processCodeStructure } from "../lib/logicEngine";
import { AI_PROMPT, DEFAULT_SNIPPET, DEFAULT_SNIPPETS } from "../lib/constants";
import { extractAIMeta } from "../lib/parse-ai";
import { SUPPORTED_LANGUAGES } from "../lib/parsers/index";

import Header from "./header";
import Sidebar from "./sidebar";
import ZoomManager from "./zoom-manager";
import { nodeTypes } from "./auto-node";

export default function App() {
  const [code, setCode] = useState(DEFAULT_SNIPPET);
  const [originalCode, setOriginalCode] = useState(DEFAULT_SNIPPET);
  const [isOriginalLocked, setOriginalLocked] = useState(false);
  const [language, setLanguage] = useState("javascript"); // ← new

  // Static engine output
  const [nodes, setNodes] = useState([]);
  const [edges, setEdges] = useState([]);
  const [suggestions, setSuggestions] = useState([]);
  const [complexity, setComplexity] = useState(1);
  const [error, setError] = useState(null);

  // AI output
  const [aiAnalysis, setAiAnalysis] = useState("");
  const [aiComplexity, setAiComplexity] = useState(null);
  const [aiSuggestions, setAiSuggestions] = useState([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const [indentSize, setIndentSize] = useState(2);
  const [editorWidth, setEditorWidth] = useState(35);
  const timerRef = useRef(null);

  // Monaco language id for the editor
  const monacoLang =
    SUPPORTED_LANGUAGES.find((l) => l.value === language)?.monaco ??
    "javascript";

  // ── Lock original snapshot on first mutating action ───────────────
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

  // ── Language switch — load that language's demo snippet ──────────
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

  // ── Toolbar actions ───────────────────────────────────────────────
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
    (newCode) => lockOriginalThen(() => setCode(newCode)),
    [lockOriginalThen],
  );

  const handleReset = () => setCode(originalCode);

  const handleLoadDemo = () => {
    const snippet = DEFAULT_SNIPPETS[language] ?? DEFAULT_SNIPPET;
    setCode(snippet);
    setOriginalCode(snippet);
    setOriginalLocked(false);
    setAiAnalysis("");
    setAiComplexity(null);
    setAiSuggestions([]);
  };

  // ── Sync flow graph (debounced) ───────────────────────────────────
  const sync = useCallback((v, lang) => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      const r = processCodeStructure(v, lang);
      if (r.error) {
        setError(r.error);
        setNodes([]);
        setEdges([]);
        setSuggestions([]);
        setComplexity(1);
      } else {
        setError(null);
        setNodes(r.flowNodes);
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
  }, []);

  // Re-parse whenever code OR language changes
  useEffect(() => {
    sync(code, language);
  }, [sync, code, language]);

  // ── AI analysis ───────────────────────────────────────────────────
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
        // Pass language so the prompt is language-aware
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

  // ── Drag-to-resize editor / canvas split ─────────────────────────
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

  // ── Error helpers ─────────────────────────────────────────────────
  const getErrorLine = (e) => (e.match(/Line (\d+)/) || [])[1] || "?";
  const codeAroundError = (src, ls) => {
    if (!ls || isNaN(ls)) return "Cannot show snippet";
    const n = parseInt(ls) - 1,
      lines = src.split("\n");
    return lines
      .slice(Math.max(0, n - 3), Math.min(lines.length, n + 4))
      .map((l, i) => `${Math.max(0, n - 3) + i + 1}: ${l.trimEnd()}`)
      .join("\n");
  };

  // ─────────────────────────────────────────────────────────────────
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
      />

      <div
        style={{ flex: 1, display: "flex", overflow: "hidden", minHeight: 0 }}
      >
        {/* Monaco editor — language switches syntax highlighting */}
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

        {/* Drag handle */}
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

        {/* ReactFlow canvas */}
        <div
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
              fitView={false}
              defaultViewport={{ x: 0, y: 0, zoom: 1.2 }}
              minZoom={0.3}
              maxZoom={2.5}
              style={{ width: "100%", height: "100%" }}
            >
              <ZoomManager nodes={nodes} />
              <Background color="#1e293b" gap={24} />
              <Controls style={{ bottom: 16, left: 16 }} />
            </ReactFlow>
          </ReactFlowProvider>

          {/* Syntax error overlay */}
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
        />
      </div>
    </div>
  );
}
