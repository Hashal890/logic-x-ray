import { makeNode, makeEdge, NODE_TYPES } from "../../nodeStyles";
import { nextPos, makeUid, meta, humanizeType } from "./common";

// Node types that represent a real runtime fork — the simulator lets a user
// choose between them, and (since the condition/loop check might not take
// any of the listed paths) the construct's own id is also a valid "exit",
// letting the graph express "loop ran zero times" / "condition had no
// matching branch" without needing a dedicated fallback body per language.
const BRANCH_NODE_TYPES = new Set([NODE_TYPES.loop, NODE_TYPES.condition, NODE_TYPES.trycatch]);

// Generic CST -> flowchart walker, shared by every Tree-Sitter-backed
// parser. A language module only supplies `classify(node)`, which decides
// what a *named* CST node means:
//
//   classify(node) => {
//     type,    // one of NODE_TYPES
//     label,   // string shown on the node
//     bodies: [
//       // direct recursion: blockNode's statements become children of THIS
//       // node (e.g. a function/loop body, an if's consequence)
//       { node: blockNode },
//       // `single: true` — blockNode IS the one statement to run, not a
//       // container of statements (brace-less "if (x) return;", or an
//       // else-if chain where the alternative is itself an if_statement)
//       { node: singleStmtNode, single: true },
//       // branch: an intermediate node (else / catch / finally / case ...)
//       // is created first, edge labeled `edgeLabel` from this node to it,
//       // then blockNode's statements become children of THAT node
//       { branchType, branchLabel, edgeLabel, node: blockNode },
//       { branchType, branchLabel, edgeLabel, node: singleStmtNode, single: true },
//       // `stmts` instead of `node` — an explicit list of statement nodes
//       // to walk directly (for containers like switch_case that mix a
//       // non-statement value child in among the actual statements)
//       { branchType, branchLabel, edgeLabel, stmts: [stmt1, stmt2] },
//     ],
//   } | Array<above> | null | false
//              // an array means "this one CST node is really several
//              // sibling flowchart nodes" (e.g. `let a = 1, b = 2` — one
//              // node per declarator), chained sequentially in source order.
//              // null = "not a statement-level construct on its own" — the
//              // walker looks at its named children instead, so wrapper
//              // nodes (expression_statement, block, ...) never need a case.
//              // false = "not logic, skip entirely" (e.g. PHP's <?php tag) —
//              // unlike null, this does not recurse into children either.
//
// Every named node the walker reaches ends up as a flowchart node one way
// or another — classify() decides the type/label, and anything it doesn't
// recognize still gets a generic `statement` node (never silently dropped).
//
// Edges form a real control-flow graph, not just a containment tree: each
// statement's node links from the *exit points* of whatever came before it
// (siblings chain A -> B -> C in source order), and branch/loop/try
// constructs return the union of every path's exits so the statement that
// follows them links correctly regardless of which path was taken.
export function walkTree(rootNode, classify) {
  const nodes = [];
  const edges = [];
  const counter = { val: 1 };
  const uid = makeUid();

  function linkAll(fromIds, toId, edgeLabel) {
    for (const id of fromIds ?? []) edges.push(makeEdge(uid("e"), id, toId, edgeLabel));
  }

  function pushNode(type, label, depth, sourceNode, extra = {}) {
    const id = uid(type);
    const pos = nextPos(counter, depth);
    nodes.push(
      makeNode(id, type, label, pos, { ...meta(sourceNode, depth), ...extra }),
    );
    return id;
  }

  // Runs one body descriptor, returning the exit ids control continues from.
  function runBody(body, depth, parentIds) {
    if (body.stmts) {
      let exits = parentIds;
      for (const stmt of body.stmts) exits = visitStatement(stmt, depth, exits);
      return exits;
    }
    if (body.single) return visitStatement(body.node, depth, parentIds);
    return visitBlock(body.node, depth, parentIds);
  }

  // Runs every body descriptor (branch or plain) and returns the UNION of
  // all their exits — after an if/else, execution could continue from
  // wherever either branch left off.
  function visitBodies(bodies, depth, parentIds) {
    const allExits = [];
    for (const body of bodies ?? []) {
      if (!body || (!body.node && !body.stmts)) continue;
      if (body.branchLabel !== undefined) {
        const anchor = body.node ?? body.stmts[0];
        const branchId = pushNode(body.branchType, body.branchLabel, depth, anchor);
        linkAll(parentIds, branchId, body.edgeLabel);
        const exits = runBody(body, depth + 1, [branchId]);
        allExits.push(...(exits.length ? exits : [branchId]));
      } else {
        allExits.push(...runBody(body, depth, parentIds));
      }
    }
    return allExits;
  }

  // Visits a node expected to sit at "statement level" — it becomes its own
  // flowchart node (or, if unclassified, a fallback "statement" node) rather
  // than being silently skipped. Returns the exit ids the NEXT sibling
  // statement should link from.
  function visitStatement(node, depth, parentIds) {
    if (!node || !node.isNamed) return parentIds;

    const result = classify(node);
    if (result === false) return parentIds; // not logic — pass straight through
    if (result) {
      let exits = parentIds;
      for (const entry of Array.isArray(result) ? result : [result]) {
        const id = pushNode(entry.type, entry.label, depth, node, entry.extra);
        linkAll(exits, id, null);
        const bodyExits = visitBodies(entry.bodies, depth + 1, [id]);
        exits = bodyExits.length ? bodyExits : [id];
        if (BRANCH_NODE_TYPES.has(entry.type) && entry.bodies?.length) {
          exits = [...exits, id]; // also allow "took none of the listed paths"
        }
      }
      return exits;
    }

    // Not independently classified — recurse into its named children at the
    // same depth, chaining them in order, so wrapper nodes (expression
    // statements, blocks, ...) disappear transparently.
    const named = node.namedChildren.filter(Boolean);
    if (named.length > 0) {
      let exits = parentIds;
      for (const child of named) exits = visitStatement(child, depth, exits);
      return exits;
    }

    // A genuine leaf with nothing more specific to say — still gets a node
    // so nothing is ever silently skipped.
    const id = pushNode(NODE_TYPES.statement, humanizeType(node), depth, node);
    linkAll(parentIds, id, null);
    return [id];
  }

  // Visits a block/body container (function body, if-branch, loop body,
  // try/catch block, class body, ...) — walks its statement-level children
  // in sequence, returning the exits of the last one.
  function visitBlock(blockNode, depth, parentIds) {
    if (!blockNode) return parentIds;
    let exits = parentIds;
    for (const stmt of blockNode.namedChildren) {
      exits = visitStatement(stmt, depth, exits);
    }
    return exits;
  }

  visitBlock(rootNode, 0, []);
  return { nodes, edges };
}
