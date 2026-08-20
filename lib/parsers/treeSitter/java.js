import { NODE_TYPES } from "../../nodeStyles";
import { textOf, sameNode } from "./common";

function stripSemi(text) {
  return text.replace(/;\s*$/, "");
}

function modifiersOf(node) {
  const mod = node.namedChildren.find((c) => c?.type === "modifiers");
  return mod ? `${textOf(mod, 60)} ` : "";
}

function classifyClassLike(node, keyword) {
  const name = textOf(node.childForFieldName("name"), 40);
  const superclass = textOf(node.childForFieldName("superclass"), 30);
  const interfaces = textOf(node.childForFieldName("interfaces"), 40);
  const permits = textOf(node.childForFieldName("permits"), 40);
  return {
    type: NODE_TYPES.class,
    label: `${modifiersOf(node)}${keyword} ${name}${superclass}${interfaces}${permits}`,
    bodies: [{ node: node.childForFieldName("body") }],
  };
}

function classifyMember(node) {
  if (node.type === "method_declaration" || node.type === "constructor_declaration") {
    const name = textOf(node.childForFieldName("name"), 40);
    const params = textOf(node.childForFieldName("parameters"), 60);
    const type = textOf(node.childForFieldName("type"), 20);
    const body = node.childForFieldName("body");
    return {
      type: NODE_TYPES.function,
      label: `${modifiersOf(node)}${name}${params}${type ? ` : ${type}` : ""}`,
      bodies: body ? [{ node: body }] : [],
    };
  }
  if (node.type === "field_declaration") {
    const type = textOf(node.childForFieldName("type"), 20);
    const declarators = node.namedChildren.filter((c) => c?.type === "variable_declarator");
    return declarators.map((d) => ({
      type: NODE_TYPES.variable,
      label: `${modifiersOf(node)}${type} ${textOf(d, 40)}`,
      bodies: [],
    }));
  }
  if (node.type === "static_initializer") {
    return { type: NODE_TYPES.statement, label: "static { … }", bodies: [{ node }] };
  }
  return null;
}

