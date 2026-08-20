import { NODE_TYPES } from "../../nodeStyles";
import { textOf, sameNode } from "./common";

function stripSemi(text) {
  return text.replace(/;\s*$/, "");
}

// True for an unnamed (literal-token) child whose type equals `text` —
// used to tell "for...of" from "for...in" and similar keyword-only diffs.
function hasToken(node, text) {
  for (let i = 0; i < node.childCount; i++) {
    if (node.child(i).type === text) return true;
  }
  return false;
}

function fnLabel(node, name) {
  const async_ = hasToken(node, "async") ? "async " : "";
  const gen = hasToken(node, "*") ? "*" : "";
  const params = textOf(node.childForFieldName("parameters"), 60);
  return `${async_}${gen}${name}${params}`;
}

// A variable declarator whose value is itself a function/class — these get
// promoted to a function/class node instead of a plain variable node,
// matching how a named `function foo() {}` reads.
function declaratorAsContainer(declarator) {
  const value = declarator.childForFieldName("value");
  if (!value) return null;
  if (value.type === "arrow_function" || value.type === "function_expression") {
    return { kind: "function", value };
  }
  if (value.type === "class") {
    return { kind: "class", value };
  }
  return null;
}

function classifyDeclarator(declarator, kind) {
  const name = textOf(declarator.childForFieldName("name"), 40);
  const container = declaratorAsContainer(declarator);
  if (container?.kind === "function") {
    return {
      type: NODE_TYPES.function,
      label: fnLabel(container.value, name),
      bodies: [{ node: container.value.childForFieldName("body") }],
    };
  }
  if (container?.kind === "class") {
    const sup = textOf(container.value.childForFieldName("superclass"), 30);
    return {
      type: NODE_TYPES.class,
      label: `${name}${sup ? ` extends ${sup}` : ""}`,
      bodies: [{ node: container.value.childForFieldName("body") }],
    };
  }
  const value = declarator.childForFieldName("value");
  return {
    type: NODE_TYPES.variable,
    label: `${kind} ${name}${value ? ` = ${textOf(value, 40)}` : ""}`,
    bodies: [],
    extra: { varName: name, varOp: "=", varValueText: value ? textOf(value, 200) : null },
  };
}

function classifyClassMember(node) {
  if (node.type === "method_definition") {
    const name = textOf(node.childForFieldName("name"), 40);
    return {
      type: NODE_TYPES.function,
      label: fnLabel(node, name),
      bodies: [{ node: node.childForFieldName("body") }],
    };
  }
  if (node.type === "field_definition") {
    const name = textOf(node.childForFieldName("property"), 40);
    const value = node.childForFieldName("value");
    return {
      type: NODE_TYPES.variable,
      label: `${name}${value ? ` = ${textOf(value, 40)}` : ""}`,
      bodies: [],
    };
  }
  if (node.type === "class_static_block") {
    return {
      type: NODE_TYPES.statement,
      label: "static { … }",
      bodies: [{ node }],
    };
  }
  return null;
}

