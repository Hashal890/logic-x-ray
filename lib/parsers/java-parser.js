import { getParser } from "./treeSitter/loader";
import { walkTree } from "./treeSitter/walk";
import { classifyJava } from "./treeSitter/java";

const BRANCH_TYPES = [
  "if_statement",
  "for_statement",
  "enhanced_for_statement",
  "while_statement",
  "do_statement",
  "switch_block_statement_group",
  "switch_rule",
  "catch_clause",
  "ternary_expression",
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
    s.push("High complexity — split large methods into smaller ones.");
  if (complexity > 5)
    s.push("Consider using polymorphism to reduce conditional chains.");
  return s;
}

export async function parseJava(code) {
  try {
    const parser = await getParser("java");
    const tree = parser.parse(code);
    if (tree.rootNode.hasError) {
      const errNode = tree.rootNode.descendantsOfType("ERROR")[0];
      if (errNode) {
        const line = errNode.startPosition.row + 1;
        throw new Error(`Syntax error near line ${line}`);
      }
    }

    const { nodes, edges } = walkTree(tree.rootNode, classifyJava);
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
