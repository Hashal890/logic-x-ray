import { getParser } from "./treeSitter/loader";
import { walkTree } from "./treeSitter/walk";
import { classifyPHP } from "./treeSitter/php";

const BRANCH_TYPES = [
  "if_statement",
  "else_if_clause",
  "for_statement",
  "foreach_statement",
  "while_statement",
  "do_statement",
  "case_statement",
  "catch_clause",
  "match_expression",
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
    s.push("High complexity — extract logic into smaller methods.");
  if (complexity > 5)
    s.push("Consider using match expressions to simplify switch chains.");
  return s;
}

export async function parsePHP(code) {
  try {
    const parser = await getParser("php");
    const tree = parser.parse(code);
    if (tree.rootNode.hasError) {
      const errNode = tree.rootNode.descendantsOfType("ERROR")[0];
      if (errNode) {
        const line = errNode.startPosition.row + 1;
        throw new Error(`Syntax error near line ${line}`);
      }
    }

    const { nodes, edges } = walkTree(tree.rootNode, classifyPHP);
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
