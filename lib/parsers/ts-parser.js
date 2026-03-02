import * as Babel from "@babel/parser";
import { makeNode, makeEdge, NODE_TYPES } from "../nodeStyles";

// ─── Layout ───────────────────────────────────────────────────────────────────
const X_INDENT = 200;
const Y_STEP = 80;

let _id;
const uid = (p) => `${p}_${++_id}`;

function nextPos(counter, depth) {
  return { x: depth * X_INDENT, y: counter.val++ * Y_STEP };
}

// ─── Expression → readable string ────────────────────────────────────────────
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
      return `${exprLabel(node.argument)}${node.operator}`;
    case "AssignmentExpression":
      return `${exprLabel(node.left)} ${node.operator} ${exprLabel(node.right)}`;
    case "MemberExpression":
    case "OptionalMemberExpression":
      return `${exprLabel(node.object)}.${exprLabel(node.property)}`;
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
      return "[…]";
    case "ObjectExpression":
      return "{…}";
    case "AwaitExpression":
      return `await ${exprLabel(node.argument)}`;
    case "YieldExpression":
      return `yield ${exprLabel(node.argument)}`;
    case "SpreadElement":
      return `...${exprLabel(node.argument)}`;
    case "AssignmentPattern":
      return `${exprLabel(node.left)} = ${exprLabel(node.right)}`;
    case "RestElement":
      return `...${exprLabel(node.argument)}`;
    case "ObjectPattern":
      return "{…}";
    case "ArrayPattern":
      return "[…]";
    case "PrivateName":
      return `#${exprLabel(node.id)}`;
    case "VariableDeclarator":
      return node.id ? exprLabel(node.id) : "…";
    // TS-specific expressions
    case "TSAsExpression":
      return `${exprLabel(node.expression)} as ${tsTypeLabel(node.typeAnnotation)}`;
    case "TSTypeAssertion":
      return `<${tsTypeLabel(node.typeAnnotation)}>${exprLabel(node.expression)}`;
    case "TSSatisfiesExpression":
      return `${exprLabel(node.expression)} satisfies ${tsTypeLabel(node.typeAnnotation)}`;
    case "TSNonNullExpression":
      return `${exprLabel(node.expression)}!`;
    default:
      return node.name ?? String(node.value ?? "");
  }
}

function callLabel(node) {
  const callee = exprLabel(node.callee);
  const args = (node.arguments || []).slice(0, 2).map(exprLabel).join(", ");
  return `${callee}(${args}${node.arguments?.length > 2 ? ", …" : ""})`;
}

function paramList(params = []) {
  return (
    params.slice(0, 3).map(exprLabel).join(", ") +
    (params.length > 3 ? ", …" : "")
  );
}

// ─── TS type → readable string ────────────────────────────────────────────────
function tsTypeLabel(node) {
  if (!node) return "";
  switch (node.type) {
    case "TSStringKeyword":
      return "string";
    case "TSNumberKeyword":
      return "number";
    case "TSBooleanKeyword":
      return "boolean";
    case "TSAnyKeyword":
      return "any";
    case "TSUnknownKeyword":
      return "unknown";
    case "TSNeverKeyword":
      return "never";
    case "TSVoidKeyword":
      return "void";
    case "TSNullKeyword":
      return "null";
    case "TSUndefinedKeyword":
      return "undefined";
    case "TSObjectKeyword":
      return "object";
    case "TSSymbolKeyword":
      return "symbol";
    case "TSBigIntKeyword":
      return "bigint";
    case "TSArrayType":
      return `${tsTypeLabel(node.elementType)}[]`;
    case "TSUnionType":
      return node.types.map(tsTypeLabel).join(" | ");
    case "TSIntersectionType":
      return node.types.map(tsTypeLabel).join(" & ");
    case "TSLiteralType":
      return exprLabel(node.literal);
    case "TSTypeReference":
      return (
        exprLabel(node.typeName) +
        (node.typeParameters
          ? `<${node.typeParameters.params.map(tsTypeLabel).join(", ")}>`
          : "")
      );
    case "TSOptionalType":
      return `${tsTypeLabel(node.typeAnnotation)}?`;
    case "TSRestType":
      return `...${tsTypeLabel(node.typeAnnotation)}`;
    case "TSTupleType":
      return `[${node.elementTypes.map(tsTypeLabel).join(", ")}]`;
    case "TSFunctionType":
      return `(${paramList(node.parameters)}) => ${tsTypeLabel(node.typeAnnotation)}`;
    case "TSConditionalType":
      return `${tsTypeLabel(node.checkType)} extends ${tsTypeLabel(node.extendsType)} ? … : …`;
    case "TSMappedType":
      return `{ [${node.typeParameter?.name ?? "K"} in …]: … }`;
    case "TSIndexedAccessType":
      return `${tsTypeLabel(node.objectType)}[${tsTypeLabel(node.indexType)}]`;
    case "TSTypeQuery":
      return `typeof ${exprLabel(node.exprName)}`;
    case "TSTypePredicate":
      return `${exprLabel(node.parameterName)} is ${tsTypeLabel(node.typeAnnotation)}`;
    case "TSInferType":
      return `infer ${tsTypeLabel(node.typeParameter)}`;
    case "TSTypeOperator":
      return `${node.operator} ${tsTypeLabel(node.typeAnnotation)}`;
    default:
      return node.type?.replace(/^TS/, "") ?? "…";
  }
}

