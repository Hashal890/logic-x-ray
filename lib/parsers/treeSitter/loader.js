import { Parser, Language } from "web-tree-sitter";

// grammar files live in /public/tree-sitter/*.wasm — fetched at runtime,
// never bundled, so each language only costs bytes when it's actually used
const GRAMMAR_FILES = {
  javascript: "tree-sitter-javascript.wasm",
  typescript: "tree-sitter-typescript.wasm",
  python: "tree-sitter-python.wasm",
  java: "tree-sitter-java.wasm",
  php: "tree-sitter-php.wasm",
  c: "tree-sitter-c.wasm",
  cpp: "tree-sitter-cpp.wasm",
};

// In the browser these resolve as fetch() URLs against /public. Under
// Vitest (Node, no HTTP server) they resolve as filesystem paths instead —
// web-tree-sitter/Emscripten picks the right strategy based on environment.
// Node paths go through `eval("require")` (not `new URL(..., import.meta.url)`
// or a static `require(...)` call) so bundlers never try to statically
// resolve/copy these as build assets — this branch never runs in the browser.
const isNode = typeof window === "undefined";

function nodePath(...segments) {
  const path = eval("require")("node:path");
  return path.join(process.cwd(), ...segments);
}

function assetPath(filename) {
  if (!isNode) return `/tree-sitter/${filename}`;
  return nodePath("public", "tree-sitter", filename);
}

let initPromise = null;
const languageCache = new Map();
const parserCache = new Map();

function initParserRuntime() {
  if (!initPromise) {
    initPromise = Parser.init({
      locateFile: () =>
        isNode
          ? nodePath("node_modules", "web-tree-sitter", "tree-sitter.wasm")
          : "/tree-sitter/tree-sitter.wasm",
    });
  }
  return initPromise;
}

async function loadLanguage(lang) {
  if (languageCache.has(lang)) return languageCache.get(lang);
  const filename = GRAMMAR_FILES[lang];
  if (!filename) throw new Error(`No Tree-Sitter grammar registered for "${lang}"`);

  await initParserRuntime();
  const language = await Language.load(assetPath(filename));
  languageCache.set(lang, language);
  return language;
}

// Returns a ready-to-use Parser for the given language. Parser instances are
// reused per language rather than recreated on every keystroke.
export async function getParser(lang) {
  if (parserCache.has(lang)) return parserCache.get(lang);
  await initParserRuntime();
  const language = await loadLanguage(lang);
  const parser = new Parser();
  parser.setLanguage(language);
  parserCache.set(lang, parser);
  return parser;
}
