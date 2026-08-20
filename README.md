# Logic-X-Ray

Ever looked at a piece of code and thought "what is actually happening here?" Logic-X-Ray turns your code into a live, **editable** interactive flowchart — not a static diagram, a real interface you can read, click, drag, and run.

![Version](https://img.shields.io/badge/version-2.0.0-00d1b2)
![Next.js](https://img.shields.io/badge/Next.js-16-black)
![License](https://img.shields.io/badge/license-MIT-6366f1)

---

## What makes this different

Most AI code-explainer tools (ChatGPT, Claude, Gemini, NotebookLM, ...) generate a diagram or explanation from your code and stop there. Logic-X-Ray is built around four things none of them do:

1. **The flowchart edits the code, and the code edits the flowchart.** Click a node to jump the editor to that line. Delete or comment a node and the source updates. Drag a node onto a sibling and their source lines swap. Type in the editor and the diagram re-parses live. It's bidirectional and instant, not one-way.
2. **The complexity heatmap is always on.** Every node is colored by nesting depth (blue → amber → red) the moment the flowchart appears — no "analyze" button, no waiting on an LLM. Deeply nested code glows and pulses so hotspots are obvious at a glance.
3. **You can run the code, without running it.** The Visual Dry-Run Simulator walks the flowchart step by step, pausing at every branch so *you* choose which path executes, animating the traversed route in green — and now tracks simple variable values live as you step, so you can watch a loop counter or accumulator change in real time (see below).
4. **Every diagram is deterministic.** Parsing is done by real [Tree-Sitter](https://tree-sitter.github.io/tree-sitter/) grammars compiled to WebAssembly, not an LLM. The same code always produces the exact same flowchart — no hallucination, no variance between runs.

---

## The four core features

### 1. Editable Logic Interface (Code ⇄ Flowchart sync)

- **Click a node** → the editor scrolls to and highlights the matching source line.
- **Hover a node** → a `✕` delete button and a `//` comment-out button appear.
- **Drag a node onto a sibling** → their source lines swap places (works for any of the 7 languages, including brace-less Python — the swap is line-based, not language-specific).
- **Edit code directly** → the flowchart re-parses automatically, debounced 400ms.

Only same-level, non-overlapping nodes can be swapped — dragging a node into one of its own children is rejected safely rather than corrupting the source.

### 2. Complexity Heatmap (always-on structural feedback)

Every node is colored by nesting depth the instant the flowchart renders:

- **Blue → amber → red** gradient as depth increases (depth 0 → 8+)
- **Glow animation** at depth ≥ 4, **pulse animation** at depth ≥ 8
- **⚠ badge** on hotspot nodes
- Toggle it off from the header if you'd rather see the plain per-type colors

### 3. Visual Dry-Run Simulator (interactive execution)

- **▶ Start / ⏸ Pause / ▶ Resume / ▷ Step / ■ Stop**, plus a live speed control (0.2s–10s per step)
- The active node glows yellow; when execution reaches a branch (`if`, loop, `try`/`catch`) with more than one path, the candidate nodes glow purple and **the simulator pauses** — click whichever path you want to take
- Traversed edges animate green so you can see the exact path taken
- **Live variable panel**: as the simulator steps past a simple assignment (`x = 5`, `total += 1`, `i++`, ...) it tracks the resulting value and shows it in a small panel next to the step counter. This is a deliberately conservative evaluator — it resolves literals, identifiers, and basic arithmetic/comparisons over values it already knows, and shows `?` rather than guessing when a value comes from a function call, member access, or anything else it can't honestly resolve. It is not a full interpreter, and doesn't pretend to be one.

### 4. Deterministic Parsing (Tree-Sitter, no hallucination)

All 7 languages are parsed by real Tree-Sitter grammars running as WebAssembly in the browser — the same engine that powers GitHub's code navigation and most modern editors' syntax highlighting. Parsing is a pure structural walk of the syntax tree, not a language model, so the same input always produces the same output. Every language's parser walks the *entire* tree — nothing is silently skipped; any construct a language module doesn't explicitly recognize still gets a generic node rather than vanishing.

---

## Languages and what gets visualised

| Language   | What shows in the flowchart                                                                                           |
| ---------- | ----------------------------------------------------------------------------------------------------------------------- |
| JavaScript | Classes, private fields, arrow functions, async/generator functions, destructuring, labeled statements, JSX, all loops/conditions |
| TypeScript | Everything in JS plus interfaces, type aliases, enums, namespaces, decorators, abstract classes, `import =`/`export =`  |
| Python     | Classes, decorators, async/await, `match`/`case`, comprehensions, context managers, exception handling                  |
| Java       | Classes, records, enums, annotations, sealed types, switch expressions, try-with-resources, synchronized blocks         |
| PHP        | Classes, traits, interfaces, match expressions, arrow functions, closures, attributes, namespaces                       |
| C          | Structs, unions, enums, preprocessor conditionals, typedefs, function pointers                                          |
| C++        | Everything in C plus namespaces, templates, classes, access specifiers, try/catch, range-based for                      |

---

## Node types

Every node type has a distinct colour so you can scan the flowchart at a glance:

| Node          | Colour        | Represents                                                          |
| ------------- | ------------- | -------------------------------------------------------------------- |
| ◈ Class       | Indigo        | class, interface, abstract class, enum, struct, trait, record       |
| ƒ Function    | Teal          | functions, methods, constructors, arrow functions, lambdas          |
| ↺ Loop        | Green         | for, while, do-while, foreach, for-of, for-in, range-based for      |
| ◇ Condition   | Amber         | if/else, switch/case, match                                         |
| ⚠ Try/Catch   | Red dashed    | try, catch, finally, with, synchronized                             |
| ↓ Import      | Slate         | import, #include, use, require, namespace                           |
| ↑ Export      | Muted         | export, export default, export *                                    |
| ⏎ Return      | Pink          | return, throw, break, continue, yield, goto                         |
| ▪ Variable    | Dark          | assignments, declarations, increments — anything tracked by the simulator's variable panel |
| • Statement   | Dark, dotted  | anything else — preprocessor directives, bare expressions, or any construct without a more specific type. This is the catch-all that guarantees no line is ever silently dropped from the diagram. |

When the heatmap is on, node background/border colour is overridden by nesting depth instead of type — the icon still tells you what kind of node it is.

---

## AI models

The "Analyze with AI" sidebar button calls Hugging Face's Inference API with a three-model fallback chain. If a provider is busy, fails, or hands back an abbreviated snippet instead of the full file it was asked for, the request moves on to the next model automatically — you only see a result once one comes back clean, or every option has been tried.

| Provider  | Model                             |
| --------- | ---------------------------------- |
| Novita    | meta-llama/Llama-3.1-8B-Instruct   |
| Novita    | Qwen/Qwen2.5-72B-Instruct           |
| Together  | meta-llama/Llama-3.3-70B-Instruct   |

This is the one feature that leaves the browser — everything else (parsing, the flowchart, the heatmap, the simulator, editing) runs entirely client-side and needs no network access or API key.

---

## Project structure

    logic-x-ray/
    │
    ├── app/
    │   ├── api/analyze/route.js      # API route — tries each HF model in sequence
    │   ├── globals.css
    │   ├── layout.tsx
    │   ├── page.tsx                  # Entry point
    │   └── app-loader.tsx            # Loads the app shell client-side only (no SSR)
    │
    ├── components/
    │   ├── app.jsx                   # Main shell — all state and event handlers
    │   ├── header.jsx                # Language picker, toggles, simulator controls, export/share
    │   ├── sidebar.jsx                # Complexity cards, hotspot list, AI output
    │   ├── auto-node.jsx              # Custom ReactFlow node (heatmap/sim styling, hover actions)
    │   ├── status-bar.jsx             # Simulator step counter + speed badge
    │   ├── variable-panel.jsx         # Live tracked-variable display during a simulator run
    │   ├── toast.jsx                  # Small toast notifications for mutations/share/etc.
    │   ├── ai-renderer.jsx            # Renders AI response — text + code blocks
    │   ├── code-block.jsx             # Code snippet card with Insert / Copy / Collapse
    │   ├── text-segment.jsx           # Plain text renderer (strips markdown headings)
    │   └── zoom-manager.jsx           # Auto-centers flowchart after first render
    │
    ├── lib/
    │   ├── parsers/
    │   │   ├── index.js               # Router — maps language -> parser (all async)
    │   │   ├── js-parser.js           # JavaScript (Tree-Sitter adapter)
    │   │   ├── ts-parser.js           # TypeScript (Tree-Sitter adapter, layers on JS)
    │   │   ├── python-parser.js       # Python (Tree-Sitter adapter)
    │   │   ├── java-parser.js         # Java (Tree-Sitter adapter)
    │   │   ├── php-parser.js          # PHP (Tree-Sitter adapter)
    │   │   ├── c-parser.js            # C and C++ (Tree-Sitter adapter)
    │   │   ├── coverage.test.js       # "zero-skip" regression tests, one per language
    │   │   └── treeSitter/
    │   │       ├── loader.js          # Loads/caches Tree-Sitter WASM grammars
    │   │       ├── walk.js            # Generic CST -> flowchart graph walker (shared by all languages)
    │   │       ├── common.js          # Shared node-metadata helpers
    │   │       ├── javascript.js      # classify() for JS syntax nodes
    │   │       ├── typescript.js      # classify() for TS-only syntax nodes
    │   │       ├── python.js          # classify() for Python syntax nodes
    │   │       ├── java.js            # classify() for Java syntax nodes
    │   │       ├── php.js             # classify() for PHP syntax nodes
    │   │       └── c.js               # classify() for C/C++ syntax nodes
    │   │
    │   ├── mutator.js                 # deleteNode / commentNode / moveNode — source mutation
    │   ├── simulator.js               # Graph traversal + variable-effect application for dry-run
    │   ├── useSimulator.js            # Hook wrapping simulator.js — owns play/pause/step/speed state
    │   ├── exprEval.js                # Conservative expression evaluator for the variable panel
    │   ├── nodeGeometry.js            # Nearest-node lookup used by drag-to-reorder
    │   ├── constants.js               # Language-aware AI prompt builder
    │   ├── logicEngine.js             # Thin wrapper — delegates to parsers/index.js
    │   ├── nodeStyles.js              # Node colors, icons, heatmap color scale, makeNode/makeEdge
    │   ├── parse-ai.js                # Splits AI response + extracts complexity/suggestions
    │   ├── exportFlow.js              # Renders the flowchart to PNG/SVG for download
    │   ├── permalink.js               # Encodes/decodes shareable links (code+language in the URL hash)
    │   ├── useShareLink.js            # Hook wrapping permalink.js — restores a shared link on load
    │   ├── select-styles.js           # Dark theme for react-select dropdowns
    │   ├── snippets.js                # Default demo snippet per language
    │   └── *.test.js                  # Vitest unit tests, one per module above
    │
    ├── public/
    │   ├── tree-sitter/                # Tree-Sitter core runtime + one .wasm grammar per language
    │   └── favicon.svg
    │
    ├── .env.local                     # HF_TOKEN goes here (never committed)
    ├── next.config.js                 # Webpack stubs so web-tree-sitter's Node-only paths don't break the client bundle
    └── package.json

---

## Getting started

You need **Node.js 18+** installed. Nothing else.

### 1. Clone the repo

```bash
git clone https://github.com/Hashal890/logic-x-ray.git
cd logic-x-ray
```

### 2. Install dependencies

```bash
npm install
```

### 3. Get a Hugging Face token (optional — only for AI review)

Every feature except "Analyze with AI" works with zero configuration. If you want AI review too:

- Go to [huggingface.co](https://huggingface.co) and click **Sign Up** (free)
- Verify your email and log in
- Click your **profile picture** → **Settings**
- In the left sidebar click **Access Tokens**
- Click **New token**, give it a name (e.g. `logic-x-ray`), set Role to **Read**
- Click **Generate a token** and copy it — it starts with `hf_...`

> Hugging Face only shows the token once. If you lose it, delete it and generate a new one.

### 4. Create `.env.local`

In the root of the project create a file called `.env.local`:

```
HF_TOKEN=your_token_here
```

### 5. Start the dev server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### 6. Run the tests (optional)

```bash
npm test
```

---

## How to use it

**Pick a language**
Use the Language dropdown in the top bar. Switching language loads a demo snippet for that language that covers everything the parser can visualise.

**Write or paste code**
The flowchart updates automatically as you type, debounced 400ms.

**Click a node to jump to it**
The editor scrolls to and briefly highlights the matching line.

**Hover a node to edit it**
`✕` deletes the block from the source. `//` comments it out. Both show a confirmation toast and re-sync the diagram.

**Drag a node onto a sibling to reorder it**
Their source lines swap. Works across all 7 languages.

**Toggle the heatmap**
On by default — click "🔥 Heatmap" in the header to turn per-depth coloring off and see plain per-type colors instead.

**Run the simulator**
Click "▶ Start Simulation." Use Pause/Resume/Step/Stop and the speed field to control playback. When execution reaches a branch, click whichever highlighted node you want to take. Watch the Variables panel (top-left of the canvas) for any values the simulator could resolve as you step.

**Export or share**
"⬇ PNG"/"⬇ SVG" download the current flowchart as an image. "🔗 Share" copies a link that reproduces your exact code, language, and indent setting for anyone who opens it.

**Format your code**
Click Format Code to auto-format. Choose your preferred indent size (2/4/6/8 spaces or tabs) from the dropdown next to it.

**Reset to original**
Reset to Original rolls the editor back to what the code looked like before your first edit, mutation, or AI insert this session.

**Run AI analysis**
Click Analyze with AI in the top-right of the sidebar. The AI returns a complexity score, specific suggestions, and two improved versions of your code, each with a one-click Insert button. If a version comes back looking like a partial snippet rather than the full file, Insert will ask you to confirm before replacing your code.

---

## Deploying to Vercel

**Option A — Vercel dashboard (easier)**

1. Push your code to GitHub
2. Go to [vercel.com](https://vercel.com) → **Add New Project** → import your repo
3. Before deploying, go to **Environment Variables** and add:
   - Key: `HF_TOKEN`
   - Value: your Hugging Face token
4. Click **Deploy**

Vercel detects Next.js automatically — no config needed. `next.config.js` already includes the webpack stubs `web-tree-sitter` needs to build cleanly for the client bundle.

**Option B — Vercel CLI**

```bash
npm install -g vercel
vercel
vercel env add HF_TOKEN
vercel --prod
```

> If you add the env variable after deploying, go to **Settings → Environment Variables** in the Vercel dashboard and redeploy from the **Deployments** tab.

---

## Environment variables

| Variable   | Required             | Purpose                                       |
| ---------- | --------------------- | ---------------------------------------------- |
| `HF_TOKEN` | Only for AI features  | Authenticates with Hugging Face Inference API   |

---

## Known limitations

**Variable panel is intentionally conservative**
It resolves literals, known identifiers, and simple arithmetic/comparisons — not function calls, member/index access, string interpolation, or anything language-specific. Unresolvable values show as `?` rather than a guess. This is a deliberate scope decision, not a bug: a wrong guess would be worse than an honest unknown.

**Move only swaps siblings**
Dragging a node onto another reorders two same-level, non-overlapping source blocks. You can't drag a node into an arbitrary new position or into a different container — the mutation is rejected safely (no source corruption) rather than attempted.

**Python dynamic features**
Only statically visible code is parsed. Dynamically created classes, runtime-generated functions, and heavy metaprogramming won't appear in the flowchart — this is inherent to any static-analysis tool, not specific to this parser.

**No persistent storage**
Nothing is saved server-side. The Share link encodes your code directly in the URL, so very large files produce a very long link.

---

## Tech stack

| What              | Package                |
| ----------------- | ------------------------ |
| Framework         | Next.js 16                |
| Editor            | @monaco-editor/react       |
| Flowchart         | reactflow                  |
| Parsing (all 7 languages) | web-tree-sitter (WASM)  |
| AI client         | @huggingface/inference      |
| Code formatting   | js-beautify                 |
| Image export      | html-to-image                |
| Dropdowns         | react-select                  |
| Testing           | vitest                          |
| Hosting           | Vercel                            |

---

## Troubleshooting

**Flowchart is blank or shows a parse error**
A red error box at the bottom of the canvas points to the line causing the problem. Fix the syntax and the flowchart updates automatically.

**AI button shows "All models are currently busy"**
Usually the Hugging Face providers are just overloaded — wait a few seconds and try again. If it keeps happening on every attempt, check your Hugging Face account: free-tier inference credits reset monthly, and once they're used up every provider fails with this same message until the reset (or until you add credits).

**AI button does nothing**
Check that `HF_TOKEN` is in your `.env.local` file and restart the dev server after adding it (`Ctrl+C` then `npm run dev`).

**Deployed on Vercel but AI doesn't work**
The `HF_TOKEN` needs to be added in Vercel's project settings before deploying. If you added it after the fact, redeploy from the Deployments tab.

**A tracked variable shows "?"**
That's expected for anything the evaluator can't safely resolve (a function call, member access, etc.) — see "Known limitations" above.

---

## License

MIT — free to use, modify, and distribute.
