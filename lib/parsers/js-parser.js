import * as Babel from "@babel/parser";
import { makeNode, makeEdge, NODE_TYPES } from "../nodeStyles";

// ── Layout constants ──────────────────────────────────────────────────────────
const X_INDENT = 200; // horizontal step per nesting level
const Y_STEP = 80; // vertical step between sibling nodes

// ── Global counter (reset per parse call) ─────────────────────────────────────
let _id;
const uid = (prefix) => `${prefix}_${++_id}`;

// ── Human-readable expression label ──────────────────────────────────────────
// Resolves AST nodes to readable strings instead of raw type names
function exprLabel(node) {
  if (!node) return "";
  switch (node.type) {
    case "Identifier":
      return node.name;
    case "StringLiteral":
      return `"${node.value}"`;
    case "TemplateLiteral":
      return "`…`";
    case "NumericLiteral":
      return String(node.value);
    case "BooleanLiteral":
      return String(node.value);
    case "NullLiteral":
      return "null";
    case "BigIntLiteral":
      return `${node.value}n`;
    case "RegExpLiteral":
      return `/${node.pattern}/`;

    case "BinaryExpression":
    case "LogicalExpression":
      return `${exprLabel(node.left)} ${node.operator} ${exprLabel(node.right)}`;

    case "UnaryExpression":
      return `${node.operator}${exprLabel(node.argument)}`;
    case "UpdateExpression":
      return node.prefix
        ? `${node.operator}${exprLabel(node.argument)}`
        : `${exprLabel(node.argument)}${node.operator}`;

    case "AssignmentExpression":
      return `${exprLabel(node.left)} ${node.operator} ${exprLabel(node.right)}`;

    case "MemberExpression":
      return `${exprLabel(node.object)}.${exprLabel(node.property)}`;
    case "OptionalMemberExpression":
      return `${exprLabel(node.object)}?.${exprLabel(node.property)}`;

    case "CallExpression":
    case "OptionalCallExpression":
      return callLabel(node);
    case "NewExpression":
      return `new ${exprLabel(node.callee)}(…)`;

    case "ConditionalExpression":
      return `${exprLabel(node.test)} ? … : …`;

    case "ArrowFunctionExpression":
      return `(${paramList(node.params)}) => …`;
    case "FunctionExpression":
      return `function(${paramList(node.params)})`;

    case "ArrayExpression":
      return `[…]`;
    case "ObjectExpression":
      return `{…}`;

    case "AwaitExpression":
      return `await ${exprLabel(node.argument)}`;
    case "YieldExpression":
      return `yield ${exprLabel(node.argument)}`;

    case "SpreadElement":
      return `...${exprLabel(node.argument)}`;

    case "SequenceExpression":
      return node.expressions.map(exprLabel).join(", ");

    case "TaggedTemplateExpression":
      return `${exprLabel(node.tag)}\`…\``;

    case "TSAsExpression":
    case "TSTypeAssertion":
      return exprLabel(node.expression);

    // ── Patterns ──────────────────────────────────────
    case "AssignmentPattern":
      return `${exprLabel(node.left)} = ${exprLabel(node.right)}`;
    case "RestElement":
      return `...${exprLabel(node.argument)}`;
    case "ObjectPattern":
      return `{…}`;
    case "ArrayPattern":
      return `[…]`;

    // ── Private names ─────────────────────────────────
    case "PrivateName":
      return `#${exprLabel(node.id)}`;

    // ── Variable declarator ───────────────────────────
    case "VariableDeclarator":
      return node.id ? exprLabel(node.id) : "…";

    default:
      return node.name ?? node.value ?? "";
  }
}

function callLabel(node) {
  const callee = exprLabel(node.callee);
  const args = (node.arguments || []).slice(0, 2).map(exprLabel).join(", ");
  const more = node.arguments?.length > 2 ? ", …" : "";
  return `${callee}(${args}${more})`;
}

function paramList(params = []) {
  return (
    params.slice(0, 3).map(exprLabel).join(", ") +
    (params.length > 3 ? ", …" : "")
  );
}

function toBody(node) {
  if (!node) return [];
  if (node.type === "BlockStatement") return node.body;
  return [node];
}

// ── Layout: shared row counter so siblings never overlap ─────────────────────
// counter.val increments globally — every node gets a unique Y position
// depth drives X so nesting is visible
function nextPos(counter, depth) {
  return { x: depth * X_INDENT, y: counter.val++ * Y_STEP };
}

// ── Core walker ───────────────────────────────────────────────────────────────
function walk(stmts, depth, counter, parentId, nodes, edges) {
  if (!stmts?.length) return;

  for (const stmt of stmts) {
    if (!stmt?.type) continue;
    visitStmt(stmt, depth, counter, parentId, nodes, edges);
  }
}

