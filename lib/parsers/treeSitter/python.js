import { NODE_TYPES } from "../../nodeStyles";
import { textOf } from "./common";

function isAsync(node) {
  return node.child(0)?.type === "async";
}

function fnLabel(node, name) {
  const async_ = isAsync(node) ? "async " : "";
  const params = textOf(node.childForFieldName("parameters"), 60);
  const ret = textOf(node.childForFieldName("return_type"), 20);
  return `${async_}${name}${params}${ret ? ` -> ${ret}` : ""}`;
}

function classifyDefinition(node) {
  if (node.type === "function_definition") {
    const name = textOf(node.childForFieldName("name"), 40);
    return {
      type: NODE_TYPES.function,
      label: fnLabel(node, name),
      bodies: [{ node: node.childForFieldName("body") }],
    };
  }
  if (node.type === "class_definition") {
    const name = textOf(node.childForFieldName("name"), 40);
    const bases = textOf(node.childForFieldName("superclasses"), 40);
    return {
      type: NODE_TYPES.class,
      label: `${name}${bases}`,
      bodies: [{ node: node.childForFieldName("body") }],
    };
  }
  return null;
}

export function classifyPython(node) {
  switch (node.type) {
    case "import_statement":
    case "import_from_statement":
    case "future_import_statement":
      return { type: NODE_TYPES.import, label: textOf(node, 60), bodies: [] };

    case "class_definition":
    case "function_definition":
      return classifyDefinition(node);

    case "decorated_definition": {
      const decorators = node.namedChildren.filter((c) => c?.type === "decorator");
      const def = node.namedChildren.find(
        (c) => c?.type === "function_definition" || c?.type === "class_definition",
      );
      if (!def) return null;
      const result = classifyDefinition(def);
      if (!result) return null;
      const decoText = decorators.map((d) => textOf(d, 30)).join(" ");
      return { ...result, label: `${decoText} ${result.label}` };
    }

    case "if_statement": {
      const cond = textOf(node.childForFieldName("condition"), 50);
      const bodies = [{ node: node.childForFieldName("consequence") }];
      for (const clause of node.namedChildren) {
        if (clause?.type === "elif_clause") {
          bodies.push({
            branchType: NODE_TYPES.condition,
            branchLabel: `elif ${textOf(clause.childForFieldName("condition"), 40)}`,
            edgeLabel: "elif",
            node: clause.childForFieldName("consequence"),
          });
        } else if (clause?.type === "else_clause") {
          bodies.push({
            branchType: NODE_TYPES.condition,
            branchLabel: "else",
            edgeLabel: "else",
            node: clause.childForFieldName("body") ?? clause.namedChild(0),
          });
        }
      }
      return { type: NODE_TYPES.condition, label: `if ${cond}`, bodies };
    }

    case "match_statement": {
      const subject = textOf(node.childForFieldName("subject"), 40);
      const body = node.childForFieldName("body");
      const bodies = (body?.namedChildren ?? [])
        .filter((c) => c?.type === "case_clause")
        .map((c) => ({
          branchType: NODE_TYPES.condition,
          branchLabel: `case ${textOf(c.namedChild(0), 30)}`,
          edgeLabel: null,
          node: c.childForFieldName("consequence"),
        }));
      return { type: NODE_TYPES.condition, label: `match ${subject}`, bodies };
    }

    case "for_statement": {
      const async_ = isAsync(node) ? "async " : "";
      const left = textOf(node.childForFieldName("left"), 30);
      const right = textOf(node.childForFieldName("right"), 30);
      const bodies = [{ node: node.childForFieldName("body") }];
      const elseClause = node.namedChildren.find((c) => c?.type === "else_clause");
      if (elseClause) {
        bodies.push({
          branchType: NODE_TYPES.condition,
          branchLabel: "else",
          edgeLabel: "else",
          node: elseClause.childForFieldName("body") ?? elseClause.namedChild(0),
        });
      }
      return { type: NODE_TYPES.loop, label: `${async_}for ${left} in ${right}`, bodies };
    }

    case "while_statement": {
      const cond = textOf(node.childForFieldName("condition"), 50);
      return {
        type: NODE_TYPES.loop,
        label: `while ${cond}`,
        bodies: [{ node: node.childForFieldName("body") }],
      };
    }

    case "try_statement": {
      const bodies = [{ node: node.childForFieldName("body") }];
      for (const clause of node.namedChildren) {
        if (clause?.type === "except_clause" || clause?.type === "except_group_clause") {
          const kw = clause.type === "except_group_clause" ? "except*" : "except";
          const children = clause.namedChildren;
          const block = children[children.length - 1];
          const pattern = children.length > 1 ? textOf(children[0], 30) : "";
          bodies.push({
            branchType: NODE_TYPES.trycatch,
            branchLabel: pattern ? `${kw} ${pattern}` : kw,
            edgeLabel: "except",
            node: block,
          });
        } else if (clause?.type === "else_clause") {
          bodies.push({
            branchType: NODE_TYPES.condition,
            branchLabel: "else",
            edgeLabel: "else",
            node: clause.childForFieldName("body") ?? clause.namedChild(0),
          });
        } else if (clause?.type === "finally_clause") {
          bodies.push({
            branchType: NODE_TYPES.trycatch,
            branchLabel: "finally",
            edgeLabel: "finally",
            node: clause.namedChild(0),
          });
        }
      }
      return { type: NODE_TYPES.trycatch, label: "try", bodies };
    }

    case "with_statement": {
      const async_ = isAsync(node) ? "async " : "";
      const clause = node.namedChildren.find((c) => c?.type === "with_clause");
      return {
        type: NODE_TYPES.trycatch,
        label: `${async_}with ${textOf(clause, 50)}`,
        bodies: [{ node: node.childForFieldName("body") }],
      };
    }

    case "return_statement":
    case "yield":
    case "raise_statement":
      return { type: NODE_TYPES.returnNode, label: textOf(node, 60), bodies: [] };
    case "break_statement":
      return { type: NODE_TYPES.returnNode, label: "break", bodies: [] };
    case "continue_statement":
      return { type: NODE_TYPES.returnNode, label: "continue", bodies: [] };
    case "pass_statement":
      return { type: NODE_TYPES.returnNode, label: "pass", bodies: [] };

    case "delete_statement":
    case "assert_statement":
    case "global_statement":
    case "nonlocal_statement":
      return { type: NODE_TYPES.statement, label: textOf(node, 60), bodies: [] };

    case "expression_statement": {
      const inner = node.namedChild(0);
      if (!inner) return null;
      if (inner.type === "assignment" || inner.type === "augmented_assignment") {
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
      if (inner.type === "named_expression") {
        return { type: NODE_TYPES.variable, label: textOf(inner, 60), bodies: [] };
      }
      if (inner.type === "call") {
        return { type: NODE_TYPES.function, label: textOf(inner, 60), bodies: [] };
      }
      return { type: NODE_TYPES.statement, label: textOf(inner, 60), bodies: [] };
    }

    case "comment":
      return null;

    default:
      return null;
  }
}
