# Logic-X-Ray

Ever looked at a piece of code and thought "what is actually happening here?" Logic-X-Ray turns your code into a live interactive flowchart so you can **see** it instead of just reading it.

Paste any code, pick a language, and the tool draws every function, class, loop, condition, and import as connected colour-coded nodes. You can also ask an AI to review it, get specific suggestions, and insert improved versions directly into the editor — all without your code leaving the browser.

![Version](https://img.shields.io/badge/version-1.0.0-00d1b2)
![Next.js](https://img.shields.io/badge/Next.js-14-black)
![License](https://img.shields.io/badge/license-MIT-6366f1)

---

## What it does

**Live flowchart as you type**
The flowchart updates automatically as you write code. Every construct is drawn as a node — classes, functions, loops, conditions, imports, returns — connected by edges showing the execution path.

**Seven languages supported**
JavaScript, TypeScript, Python, Java, PHP, C, and C++. Each has its own dedicated parser that understands that language's actual syntax.

**Dual complexity scoring**
The sidebar shows two cyclomatic complexity scores side by side — one calculated instantly by the static parser and one retrieved from the AI when you run an analysis. If they differ by more than 2, a warning tells you why.

**AI code review on demand**
Click "Analyze with AI" and an LLM reads your code and returns a complexity score, specific suggestions, and improved code versions. Each improved version has an Insert button that drops it straight into the editor.

**Code stays in your browser**
All parsing, flowchart rendering, and complexity scoring runs entirely client-side. Nothing is sent over the network unless you explicitly click "Analyze with AI."

---

## Languages and what gets visualised

| Language   | Parser                | What shows in the flowchart                                                                                                                           |
| ---------- | --------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| JavaScript | Babel AST             | Classes, private fields, arrow functions, async/await, optional chaining, destructuring, all loops and conditions                                     |
| TypeScript | Babel AST + TS plugin | Everything in JS plus interfaces, type aliases, enums, namespaces, decorators, abstract classes, generics, mapped/conditional types, access modifiers |
| Python     | Indent-depth          | Classes, dataclasses, decorators, generators, async/await, comprehensions, context managers, metaclasses, exception handling                          |
| Java       | Brace-depth           | Classes, records, enums, generics, switch expressions, streams, lambdas, annotations, constructors                                                    |
| PHP        | Brace-depth           | Classes, traits, interfaces, match expressions, arrow functions, closures, magic methods, foreach, namespaces                                         |
| C          | Regex/heuristic       | Structs, unions, enums, preprocessor directives, function pointers, macros, goto, typedefs                                                            |
| C++        | Regex/heuristic       | Everything in C plus templates, smart pointers, RAII, operator overloading, move semantics, STL containers, range-based for, namespaces               |

---

## Node types

Every node type has a distinct colour so you can scan the flowchart at a glance:

| Node        | Colour     | Represents                                                     |
| ----------- | ---------- | -------------------------------------------------------------- |
| ◈ Class     | Indigo     | class, interface, abstract class, enum, struct, trait, record  |
| ƒ Function  | Teal       | functions, methods, constructors, arrow functions, lambdas     |
| ↺ Loop      | Green      | for, while, do-while, foreach, for-of, for-in, range-based for |
| ◇ Condition | Amber      | if/else, switch/case, match                                    |
| ⚠ Try/Catch | Red dashed | try, catch, finally, with                                      |
| ↓ Import    | Slate      | import, #include, use, require, namespace                      |
| ↑ Export    | Muted      | export, export default                                         |
| ⏎ Return    | Pink       | return, throw, break, continue, yield, goto                    |
| ▪ Variable  | Dark       | const, let, var, type aliases, #define, field declarations     |

---

## AI models

The app uses Hugging Face's Inference API with a five-model fallback chain. If one provider is busy or fails, it automatically tries the next one.

| Provider  | Model                                  |
| --------- | -------------------------------------- |
| Novita    | meta-llama/Llama-3.1-8B-Instruct       |
| Novita    | Qwen/Qwen2.5-72B-Instruct              |
| SambaNova | Meta-Llama-3.1-8B-Instruct             |
| Together  | meta-llama/Llama-3.2-3B-Instruct-Turbo |
| Together  | Qwen/Qwen2.5-7B-Instruct-Turbo         |

---

## Project structure

    logic-x-ray/
    │
    ├── app/
    │   ├── api/analyze/route.js      # API route — tries each HF model in sequence
    │   ├── globals.css
    │   ├── layout.tsx
    │   └── page.tsx                  # Entry point (SSR disabled)
    │
    ├── components/
    │   ├── app.jsx                   # Main shell — all state and event handlers
    │   ├── header.jsx                # Language picker, indent selector, action buttons
    │   ├── sidebar.jsx               # Complexity cards, suggestions, AI output
    │   ├── auto-node.jsx             # Custom ReactFlow node (measures own size)
    │   ├── ai-renderer.jsx           # Renders AI response — text + code blocks
    │   ├── code-block.jsx            # Code snippet card with Insert / Copy / Collapse
    │   ├── text-segment.jsx          # Plain text renderer (strips markdown headings)
    │   └── zoom-manager.jsx          # Auto-centers flowchart after first render
    │
    ├── lib/
    │   ├── parsers/
    │   │   ├── index.js              # Router — maps language → parser
    │   │   ├── js-parser.js          # JavaScript (Babel AST)
    │   │   ├── ts-parser.js          # TypeScript (Babel AST + full TS nodes)
    │   │   ├── python-parser.js      # Python (indent-depth scope tracking)
    │   │   ├── java-parser.js        # Java (brace-depth scope tracking)
    │   │   ├── php-parser.js         # PHP (brace-depth scope tracking)
    │   │   └── c-parser.js           # C and C++ (regex/heuristic)
    │   │
    │   ├── constants.js              # Language-aware AI prompt builder
    │   ├── logicEngine.js            # Thin wrapper — delegates to parsers/index.js
    │   ├── nodeStyles.js             # Node colors, icons, makeNode/makeEdge helpers
    │   ├── parse-ai.js               # Splits AI response + extracts complexity/suggestions
    │   ├── select-styles.js          # Dark theme for react-select dropdowns
    │   └── snippets.js               # Default demo snippet per language
    │
    ├── public/
    │   └── favicon.svg               # Custom SVG favicon (miniature flowchart)
    │
    ├── .env.local                    # HF_TOKEN goes here (never committed)
    ├── next.config.js
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

### 3. Get a Hugging Face token

The AI analysis feature calls Hugging Face's Inference API. Everything else works without a token.

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

---

## How to use it

**Pick a language**
Use the Language dropdown in the top bar. Switching language loads a demo snippet for that language that covers everything the parser can visualise.

**Write or paste code**
The flowchart updates automatically as you type. There's a 400ms debounce so it doesn't re-render on every single keystroke.

**Resize the panels**
Drag the thin divider bar between the editor and the flowchart left or right to give more space to either side.

**Format your code**
Click Format Code to auto-format. Choose your preferred indent size (2 spaces, 4 spaces, or tabs) from the dropdown next to it.

**Reset to original**
Reset to Original rolls the editor back to what the code looked like before you first hit Format or inserted an AI suggestion.

**Run AI analysis**
Click Analyze with AI in the top-right of the sidebar. The AI will return a complexity score, specific suggestions for your code, and improved versions you can insert directly into the editor with one click.

---

## Deploying to Vercel

**Option A — Vercel dashboard (easier)**

1. Push your code to GitHub
2. Go to [vercel.com](https://vercel.com) → **Add New Project** → import your repo
3. Before deploying, go to **Environment Variables** and add:
   - Key: `HF_TOKEN`
   - Value: your Hugging Face token
4. Click **Deploy**

Vercel detects Next.js automatically — no config needed.

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
| ---------- | -------------------- | --------------------------------------------- |
| `HF_TOKEN` | Only for AI features | Authenticates with Hugging Face Inference API |

---

## Known limitations

**C / C++ parser**
Uses regex patterns rather than a true AST (no browser-compatible C/C++ AST parser exists on npm). Works well for conventionally formatted code. Unusual formatting styles may cause some constructs to be missed.

**Python dynamic features**
Only statically visible code is parsed. Dynamically created classes, runtime-generated functions, and heavy metaprogramming won't appear in the flowchart.

**Large files**
Files over ~200 lines have a short delay (~400ms) before the flowchart settles. This is ReactFlow measuring auto-sized nodes after the initial render.

**No persistent storage**
The app is intentionally stateless — nothing is saved between sessions. Flowcharts can't be exported yet.

---

## Planned improvements

- Collapsible nodes — click to expand/collapse subtrees
- Dagre auto-layout — proper graph layout algorithm to fix node crowding on complex code
- Export as PNG / SVG
- Tree-sitter WASM parser for C and C++
- Flowchart search — highlight nodes by name or type
- Multi-file support

---

## Tech stack

| What            | Package                |
| --------------- | ---------------------- |
| Framework       | Next.js 14             |
| Editor          | @monaco-editor/react   |
| Flowchart       | reactflow              |
| JS/TS parsing   | @babel/parser          |
| AI client       | @huggingface/inference |
| Code formatting | js-beautify            |
| Dropdowns       | react-select           |
| Hosting         | Vercel                 |

---

## Troubleshooting

**Flowchart is blank or shows a parse error**
A red error box at the bottom of the canvas points to the line causing the problem. Fix the syntax and the flowchart updates automatically.

**AI button shows "All models are currently busy"**
Hugging Face free tier providers get overloaded sometimes. Wait a few seconds and try again.

**AI button does nothing**
Check that `HF_TOKEN` is in your `.env.local` file and restart the dev server after adding it (`Ctrl+C` then `npm run dev`).

**Deployed on Vercel but AI doesn't work**
The `HF_TOKEN` needs to be added in Vercel's project settings before deploying. If you added it after the fact, redeploy from the Deployments tab.

**Can't type spaces in the editor**
This was a known bug where ReactFlow's pan mode intercepted the Space key. It has been fixed in the current version — the editor now isolates keyboard events from ReactFlow using a capture-phase listener.

---

## License

MIT — free to use, modify, and distribute.