export function classifyJS(node) {
  switch (node.type) {
    case "import_statement": {
      const source = textOf(node.childForFieldName("source"), 40);
      const clause = node.namedChildren.find(
        (c) => c && (c.type === "import_clause" || c.type === "namespace_import"),
      );
      return {
        type: NODE_TYPES.import,
        label: `${clause ? textOf(clause, 40) + " " : ""}from ${source}`,
        bodies: [],
      };
    }

    case "export_statement": {
      if (hasToken(node, "default")) {
        return {
          type: NODE_TYPES.export,
          label: `export default ${textOf(node.lastNamedChild, 40)}`,
          bodies: [],
        };
      }
      const decl = node.childForFieldName("declaration");
      if (decl) {
        // re-classify the wrapped declaration, then prefix its label with
        // "export" so the node still shows what it actually is
        const inner = classifyJS(decl);
        if (inner) return { ...inner, label: `export ${inner.label}` };
      }
      const source = textOf(node.childForFieldName("source"), 40);
      if (source) {
        const ns = node.namedChildren.find((c) => c?.type === "namespace_export");
        return {
          type: NODE_TYPES.export,
          label: `export ${ns ? textOf(ns, 30) : "*"} from ${source}`,
          bodies: [],
        };
      }
      return { type: NODE_TYPES.export, label: textOf(node, 60), bodies: [] };
    }

    case "class_declaration":
    case "class": {
      const name = textOf(node.childForFieldName("name"), 40) || "AnonymousClass";
      const sup = textOf(node.childForFieldName("superclass"), 30);
      return {
        type: NODE_TYPES.class,
        label: `${name}${sup ? ` extends ${sup}` : ""}`,
        bodies: [{ node: node.childForFieldName("body") }],
      };
    }

    case "function_declaration":
    case "generator_function_declaration": {
      const name = textOf(node.childForFieldName("name"), 40) || "fn";
      return {
        type: NODE_TYPES.function,
        label: fnLabel(node, name),
        bodies: [{ node: node.childForFieldName("body") }],
      };
    }

    case "lexical_declaration":
    case "variable_declaration": {
      const kind = node.child(0)?.type === "var" ? "var" : node.child(0)?.type ?? "let";
      const declarators = node.namedChildren.filter((c) => c?.type === "variable_declarator");
      // one node per declarator (`let a = fn(), b = 2, c = 3` -> 3 nodes)
      // so a function/class hiding in a later declarator is never lost
      return declarators.map((d) => classifyDeclarator(d, kind));
    }

    case "if_statement": {
      const test = textOf(node.childForFieldName("condition"), 50);
      const consequence = node.childForFieldName("consequence");
      const elseClause = node.childForFieldName("alternative"); // wraps if/block
      const bodies = [
        { node: consequence, single: consequence.type !== "statement_block" },
      ];
      const alt = elseClause?.namedChild(0);
      if (alt) {
        if (alt.type === "if_statement") {
          // else-if chain — treat the nested if as a direct sibling body,
          // not wrapped in its own "else" pseudo-node
          bodies.push({ node: alt, single: true });
        } else {
          bodies.push({
            branchType: NODE_TYPES.condition,
            branchLabel: "else",
            edgeLabel: "else",
            node: alt,
            single: alt.type !== "statement_block",
          });
        }
      }
      return { type: NODE_TYPES.condition, label: `if (${test})`, bodies };
    }

    case "switch_statement": {
      const disc = textOf(node.childForFieldName("value"), 40);
      const body = node.childForFieldName("body");
      const bodies = (body?.namedChildren ?? []).map((c) => {
        const isDefault = c.type === "switch_default";
        const label = isDefault ? "default" : `case ${textOf(c.childForFieldName("value"), 30)}`;
        const valueNode = c.childForFieldName("value");
        const stmts = c.namedChildren.filter(
          (child) => child && !sameNode(child, valueNode),
        );
        return {
          branchType: NODE_TYPES.condition,
          branchLabel: label,
          edgeLabel: null,
          node: c, // anchors position even when stmts is empty (fallthrough)
          stmts,
        };
      });
      return { type: NODE_TYPES.condition, label: `switch (${disc})`, bodies };
    }

    case "for_statement": {
      const init = stripSemi(textOf(node.childForFieldName("initializer"), 20));
      const cond = stripSemi(textOf(node.childForFieldName("condition"), 20));
      const upd = textOf(node.childForFieldName("increment"), 20);
      const bodyNode = node.childForFieldName("body");
      return {
        type: NODE_TYPES.loop,
        label: `for (${init}; ${cond}; ${upd})`,
        bodies: [{ node: bodyNode, single: bodyNode.type !== "statement_block" }],
      };
    }

    case "for_in_statement": {
      const op = hasToken(node, "of") ? "of" : "in";
      const left = textOf(node.childForFieldName("left"), 30);
      const right = textOf(node.childForFieldName("right"), 30);
      const bodyNode = node.childForFieldName("body");
      return {
        type: NODE_TYPES.loop,
        label: `for (${left} ${op} ${right})`,
        bodies: [{ node: bodyNode, single: bodyNode.type !== "statement_block" }],
      };
    }

    case "while_statement": {
      const cond = textOf(node.childForFieldName("condition"), 50);
      const bodyNode = node.childForFieldName("body");
      return {
        type: NODE_TYPES.loop,
        label: `while (${cond})`,
        bodies: [{ node: bodyNode, single: bodyNode.type !== "statement_block" }],
      };
    }

    case "do_statement": {
      const cond = textOf(node.childForFieldName("condition"), 50);
      return {
        type: NODE_TYPES.loop,
        label: `do…while (${cond})`,
        bodies: [{ node: node.childForFieldName("body") }],
      };
    }

    case "try_statement": {
      const bodies = [{ node: node.childForFieldName("body") }];
      const handler = node.childForFieldName("handler");
      if (handler) {
        const param = textOf(handler.childForFieldName("parameter"), 20);
        bodies.push({
          branchType: NODE_TYPES.trycatch,
          branchLabel: param ? `catch (${param})` : "catch",
          edgeLabel: "catch",
          node: handler.childForFieldName("body"),
        });
      }
      const finalizer = node.childForFieldName("finalizer");
      if (finalizer) {
        bodies.push({
          branchType: NODE_TYPES.trycatch,
          branchLabel: "finally",
          edgeLabel: "finally",
          node: finalizer,
        });
      }
      return { type: NODE_TYPES.trycatch, label: "try", bodies };
    }

    case "labeled_statement": {
      // the label itself doesn't need a node of its own — reclassify
      // whatever it wraps (usually a loop) directly. Returning null here
      // would make the walker fall back to visiting ALL named children,
      // which would include the label's own "statement_identifier" token
      // as a spurious extra node.
      const body = node.childForFieldName("body");
      return body ? classifyJS(body) : null;
    }

    case "with_statement": {
      const obj = textOf(node.childForFieldName("object"), 40); // already parenthesized text
      const bodyNode = node.childForFieldName("body");
      return {
        type: NODE_TYPES.statement,
        label: `with ${obj}`,
        bodies: [{ node: bodyNode, single: bodyNode.type !== "statement_block" }],
      };
    }

    case "debugger_statement":
      return { type: NODE_TYPES.statement, label: "debugger", bodies: [] };

    case "return_statement":
      return {
        type: NODE_TYPES.returnNode,
        label: textOf(node, 60),
        bodies: [],
      };
    case "throw_statement":
      return { type: NODE_TYPES.returnNode, label: textOf(node, 60), bodies: [] };
    case "break_statement":
      return { type: NODE_TYPES.returnNode, label: textOf(node, 40), bodies: [] };
    case "continue_statement":
      return { type: NODE_TYPES.returnNode, label: textOf(node, 40), bodies: [] };

    case "expression_statement": {
      const inner = node.namedChild(0);
      if (!inner) return null;
      if (inner.type === "call_expression") {
        return { type: NODE_TYPES.function, label: textOf(inner, 60), bodies: [] };
      }
      if (inner.type === "assignment_expression" || inner.type === "augmented_assignment_expression") {
        const left = inner.childForFieldName("left");
        const right = inner.childForFieldName("right");
        const name = left?.type === "identifier" ? textOf(left, 60) : null;
        const opMatch = textOf(inner, 200).match(/(\+=|-=|\*=|\/=|%=|=)/);
        return {
          type: NODE_TYPES.variable,
          label: textOf(inner, 60),
          bodies: [],
          extra: { varName: name, varOp: opMatch?.[1] ?? "=", varValueText: right ? textOf(right, 200) : null },
        };
      }
      if (inner.type === "update_expression") {
        const arg = inner.childForFieldName("argument");
        const name = arg?.type === "identifier" ? textOf(arg, 60) : null;
        const op = textOf(inner, 10).includes("--") ? "--" : "++";
        return {
          type: NODE_TYPES.variable,
          label: textOf(inner, 60),
          bodies: [],
          extra: { varName: name, varOp: op, varValueText: null },
        };
      }
      return { type: NODE_TYPES.statement, label: textOf(inner, 60), bodies: [] };
    }

    case "method_definition":
    case "field_definition":
    case "class_static_block":
      return classifyClassMember(node);

    case "comment":
      return null; // pure documentation — never becomes a visible node

    default:
      return null; // let the walker's generic fallback handle anything else
  }
}
