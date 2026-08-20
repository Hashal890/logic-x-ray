import { getParser } from "./treeSitter/loader";
import { walkTree } from "./treeSitter/walk";
import { classifyJS } from "./treeSitter/javascript";

const BRANCH_TYPES = [
  "if_statement",
  "for_statement",
  "for_in_statement",
  "while_statement",
  "do_statement",
  "switch_case",
  "catch_clause",
  "ternary_expression",
  "binary_expression", // captures &&/|| short-circuit branches too
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
    s.push("High complexity — consider splitting into smaller functions.");
  if (complexity > 5)
    s.push("Some branching detected — ensure all code paths are tested.");
  return s;
}

export async function parseJS(code) {
  try {
    const parser = await getParser("javascript");
    const tree = parser.parse(code);
    if (tree.rootNode.hasError && tree.rootNode.text.trim().length > 0) {
      // Tree-sitter recovers from errors rather than failing outright, so
      // only surface it as a hard error when the whole thing is unusable.
      const errNode = tree.rootNode.descendantsOfType("ERROR")[0];
      if (errNode) {
        const line = errNode.startPosition.row + 1;
        throw new Error(`Syntax error near line ${line}`);
      }
    }

    const { nodes, edges } = walkTree(tree.rootNode, classifyJS);
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