function visitStmt(stmt, depth, counter, parentId, nodes, edges) {
  const pos = nextPos(counter, depth);

  const link = (childId) => {
    if (parentId) edges.push(makeEdge(uid("e"), parentId, childId));
  };

  switch (stmt.type) {
    // ── Imports ──────────────────────────────────────────────────────────────
    case "ImportDeclaration": {
      const specs = stmt.specifiers
        .map((s) => {
          if (s.type === "ImportDefaultSpecifier") return s.local.name;
          if (s.type === "ImportNamespaceSpecifier")
            return `* as ${s.local.name}`;
          return s.imported.name !== s.local.name
            ? `${s.imported.name} as ${s.local.name}`
            : s.local.name;
        })
        .join(", ");
      const id = uid("import");
      nodes.push(
        makeNode(
          id,
          NODE_TYPES.import,
          `${specs} from '${stmt.source.value}'`,
          pos,
        ),
      );
      link(id);
      break;
    }

    // ── Exports ──────────────────────────────────────────────────────────────
    case "ExportDefaultDeclaration": {
      const id = uid("export");
      nodes.push(makeNode(id, NODE_TYPES.export, "export default", pos));
      link(id);
      if (stmt.declaration)
        walk([stmt.declaration], depth + 1, counter, id, nodes, edges);
      break;
    }
    case "ExportNamedDeclaration": {
      const id = uid("export");
      const names = (stmt.specifiers || [])
        .map((s) => s.exported.name)
        .join(", ");
      nodes.push(
        makeNode(
          id,
          NODE_TYPES.export,
          names ? `export { ${names} }` : "export",
          pos,
        ),
      );
      link(id);
      if (stmt.declaration)
        walk([stmt.declaration], depth + 1, counter, id, nodes, edges);
      break;
    }

    // ── Classes ──────────────────────────────────────────────────────────────
    case "ClassDeclaration":
    case "ClassExpression": {
      const name = stmt.id?.name ?? "AnonymousClass";
      const sup = stmt.superClass
        ? ` extends ${exprLabel(stmt.superClass)}`
        : "";
      const id = uid("class");
      nodes.push(makeNode(id, NODE_TYPES.class, `${name}${sup}`, pos));
      link(id);
      for (const member of stmt.body?.body ?? []) {
        visitClassMember(member, depth + 1, counter, id, nodes, edges);
      }
      break;
    }

    // ── Functions ─────────────────────────────────────────────────────────────
    case "FunctionDeclaration":
    case "FunctionExpression":
    case "ArrowFunctionExpression": {
      const name =
        stmt.id?.name ??
        (stmt.type === "ArrowFunctionExpression" ? "arrow" : "fn");
      const async_ = stmt.async ? "async " : "";
      const params = paramList(stmt.params);
      const id = uid("fn");
      nodes.push(
        makeNode(id, NODE_TYPES.function, `${async_}${name}(${params})`, pos),
      );
      link(id);
      const body = stmt.body?.type === "BlockStatement" ? stmt.body.body : [];
      walk(body, depth + 1, counter, id, nodes, edges);
      break;
    }

    // ── Variable declarations ─────────────────────────────────────────────────
    case "VariableDeclaration": {
      for (const decl of stmt.declarations) {
        const varName = exprLabel(decl.id);
        const init = decl.init;

        // If init is a function — show as function node
        if (
          init?.type === "FunctionExpression" ||
          init?.type === "ArrowFunctionExpression"
        ) {
          const async_ = init.async ? "async " : "";
          const params = paramList(init.params);
          const id = uid("fn");
          nodes.push(
            makeNode(
              id,
              NODE_TYPES.function,
              `${async_}${varName}(${params})`,
              pos,
            ),
          );
          link(id);
          const body =
            init.body?.type === "BlockStatement" ? init.body.body : [];
          walk(body, depth + 1, counter, id, nodes, edges);
          return; // skip generic variable node
        }

        // If init is a class expression
        if (init?.type === "ClassExpression") {
          const sup = init.superClass
            ? ` extends ${exprLabel(init.superClass)}`
            : "";
          const id = uid("class");
          nodes.push(makeNode(id, NODE_TYPES.class, `${varName}${sup}`, pos));
          link(id);
          for (const m of init.body?.body ?? []) {
            visitClassMember(m, depth + 1, counter, id, nodes, edges);
          }
          return;
        }

        const initLabel = init ? ` = ${exprLabel(init)}` : "";
        const id = uid("var");
        nodes.push(
          makeNode(
            id,
            NODE_TYPES.variable,
            `${stmt.kind} ${varName}${initLabel}`,
            pos,
          ),
        );
        link(id);
      }
      break;
    }

    // ── If / Else ─────────────────────────────────────────────────────────────
    case "IfStatement": {
      const test = exprLabel(stmt.test);
      const id = uid("if");
      nodes.push(makeNode(id, NODE_TYPES.condition, `if (${test})`, pos));
      link(id);
      walk(toBody(stmt.consequent), depth + 1, counter, id, nodes, edges);
      if (stmt.alternate) {
        const elsePos = nextPos(counter, depth + 1);
        const elseId = uid("else");
        // else-if chains keep the condition type; plain else gets a plain label
        if (stmt.alternate.type === "IfStatement") {
          visitStmt(stmt.alternate, depth + 1, counter, id, nodes, edges);
        } else {
          nodes.push(makeNode(elseId, NODE_TYPES.condition, "else", elsePos));
          edges.push(makeEdge(uid("e"), id, elseId, "else"));
          walk(
            toBody(stmt.alternate),
            depth + 2,
            counter,
            elseId,
            nodes,
            edges,
          );
        }
      }
      break;
    }

    // ── Switch ────────────────────────────────────────────────────────────────
    case "SwitchStatement": {
      const id = uid("switch");
      nodes.push(
        makeNode(
          id,
          NODE_TYPES.condition,
          `switch (${exprLabel(stmt.discriminant)})`,
          pos,
        ),
      );
      link(id);
      for (const c of stmt.cases ?? []) {
        const casePos = nextPos(counter, depth + 1);
        const caseId = uid("case");
        const caseLabel = c.test ? `case ${exprLabel(c.test)}` : "default";
        nodes.push(makeNode(caseId, NODE_TYPES.condition, caseLabel, casePos));
        edges.push(makeEdge(uid("e"), id, caseId));
        walk(c.consequent, depth + 2, counter, caseId, nodes, edges);
      }
      break;
    }

    // ── Loops ─────────────────────────────────────────────────────────────────
    case "ForStatement": {
      const test = stmt.test ? exprLabel(stmt.test) : ";;";
      const id = uid("for");
      nodes.push(makeNode(id, NODE_TYPES.loop, `for (${test})`, pos));
      link(id);
      walk(toBody(stmt.body), depth + 1, counter, id, nodes, edges);
      break;
    }
    case "ForInStatement": {
      const id = uid("forin");
      nodes.push(
        makeNode(
          id,
          NODE_TYPES.loop,
          `for (${exprLabel(stmt.left)} in ${exprLabel(stmt.right)})`,
          pos,
        ),
      );
      link(id);
      walk(toBody(stmt.body), depth + 1, counter, id, nodes, edges);
      break;
    }
    case "ForOfStatement": {
      const id = uid("forof");
      nodes.push(
        makeNode(
          id,
          NODE_TYPES.loop,
          `for (${exprLabel(stmt.left)} of ${exprLabel(stmt.right)})`,
          pos,
        ),
      );
      link(id);
      walk(toBody(stmt.body), depth + 1, counter, id, nodes, edges);
      break;
    }
    case "WhileStatement": {
      const id = uid("while");
      nodes.push(
        makeNode(id, NODE_TYPES.loop, `while (${exprLabel(stmt.test)})`, pos),
      );
      link(id);
      walk(toBody(stmt.body), depth + 1, counter, id, nodes, edges);
      break;
    }
    case "DoWhileStatement": {
      const id = uid("dowhile");
      nodes.push(
        makeNode(
          id,
          NODE_TYPES.loop,
          `do…while (${exprLabel(stmt.test)})`,
          pos,
        ),
      );
      link(id);
      walk(toBody(stmt.body), depth + 1, counter, id, nodes, edges);
      break;
    }

    // ── Try / Catch / Finally ─────────────────────────────────────────────────
    case "TryStatement": {
      const id = uid("try");
      nodes.push(makeNode(id, NODE_TYPES.trycatch, "try", pos));
      link(id);
      walk(stmt.block?.body ?? [], depth + 1, counter, id, nodes, edges);

      if (stmt.handler) {
        const param = stmt.handler.param ? exprLabel(stmt.handler.param) : "e";
        const catchId = uid("catch");
        const catchPos = nextPos(counter, depth + 1);
        nodes.push(
          makeNode(catchId, NODE_TYPES.trycatch, `catch (${param})`, catchPos),
        );
        edges.push(makeEdge(uid("e"), id, catchId, "catch"));
        walk(
          stmt.handler.body?.body ?? [],
          depth + 2,
          counter,
          catchId,
          nodes,
          edges,
        );
      }
      if (stmt.finalizer) {
        const finId = uid("finally");
        const finPos = nextPos(counter, depth + 1);
        nodes.push(makeNode(finId, NODE_TYPES.trycatch, "finally", finPos));
        edges.push(makeEdge(uid("e"), id, finId, "finally"));
        walk(
          stmt.finalizer.body ?? [],
          depth + 2,
          counter,
          finId,
          nodes,
          edges,
        );
      }
      break;
    }

    // ── Return / Throw / Break / Continue / Yield ─────────────────────────────
    case "ReturnStatement": {
      const val = stmt.argument ? exprLabel(stmt.argument) : "";
      const id = uid("ret");
      nodes.push(makeNode(id, NODE_TYPES.returnNode, `return ${val}`, pos));
      link(id);
      break;
    }
    case "ThrowStatement": {
      const id = uid("throw");
      nodes.push(
        makeNode(
          id,
          NODE_TYPES.returnNode,
          `throw ${exprLabel(stmt.argument)}`,
          pos,
        ),
      );
      link(id);
      break;
    }
    case "BreakStatement": {
      const id = uid("break");
      nodes.push(
        makeNode(
          id,
          NODE_TYPES.returnNode,
          stmt.label ? `break ${stmt.label.name}` : "break",
          pos,
        ),
      );
      link(id);
      break;
    }
    case "ContinueStatement": {
      const id = uid("cont");
      nodes.push(
        makeNode(
          id,
          NODE_TYPES.returnNode,
          stmt.label ? `continue ${stmt.label.name}` : "continue",
          pos,
        ),
      );
      link(id);
      break;
    }

    // ── Expression statements ─────────────────────────────────────────────────
    case "ExpressionStatement": {
      const expr = stmt.expression;
      if (!expr) break;

      // Awaited calls e.g. await fetch(...)
      const inner = expr.type === "AwaitExpression" ? expr.argument : expr;

      if (
        inner?.type === "CallExpression" ||
        inner?.type === "OptionalCallExpression"
      ) {
        const id = uid("call");
        nodes.push(makeNode(id, NODE_TYPES.function, callLabel(inner), pos));
        link(id);
        break;
      }
      if (inner?.type === "AssignmentExpression") {
        const id = uid("assign");
        nodes.push(
          makeNode(
            id,
            NODE_TYPES.variable,
            `${exprLabel(inner.left)} ${inner.operator} ${exprLabel(inner.right)}`,
            pos,
          ),
        );
        link(id);
        break;
      }
      break;
    }

    // ── Block statement (bare block) ──────────────────────────────────────────
    case "BlockStatement": {
      walk(stmt.body, depth, counter, parentId, nodes, edges);
      break;
    }

    default:
      break;
  }
}