// ─── Generic type params string ───────────────────────────────────────────────
function typeParamsLabel(node) {
  if (!node?.params?.length) return "";
  return `<${node.params.map((p) => p.name).join(", ")}>`;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function toBody(node) {
  if (!node) return [];
  if (node.type === "BlockStatement") return node.body;
  return [node];
}

function link(edges, parentId, childId, label = "") {
  if (parentId) edges.push(makeEdge(uid("e"), parentId, childId, label));
}

// ─── Class member visitor ─────────────────────────────────────────────────────
function visitClassMember(member, depth, counter, parentId, nodes, edges) {
  if (!member) return;
  const pos = nextPos(counter, depth);

  // Constructor / method / accessor
  if (
    ["ClassMethod", "ClassPrivateMethod", "TSDeclareMethod"].includes(
      member.type,
    )
  ) {
    const name = exprLabel(member.key);
    const kind = member.kind !== "method" ? `${member.kind} ` : "";
    const mod = [
      member.accessibility,
      member.static ? "static" : "",
      member.abstract ? "abstract" : "",
      member.async ? "async" : "",
    ]
      .filter(Boolean)
      .join(" ");
    const params = paramList(member.params);
    const ret = member.returnType
      ? `: ${tsTypeLabel(member.returnType.typeAnnotation)}`
      : "";
    const id = uid("method");
    nodes.push(
      makeNode(
        id,
        NODE_TYPES.function,
        `${mod ? mod + " " : ""}${kind}${name}(${params})${ret}`,
        pos,
      ),
    );
    link(edges, parentId, id);
    walk(member.body?.body ?? [], depth + 1, counter, id, nodes, edges);
    return;
  }

  // Property / private property
  if (
    ["ClassProperty", "ClassPrivateProperty", "ClassAccessorProperty"].includes(
      member.type,
    )
  ) {
    const name = exprLabel(member.key);
    const mod = [
      member.accessibility,
      member.static ? "static" : "",
      member.readonly ? "readonly" : "",
      member.abstract ? "abstract" : "",
    ]
      .filter(Boolean)
      .join(" ");
    const typeAnn = member.typeAnnotation
      ? `: ${tsTypeLabel(member.typeAnnotation.typeAnnotation)}`
      : "";
    const init = member.value ? ` = ${exprLabel(member.value)}` : "";
    const id = uid("prop");
    nodes.push(
      makeNode(
        id,
        NODE_TYPES.variable,
        `${mod ? mod + " " : ""}${name}${typeAnn}${init}`,
        pos,
      ),
    );
    link(edges, parentId, id);
    return;
  }

  // Index signature  [key: string]: value
  if (member.type === "TSIndexSignature") {
    const id = uid("idx");
    nodes.push(makeNode(id, NODE_TYPES.variable, "[index signature]", pos));
    link(edges, parentId, id);
  }
}

// ─── TS-specific statement visitor ───────────────────────────────────────────
function visitTSStmt(stmt, depth, counter, parentId, nodes, edges) {
  const pos = nextPos(counter, depth);

  switch (stmt.type) {
    // ── interface Foo [extends Bar] ─────────────────────────────────────────
    case "TSInterfaceDeclaration": {
      const name = stmt.id.name;
      const tparam = typeParamsLabel(stmt.typeParameters);
      const ext = (stmt.extends ?? [])
        .map((e) => exprLabel(e.expression))
        .join(", ");
      const id = uid("iface");
      nodes.push(
        makeNode(
          id,
          NODE_TYPES.class,
          `interface ${name}${tparam}${ext ? ` extends ${ext}` : ""}`,
          pos,
        ),
      );
      link(edges, parentId, id);
      // interface body members
      for (const m of stmt.body?.body ?? []) {
        visitInterfaceMember(m, depth + 1, counter, id, nodes, edges);
      }
      break;
    }

    // ── type Foo = Bar ──────────────────────────────────────────────────────
    case "TSTypeAliasDeclaration": {
      const name = stmt.id.name;
      const tparam = typeParamsLabel(stmt.typeParameters);
      const rhs = tsTypeLabel(stmt.typeAnnotation);
      const id = uid("type");
      nodes.push(
        makeNode(
          id,
          NODE_TYPES.variable,
          `type ${name}${tparam} = ${rhs}`,
          pos,
        ),
      );
      link(edges, parentId, id);
      break;
    }

    // ── enum Foo ────────────────────────────────────────────────────────────
    case "TSEnumDeclaration": {
      const id = uid("enum");
      nodes.push(
        makeNode(
          id,
          NODE_TYPES.class,
          `${stmt.const ? "const " : ""}enum ${stmt.id.name}`,
          pos,
        ),
      );
      link(edges, parentId, id);
      for (const member of stmt.members ?? []) {
        const mPos = nextPos(counter, depth + 1);
        const mid = uid("enumm");
        const val = member.initializer
          ? ` = ${exprLabel(member.initializer)}`
          : "";
        nodes.push(
          makeNode(
            mid,
            NODE_TYPES.variable,
            `${exprLabel(member.id)}${val}`,
            mPos,
          ),
        );
        edges.push(makeEdge(uid("e"), id, mid));
      }
      break;
    }

    // ── namespace / module ──────────────────────────────────────────────────
    case "TSModuleDeclaration": {
      const keyword = stmt.declare ? "declare " : "";
      const kind = stmt.global
        ? "global"
        : stmt.namespace
          ? "namespace"
          : "module";
      const name = stmt.id ? exprLabel(stmt.id) : "";
      const id = uid("ns");
      nodes.push(
        makeNode(id, NODE_TYPES.class, `${keyword}${kind} ${name}`, pos),
      );
      link(edges, parentId, id);
      const body = stmt.body?.body ?? (stmt.body ? [stmt.body] : []);
      walk(body, depth + 1, counter, id, nodes, edges);
      break;
    }

    // ── declare const / declare function / declare class ───────────────────
    case "TSDeclareFunction": {
      const name = stmt.id?.name ?? "fn";
      const tparam = typeParamsLabel(stmt.typeParameters);
      const params = paramList(stmt.params);
      const ret = stmt.returnType
        ? `: ${tsTypeLabel(stmt.returnType.typeAnnotation)}`
        : "";
      const id = uid("declfn");
      nodes.push(
        makeNode(
          id,
          NODE_TYPES.function,
          `declare function ${name}${tparam}(${params})${ret}`,
          pos,
        ),
      );
      link(edges, parentId, id);
      break;
    }

    // ── abstract class ──────────────────────────────────────────────────────
    // Handled by shared class visitor below — no separate case needed

    default:
      return false; // signal: not a TS-specific node
  }
  return true;
}

// ─── Interface member visitor ─────────────────────────────────────────────────
function visitInterfaceMember(member, depth, counter, parentId, nodes, edges) {
  const pos = nextPos(counter, depth);

  if (member.type === "TSMethodSignature") {
    const name = exprLabel(member.key);
    const params = paramList(member.parameters);
    const ret = member.typeAnnotation
      ? `: ${tsTypeLabel(member.typeAnnotation.typeAnnotation)}`
      : "";
    const id = uid("imethod");
    nodes.push(
      makeNode(id, NODE_TYPES.function, `${name}(${params})${ret}`, pos),
    );
    link(edges, parentId, id);
    return;
  }

  if (member.type === "TSPropertySignature") {
    const name = exprLabel(member.key);
    const opt = member.optional ? "?" : "";
    const typeAnn = member.typeAnnotation
      ? `: ${tsTypeLabel(member.typeAnnotation.typeAnnotation)}`
      : "";
    const readonly_ = member.readonly ? "readonly " : "";
    const id = uid("iprop");
    nodes.push(
      makeNode(
        id,
        NODE_TYPES.variable,
        `${readonly_}${name}${opt}${typeAnn}`,
        pos,
      ),
    );
    link(edges, parentId, id);
    return;
  }

  if (member.type === "TSIndexSignature") {
    const id = uid("iidx");
    nodes.push(makeNode(id, NODE_TYPES.variable, "[index signature]", pos));
    link(edges, parentId, id);
  }
}

// ─── Decorator visitor ────────────────────────────────────────────────────────
function visitDecorator(dec, depth, counter, parentId, nodes, edges) {
  const pos = nextPos(counter, depth);
  const label = dec.expression ? `@${exprLabel(dec.expression)}` : "@decorator";
  const id = uid("dec");
  nodes.push(makeNode(id, NODE_TYPES.import, label, pos));
  link(edges, parentId, id);
  return id;
}

// ─── Core walker ──────────────────────────────────────────────────────────────
function walk(stmts, depth, counter, parentId, nodes, edges) {
  if (!stmts?.length) return;
  for (const stmt of stmts) {
    if (!stmt?.type) continue;
    visitStmt(stmt, depth, counter, parentId, nodes, edges);
  }
}

function visitStmt(stmt, depth, counter, parentId, nodes, edges) {
  // Try TS-specific nodes first
  if (visitTSStmt(stmt, depth, counter, parentId, nodes, edges)) return;

  const pos = nextPos(counter, depth);
  const lnk = (id, lbl) => link(edges, parentId, id, lbl);

  switch (stmt.type) {
    // ── Imports ─────────────────────────────────────────────────────────────
    case "ImportDeclaration": {
      if (stmt.importKind === "type") {
        // import type { Foo }
        const specs = stmt.specifiers.map((s) => s.local.name).join(", ");
        const id = uid("itype");
        nodes.push(
          makeNode(
            id,
            NODE_TYPES.import,
            `import type { ${specs} } from '${stmt.source.value}'`,
            pos,
          ),
        );
        lnk(id);
        break;
      }
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
      lnk(id);
      break;
    }

    // ── Exports ─────────────────────────────────────────────────────────────
    case "ExportDefaultDeclaration": {
      const id = uid("export");
      nodes.push(makeNode(id, NODE_TYPES.export, "export default", pos));
      lnk(id);
      if (stmt.declaration)
        walk([stmt.declaration], depth + 1, counter, id, nodes, edges);
      break;
    }
    case "ExportNamedDeclaration": {
      const id = uid("export");
      const kind = stmt.exportKind === "type" ? "export type" : "export";
      const names = (stmt.specifiers ?? [])
        .map((s) => s.exported.name)
        .join(", ");
      nodes.push(
        makeNode(
          id,
          NODE_TYPES.export,
          names ? `${kind} { ${names} }` : kind,
          pos,
        ),
      );
      lnk(id);
      if (stmt.declaration)
        walk([stmt.declaration], depth + 1, counter, id, nodes, edges);
      break;
    }

    // ── Classes (including abstract) ────────────────────────────────────────
    case "ClassDeclaration":
    case "ClassExpression": {
      const decorators = stmt.decorators ?? [];
      let lastDecId = parentId;
      for (const dec of decorators) {
        const did = visitDecorator(
          dec,
          depth,
          counter,
          lastDecId,
          nodes,
          edges,
        );
        lastDecId = did;
      }

      const abstract_ = stmt.abstract ? "abstract " : "";
      const name = stmt.id?.name ?? "AnonymousClass";
      const tparam = typeParamsLabel(stmt.typeParameters);
      const sup = stmt.superClass
        ? ` extends ${exprLabel(stmt.superClass)}`
        : "";
      const impl = (stmt.implements ?? [])
        .map((i) => exprLabel(i.expression))
        .join(", ");
      const id = uid("class");
      nodes.push(
        makeNode(
          id,
          NODE_TYPES.class,
          `${abstract_}class ${name}${tparam}${sup}${impl ? ` implements ${impl}` : ""}`,
          pos,
        ),
      );
      link(edges, lastDecId, id);

      for (const m of stmt.body?.body ?? []) {
        visitClassMember(m, depth + 1, counter, id, nodes, edges);
      }
      break;
    }

    // ── Functions (including decorated) ─────────────────────────────────────
    case "FunctionDeclaration":
    case "FunctionExpression":
    case "ArrowFunctionExpression": {
      const decorators = stmt.decorators ?? [];
      let lastDecId = parentId;
      for (const dec of decorators) {
        const did = visitDecorator(
          dec,
          depth,
          counter,
          lastDecId,
          nodes,
          edges,
        );
        lastDecId = did;
      }

      const name =
        stmt.id?.name ??
        (stmt.type === "ArrowFunctionExpression" ? "arrow" : "fn");
      const async_ = stmt.async ? "async " : "";
      const tparam = typeParamsLabel(stmt.typeParameters);
      const params = paramList(stmt.params);
      const ret = stmt.returnType
        ? `: ${tsTypeLabel(stmt.returnType.typeAnnotation)}`
        : "";
      const id = uid("fn");
      nodes.push(
        makeNode(
          id,
          NODE_TYPES.function,
          `${async_}${name}${tparam}(${params})${ret}`,
          pos,
        ),
      );
      link(edges, lastDecId, id);

      const body = stmt.body?.type === "BlockStatement" ? stmt.body.body : [];
      walk(body, depth + 1, counter, id, nodes, edges);
      break;
    }

    // ── Variable declarations ────────────────────────────────────────────────
    case "VariableDeclaration": {
      for (const decl of stmt.declarations) {
        const varName = exprLabel(decl.id);
        const typeAnn = decl.id?.typeAnnotation
          ? `: ${tsTypeLabel(decl.id.typeAnnotation.typeAnnotation)}`
          : "";
        const init = decl.init;

        if (
          init?.type === "FunctionExpression" ||
          init?.type === "ArrowFunctionExpression"
        ) {
          const async_ = init.async ? "async " : "";
          const tparam = typeParamsLabel(init.typeParameters);
          const params = paramList(init.params);
          const ret = init.returnType
            ? `: ${tsTypeLabel(init.returnType.typeAnnotation)}`
            : "";
          const id = uid("fn");
          nodes.push(
            makeNode(
              id,
              NODE_TYPES.function,
              `${async_}${varName}${tparam}(${params})${ret}`,
              pos,
            ),
          );
          lnk(id);
          const body =
            init.body?.type === "BlockStatement" ? init.body.body : [];
          walk(body, depth + 1, counter, id, nodes, edges);
          return;
        }

        if (init?.type === "ClassExpression") {
          const sup = init.superClass
            ? ` extends ${exprLabel(init.superClass)}`
            : "";
          const id = uid("class");
          nodes.push(makeNode(id, NODE_TYPES.class, `${varName}${sup}`, pos));
          lnk(id);
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
            `${stmt.kind} ${varName}${typeAnn}${initLabel}`,
            pos,
          ),
        );
        lnk(id);
      }
      break;
    }

    // ── If / Else ────────────────────────────────────────────────────────────
    case "IfStatement": {
      const id = uid("if");
      nodes.push(
        makeNode(id, NODE_TYPES.condition, `if (${exprLabel(stmt.test)})`, pos),
      );
      lnk(id);
      walk(toBody(stmt.consequent), depth + 1, counter, id, nodes, edges);
      if (stmt.alternate) {
        if (stmt.alternate.type === "IfStatement") {
          visitStmt(stmt.alternate, depth + 1, counter, id, nodes, edges);
        } else {
          const epos = nextPos(counter, depth + 1);
          const eid = uid("else");
          nodes.push(makeNode(eid, NODE_TYPES.condition, "else", epos));
          edges.push(makeEdge(uid("e"), id, eid, "else"));
          walk(toBody(stmt.alternate), depth + 2, counter, eid, nodes, edges);
        }
      }
      break;
    }

    // ── Switch ───────────────────────────────────────────────────────────────
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
      lnk(id);
      for (const c of stmt.cases ?? []) {
        const cp = nextPos(counter, depth + 1);
        const cid = uid("case");
        nodes.push(
          makeNode(
            cid,
            NODE_TYPES.condition,
            c.test ? `case ${exprLabel(c.test)}` : "default",
            cp,
          ),
        );
        edges.push(makeEdge(uid("e"), id, cid));
        walk(c.consequent, depth + 2, counter, cid, nodes, edges);
      }
      break;
    }

    // ── Loops ────────────────────────────────────────────────────────────────
    case "ForStatement": {
      const id = uid("for");
      nodes.push(
        makeNode(
          id,
          NODE_TYPES.loop,
          `for (${stmt.test ? exprLabel(stmt.test) : ";;"})`,
          pos,
        ),
      );
      lnk(id);
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
      lnk(id);
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
      lnk(id);
      walk(toBody(stmt.body), depth + 1, counter, id, nodes, edges);
      break;
    }
    case "WhileStatement": {
      const id = uid("while");
      nodes.push(
        makeNode(id, NODE_TYPES.loop, `while (${exprLabel(stmt.test)})`, pos),
      );
      lnk(id);
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
      lnk(id);
      walk(toBody(stmt.body), depth + 1, counter, id, nodes, edges);
      break;
    }

    // ── Try / Catch / Finally ────────────────────────────────────────────────
    case "TryStatement": {
      const id = uid("try");
      nodes.push(makeNode(id, NODE_TYPES.trycatch, "try", pos));
      lnk(id);
      walk(stmt.block?.body ?? [], depth + 1, counter, id, nodes, edges);
      if (stmt.handler) {
        const param = stmt.handler.param ? exprLabel(stmt.handler.param) : "e";
        const typeAnn = stmt.handler.param?.typeAnnotation
          ? `: ${tsTypeLabel(stmt.handler.param.typeAnnotation.typeAnnotation)}`
          : "";
        const cid = uid("catch");
        const cpos = nextPos(counter, depth + 1);
        nodes.push(
          makeNode(
            cid,
            NODE_TYPES.trycatch,
            `catch (${param}${typeAnn})`,
            cpos,
          ),
        );
        edges.push(makeEdge(uid("e"), id, cid, "catch"));
        walk(
          stmt.handler.body?.body ?? [],
          depth + 2,
          counter,
          cid,
          nodes,
          edges,
        );
      }
      if (stmt.finalizer) {
        const fid = uid("finally");
        const fpos = nextPos(counter, depth + 1);
        nodes.push(makeNode(fid, NODE_TYPES.trycatch, "finally", fpos));
        edges.push(makeEdge(uid("e"), id, fid, "finally"));
        walk(stmt.finalizer.body ?? [], depth + 2, counter, fid, nodes, edges);
      }
      break;
    }

    // ── Return / Throw / Break / Continue ────────────────────────────────────
    case "ReturnStatement": {
      const id = uid("ret");
      nodes.push(
        makeNode(
          id,
          NODE_TYPES.returnNode,
          `return ${stmt.argument ? exprLabel(stmt.argument) : ""}`,
          pos,
        ),
      );
      lnk(id);
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
      lnk(id);
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
      lnk(id);
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
      lnk(id);
      break;
    }

    // ── Expression statements ─────────────────────────────────────────────────
    case "ExpressionStatement": {
      const expr = stmt.expression;
      if (!expr) break;
      const inner = expr.type === "AwaitExpression" ? expr.argument : expr;
      if (
        inner?.type === "CallExpression" ||
        inner?.type === "OptionalCallExpression"
      ) {
        const id = uid("call");
        nodes.push(makeNode(id, NODE_TYPES.function, callLabel(inner), pos));
        lnk(id);
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
        lnk(id);
        break;
      }
      break;
    }

    case "BlockStatement":
      walk(stmt.body, depth, counter, parentId, nodes, edges);
      break;

    default:
      break;
  }
}

// ─── Cyclomatic complexity ────────────────────────────────────────────────────
function calcComplexity(ast) {
  let n = 1;
  const BRANCHES = new Set([
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
    if (val?.type && BRANCHES.has(val.type)) n++;
    return val;
  });
  return n;
}

function buildSuggestions(complexity) {
  const s = [];
  if (complexity > 10)
    s.push("High complexity — consider splitting into smaller functions.");
  if (complexity > 5)
    s.push("Some branching — ensure all code paths are tested.");
  return s;
}

// ─── Public API ───────────────────────────────────────────────────────────────
export function parseTS(code) {
  _id = 0;
  try {
    const ast = Babel.parse(code, {
      sourceType: "module",
      errorRecovery: true,
      plugins: [
        "typescript",
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
    const counter = { val: 0 };

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
