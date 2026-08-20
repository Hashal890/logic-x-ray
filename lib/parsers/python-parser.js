import { getParser } from "./treeSitter/loader";
import { walkTree } from "./treeSitter/walk";
import { classifyPython } from "./treeSitter/python";

const BRANCH_TYPES = [
  "if_statement",
  "elif_clause",
  "for_statement",
  "while_statement",
  "except_clause",
  "except_group_clause",
  "case_clause",
  "boolean_operator",
  "conditional_expression",
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
    s.push("High complexity — consider breaking into smaller functions.");
  if (complexity > 5)
    s.push("Several branches detected — add unit tests for each path.");
  return s;
}

export async function parsePython(code) {
  try {
    const parser = await getParser("python");
    const tree = parser.parse(code);
    if (tree.rootNode.hasError) {
      const errNode = tree.rootNode.descendantsOfType("ERROR")[0];
      if (errNode) {
        const line = errNode.startPosition.row + 1;
        throw new Error(`Syntax error near line ${line}`);
      }
    }

    const { nodes, edges } = walkTree(tree.rootNode, classifyPython);
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