export function classifyJava(node) {
  switch (node.type) {
    case "package_declaration":
      return { type: NODE_TYPES.import, label: textOf(node, 60), bodies: [] };
    case "import_declaration":
      return { type: NODE_TYPES.import, label: textOf(node, 60), bodies: [] };

    case "class_declaration":
      return classifyClassLike(node, "class");
    case "interface_declaration":
      return classifyClassLike(node, "interface");
    case "record_declaration": {
      const name = textOf(node.childForFieldName("name"), 30);
      const params = textOf(node.childForFieldName("parameters"), 60);
      return {
        type: NODE_TYPES.class,
        label: `${modifiersOf(node)}record ${name}${params}`,
        bodies: [{ node: node.childForFieldName("body") }],
      };
    }
    case "enum_declaration": {
      const name = textOf(node.childForFieldName("name"), 30);
      const body = node.childForFieldName("body");
      const constants = (body?.namedChildren ?? [])
        .filter((c) => c?.type === "enum_constant")
        .map((c) => textOf(c, 20));
      return {
        type: NODE_TYPES.class,
        label: `enum ${name} { ${constants.join(", ")} }`,
        bodies: [],
      };
    }
    case "annotation_type_declaration": {
      const name = textOf(node.childForFieldName("name"), 30);
      return { type: NODE_TYPES.class, label: `@interface ${name}`, bodies: [] };
    }

    case "method_declaration":
    case "constructor_declaration":
    case "field_declaration":
    case "static_initializer":
      return classifyMember(node);

    case "if_statement": {
      const cond = textOf(node.childForFieldName("condition"), 50);
      const consequence = node.childForFieldName("consequence");
      const alt = node.childForFieldName("alternative");
      const bodies = [
        { node: consequence, single: consequence.type !== "block" },
      ];
      if (alt) {
        if (alt.type === "if_statement") {
          bodies.push({ node: alt, single: true });
        } else {
          bodies.push({
            branchType: NODE_TYPES.condition,
            branchLabel: "else",
            edgeLabel: "else",
            node: alt,
            single: alt.type !== "block",
          });
        }
      }
      return { type: NODE_TYPES.condition, label: `if ${cond}`, bodies };
    }

    case "switch_expression":
    case "switch_statement": {
      const disc = textOf(node.childForFieldName("condition"), 40);
      const switchBlock = node.namedChildren.find((c) => c?.type === "switch_block");
      const groups = (switchBlock?.namedChildren ?? []).filter(
        (c) => c?.type === "switch_block_statement_group" || c?.type === "switch_rule",
      );
      const bodies = groups.map((g) => {
        const label = g.namedChildren.find((c) => c?.type === "switch_label");
        const labelText = label ? textOf(label, 30) : textOf(g.namedChild(0), 30);
        const stmts = g.namedChildren.filter(
          (c) => c && !sameNode(c, label) && c.type !== "switch_label",
        );
        return {
          branchType: NODE_TYPES.condition,
          branchLabel: labelText,
          edgeLabel: null,
          node: g,
          stmts,
        };
      });
      return { type: NODE_TYPES.condition, label: `switch ${disc}`, bodies };
    }

    case "for_statement": {
      const init = stripSemi(textOf(node.childForFieldName("init"), 20));
      const cond = textOf(node.childForFieldName("condition"), 20);
      const upd = textOf(node.childForFieldName("update"), 20);
      const bodyNode = node.childForFieldName("body");
      return {
        type: NODE_TYPES.loop,
        label: `for (${init}; ${cond}; ${upd})`,
        bodies: [{ node: bodyNode, single: bodyNode.type !== "block" }],
      };
    }
    case "enhanced_for_statement": {
      const type = textOf(node.childForFieldName("type"), 20);
      const name = textOf(node.childForFieldName("name"), 20);
      const value = textOf(node.childForFieldName("value"), 30);
      const bodyNode = node.childForFieldName("body");
      return {
        type: NODE_TYPES.loop,
        label: `for (${type} ${name} : ${value})`,
        bodies: [{ node: bodyNode, single: bodyNode.type !== "block" }],
      };
    }
    case "while_statement": {
      const cond = textOf(node.childForFieldName("condition"), 50);
      const bodyNode = node.childForFieldName("body");
      return {
        type: NODE_TYPES.loop,
        label: `while ${cond}`,
        bodies: [{ node: bodyNode, single: bodyNode.type !== "block" }],
      };
    }
    case "do_statement": {
      const cond = textOf(node.childForFieldName("condition"), 50);
      return {
        type: NODE_TYPES.loop,
        label: `do…while ${cond}`,
        bodies: [{ node: node.childForFieldName("body") }],
      };
    }

    case "try_statement":
    case "try_with_resources_statement": {
      const resources = textOf(node.childForFieldName("resources"), 40);
      const bodies = [{ node: node.childForFieldName("body") }];
      for (const clause of node.namedChildren) {
        if (clause?.type === "catch_clause") {
          const paramNode = clause.namedChildren.find(
            (c) => c?.type === "catch_formal_parameter",
          );
          const param = textOf(paramNode, 30);
          bodies.push({
            branchType: NODE_TYPES.trycatch,
            branchLabel: param ? `catch (${param})` : "catch",
            edgeLabel: "catch",
            node: clause.childForFieldName("body"),
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
      return {
        type: NODE_TYPES.trycatch,
        label: resources ? `try (${resources})` : "try",
        bodies,
      };
    }

    case "synchronized_statement": {
      const lock = textOf(node.namedChild(0), 40); // already parenthesized text
      return {
        type: NODE_TYPES.trycatch,
        label: `synchronized ${lock}`,
        bodies: [{ node: node.childForFieldName("body") }],
      };
    }

    case "labeled_statement": {
      const body = node.namedChildren.find((c) => c && c.type !== "identifier");
      return body ? classifyJava(body) : null;
    }

    case "return_statement":
      return { type: NODE_TYPES.returnNode, label: textOf(node, 60), bodies: [] };
    case "throw_statement":
      return { type: NODE_TYPES.returnNode, label: textOf(node, 60), bodies: [] };
    case "break_statement":
      return { type: NODE_TYPES.returnNode, label: textOf(node, 30), bodies: [] };
    case "continue_statement":
      return { type: NODE_TYPES.returnNode, label: textOf(node, 30), bodies: [] };
    case "yield_statement":
      return { type: NODE_TYPES.returnNode, label: textOf(node, 60), bodies: [] };
    case "assert_statement":
      return { type: NODE_TYPES.statement, label: textOf(node, 60), bodies: [] };

    case "local_variable_declaration": {
      const type = textOf(node.childForFieldName("type"), 20);
      const declarators = node.namedChildren.filter((c) => c?.type === "variable_declarator");
      return declarators.map((d) => {
        const name = d.childForFieldName("name");
        const value = d.childForFieldName("value");
        return {
          type: NODE_TYPES.variable,
          label: `${type} ${textOf(d, 40)}`,
          bodies: [],
          extra: {
            varName: name ? textOf(name, 60) : null,
            varOp: "=",
            varValueText: value ? textOf(value, 200) : null,
          },
        };
      });
    }

    case "expression_statement": {
      const inner = node.namedChild(0);
      if (!inner) return null;
      if (
        inner.type === "method_invocation" ||
        inner.type === "object_creation_expression"
      ) {
        return { type: NODE_TYPES.function, label: textOf(inner, 60), bodies: [] };
      }
      if (inner.type === "assignment_expression") {
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
        const arg = inner.namedChild(0);
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

    case "block_comment":
    case "line_comment":
      return null;

    default:
      return null;
  }
}
