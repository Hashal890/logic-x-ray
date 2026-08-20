import { getParser } from "./treeSitter/loader";
import { walkTree } from "./treeSitter/walk";
import { classifyC } from "./treeSitter/c";

const BRANCH_TYPES = [
  "if_statement",
  "for_statement",
  "for_range_loop",
  "while_statement",
  "do_statement",
  "case_statement",
  "catch_clause",
  "conditional_expression",
  "preproc_ifdef",
  "preproc_if",
];

function calcComplexity(rootNode) {
  let n = 1;
  for (const type of BRANCH_TYPES) {
    n += rootNode.descendantsOfType(type).length;
  }
  return n;
}

function buildSuggestions(complexity) {
  const s = [];
  if (complexity > 10)
    s.push("High complexity — split functions and reduce nesting.");
  if (complexity > 5)
    s.push("Deep branching detected — consider lookup tables or polymorphism.");
  return s;
}

export async function parseC(code, lang = "C") {
  try {
    const grammar = lang === "C++" ? "cpp" : "c";
    const parser = await getParser(grammar);
    const tree = parser.parse(code);
    if (tree.rootNode.hasError) {
      const errNode = tree.rootNode.descendantsOfType("ERROR")[0];
      if (errNode) {
        const line = errNode.startPosition.row + 1;
        throw new Error(`Syntax error near line ${line}`);
      }
    }

    const { nodes, edges } = walkTree(tree.rootNode, classifyC);
    const complexity = calcComplexity(tree.rootNode);
    return {
      flowNodes: nodes,
      flowEdges: edges,
      complexity,
      suggestions: buildSuggestions(complexity),
    };
  } catch (e) {
    return { error: e.message };
  }
}