// ── Class member visitor ──────────────────────────────────────────────────────
function visitClassMember(member, depth, counter, parentId, nodes, edges) {
  if (!member) return;
  const pos = nextPos(counter, depth);

  if (member.type === "ClassMethod" || member.type === "ClassPrivateMethod") {
    const name = exprLabel(member.key);
    const kind = member.kind !== "method" ? `${member.kind} ` : "";
    const static_ = member.static ? "static " : "";
    const async_ = member.async ? "async " : "";
    const params = paramList(member.params);
    const id = uid("method");
    nodes.push(
      makeNode(
        id,
        NODE_TYPES.function,
        `${static_}${async_}${kind}${name}(${params})`,
        pos,
      ),
    );
    if (parentId) edges.push(makeEdge(uid("e"), parentId, id));
    walk(member.body?.body ?? [], depth + 1, counter, id, nodes, edges);
    return;
  }

  if (
    member.type === "ClassProperty" ||
    member.type === "ClassPrivateProperty"
  ) {
    const name = exprLabel(member.key);
    const static_ = member.static ? "static " : "";
    const init = member.value ? ` = ${exprLabel(member.value)}` : "";
    const id = uid("prop");
    nodes.push(
      makeNode(id, NODE_TYPES.variable, `${static_}${name}${init}`, pos),
    );
    if (parentId) edges.push(makeEdge(uid("e"), parentId, id));
  }
}

// ── Cyclomatic complexity ─────────────────────────────────────────────────────
function calcComplexity(ast) {
  let n = 1;
  const BRANCH_TYPES = new Set([
    "IfStatement",
    "ForStatement",
    "ForInStatement",
    "ForOfStatement",
    "WhileStatement",
    "DoWhileStatement",
    "SwitchCase",
    "CatchClause",
    "ConditionalExpression",
    "LogicalExpression",
  ]);
  JSON.stringify(ast, (_, val) => {
    if (val?.type && BRANCH_TYPES.has(val.type)) n++;
    return val;
  });
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

// ── Public API ────────────────────────────────────────────────────────────────
export function parseJS(code) {
  _id = 0;
  try {
    const ast = Babel.parse(code, {
      sourceType: "module",
      errorRecovery: true,
      plugins: [
        "jsx",
        "classProperties",
        "classPrivateProperties",
        "classPrivateMethods",
        "optionalChaining",
        "nullishCoalescingOperator",
        "decorators-legacy",
      ],
    });

    const nodes = [];
    const edges = [];
    const counter = { val: 1 };

    walk(ast.program.body, 0, counter, null, nodes, edges);

    const complexity = calcComplexity(ast);
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
