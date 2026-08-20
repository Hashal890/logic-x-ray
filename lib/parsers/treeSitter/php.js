import { NODE_TYPES } from "../../nodeStyles";
import { textOf, sameNode } from "./common";

function stripSemi(text) {
  return text.replace(/;\s*$/, "");
}

function modifiersOf(node) {
  const mods = node.namedChildren
    .filter((c) => c && /modifier/.test(c.type))
    .map((c) => textOf(c, 20));
  return mods.length ? `${mods.join(" ")} ` : "";
}

function attributesOf(node) {
  const attrs = node.childForFieldName("attributes");
  return attrs ? `${textOf(attrs, 50)} ` : "";
}

function classifyClassLike(node, keyword) {
  const name = textOf(node.childForFieldName("name"), 40);
  const base = node.namedChildren.find((c) => c?.type === "base_clause");
  const impl = node.namedChildren.find((c) => c?.type === "class_interface_clause");
  return {
    type: NODE_TYPES.class,
    label: `${attributesOf(node)}${modifiersOf(node)}${keyword} ${name}${base ? ` ${textOf(base, 30)}` : ""}${impl ? ` ${textOf(impl, 40)}` : ""}`,
    bodies: [{ node: node.childForFieldName("body") }],
  };
}

function classifyMember(node) {
  if (node.type === "method_declaration") {
    const name = textOf(node.childForFieldName("name"), 40);
    const params = textOf(node.childForFieldName("parameters"), 60);
    const ret = textOf(node.childForFieldName("return_type"), 20);
    const body = node.childForFieldName("body");
    return {
      type: NODE_TYPES.function,
      label: `${attributesOf(node)}${modifiersOf(node)}${name}${params}${ret ? `: ${ret}` : ""}`,
      bodies: body ? [{ node: body }] : [],
    };
  }
  if (node.type === "property_declaration") {
    const elements = node.namedChildren.filter((c) => c?.type === "property_element");
    return elements.map((el) => ({
      type: NODE_TYPES.variable,
      label: `${attributesOf(node)}${modifiersOf(node)}${textOf(el, 40)}`,
      bodies: [],
    }));
  }
  return null;
}

export function classifyPHP(node) {
  switch (node.type) {
    case "php_tag":
    case "text_interpolation":
      return false;

    case "namespace_definition":
      return {
        type: NODE_TYPES.import,
        label: `namespace ${textOf(node.childForFieldName("name"), 40)}`,
        bodies: [],
      };
    case "namespace_use_declaration":
      return { type: NODE_TYPES.import, label: textOf(node, 60), bodies: [] };
    case "use_declaration": {
      const traits = node.namedChildren.filter((c) => c?.type === "name").map((c) => textOf(c, 20));
      return { type: NODE_TYPES.import, label: `use ${traits.join(", ")}`, bodies: [] };
    }

    case "class_declaration":
      return classifyClassLike(node, "class");
    case "interface_declaration":
      return classifyClassLike(node, "interface");
    case "trait_declaration":
      return classifyClassLike(node, "trait");
    case "enum_declaration": {
      const name = textOf(node.childForFieldName("name"), 30);
      const body = node.namedChildren.find((c) => c?.type === "enum_declaration_list");
      const cases = (body?.namedChildren ?? [])
        .filter((c) => c?.type === "enum_case")
        .map((c) => textOf(c, 20));
      return { type: NODE_TYPES.class, label: `enum ${name} { ${cases.join(", ")} }`, bodies: [] };
    }

    case "method_declaration":
    case "property_declaration":
      return classifyMember(node);

    case "function_definition": {
      const name = textOf(node.childForFieldName("name"), 40);
      const params = textOf(node.childForFieldName("parameters"), 60);
      const ret = textOf(node.childForFieldName("return_type"), 20);
      return {
        type: NODE_TYPES.function,
        label: `${attributesOf(node)}${name}${params}${ret ? `: ${ret}` : ""}`,
        bodies: [{ node: node.childForFieldName("body") }],
      };
    }

    case "if_statement": {
      const cond = textOf(node.childForFieldName("condition"), 50);
      const bodies = [{ node: node.childForFieldName("body") }];
      for (const clause of node.namedChildren) {
        if (clause?.type === "else_if_clause") {
          bodies.push({
            branchType: NODE_TYPES.condition,
            branchLabel: `elseif ${textOf(clause.childForFieldName("condition"), 40)}`,
            edgeLabel: "elseif",
            node: clause.childForFieldName("body"),
          });
        } else if (clause?.type === "else_clause") {
          bodies.push({
            branchType: NODE_TYPES.condition,
            branchLabel: "else",
            edgeLabel: "else",
            node: clause.childForFieldName("body"),
          });
        }
      }
      return { type: NODE_TYPES.condition, label: `if ${cond}`, bodies };
    }

    case "switch_statement": {
      const cond = textOf(node.childForFieldName("condition"), 40);
      const body = node.childForFieldName("body");
      const bodies = (body?.namedChildren ?? []).map((c) => {
        const isDefault = c.type === "default_statement";
        const valueNode = c.childForFieldName("value");
        const label = isDefault ? "default" : `case ${textOf(valueNode, 30)}`;
        const stmts = c.namedChildren.filter((ch) => ch && !sameNode(ch, valueNode));
        return { branchType: NODE_TYPES.condition, branchLabel: label, edgeLabel: null, node: c, stmts };
      });
      return { type: NODE_TYPES.condition, label: `switch ${cond}`, bodies };
    }

    case "foreach_statement": {
      const named = node.namedChildren;
      const bodyNode = named[named.length - 1];
      const collection = textOf(named[0], 30);
      const target = textOf(named[1], 30);
      return {
        type: NODE_TYPES.loop,
        label: `foreach (${collection} as ${target})`,
        bodies: [{ node: bodyNode, single: bodyNode.type !== "compound_statement" }],
      };
    }
    case "for_statement": {
      const init = stripSemi(textOf(node.childForFieldName("initialize"), 20));
      const cond = stripSemi(textOf(node.childForFieldName("condition"), 20));
      const upd = textOf(node.childForFieldName("update"), 20);
      const bodyNode = node.childForFieldName("body");
      return {
        type: NODE_TYPES.loop,
        label: `for (${init}; ${cond}; ${upd})`,
        bodies: [{ node: bodyNode, single: bodyNode.type !== "compound_statement" }],
      };
    }
    case "while_statement": {
      const cond = textOf(node.childForFieldName("condition"), 50);
      const bodyNode = node.childForFieldName("body");
      return {
        type: NODE_TYPES.loop,
        label: `while ${cond}`,
        bodies: [{ node: bodyNode, single: bodyNode.type !== "compound_statement" }],
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

    case "try_statement": {
      const bodies = [{ node: node.childForFieldName("body") }];
      for (const clause of node.namedChildren) {
        if (clause?.type === "catch_clause") {
          const varNode = clause.namedChildren.find((c) => c?.type === "variable_name");
          const typeNode = clause.namedChildren.find((c) => c?.type === "type_list");
          const label = [textOf(typeNode, 30), textOf(varNode, 15)].filter(Boolean).join(" ");
          bodies.push({
            branchType: NODE_TYPES.trycatch,
            branchLabel: label ? `catch (${label})` : "catch",
            edgeLabel: "catch",
            node: clause.childForFieldName("body"),
          });
        } else if (clause?.type === "finally_clause") {
          bodies.push({
            branchType: NODE_TYPES.trycatch,
            branchLabel: "finally",
            edgeLabel: "finally",
            node: clause.childForFieldName("body"),
          });
        }
      }
      return { type: NODE_TYPES.trycatch, label: "try", bodies };
    }

    case "return_statement":
      return { type: NODE_TYPES.returnNode, label: textOf(node, 60), bodies: [] };
    case "break_statement":
      return { type: NODE_TYPES.returnNode, label: textOf(node, 30), bodies: [] };
    case "continue_statement":
      return { type: NODE_TYPES.returnNode, label: textOf(node, 30), bodies: [] };
    case "goto_statement":
      return { type: NODE_TYPES.returnNode, label: textOf(node, 30), bodies: [] };
    case "named_label_statement":
      return { type: NODE_TYPES.statement, label: textOf(node, 30), bodies: [] };

    case "echo_statement":
    case "print_intrinsic":
      return { type: NODE_TYPES.function, label: textOf(node, 60), bodies: [] };

    case "global_declaration":
    case "unset_statement":
      return { type: NODE_TYPES.statement, label: textOf(node, 60), bodies: [] };

    case "expression_statement": {
      const inner = node.namedChild(0);
      if (!inner) return null;
      if (inner.type === "assignment_expression" || inner.type === "augmented_assignment_expression") {
        const left = inner.childForFieldName("left");
        const right = inner.childForFieldName("right");
        const name = left?.type === "variable_name" ? textOf(left, 60) : null;
        const opMatch = textOf(inner, 200).match(/(\+=|-=|\*=|\/=|%=|\?\?=|=)/);
        return {
          type: NODE_TYPES.variable,
          label: textOf(inner, 60),
          bodies: [],
          extra: { varName: name, varOp: opMatch?.[1] ?? "=", varValueText: right ? textOf(right, 200) : null },
        };
      }
      if (inner.type === "update_expression") {
        const arg = inner.childForFieldName("argument");
        const name = arg?.type === "variable_name" ? textOf(arg, 60) : null;
        const op = textOf(inner, 10).includes("--") ? "--" : "++";
        return {
          type: NODE_TYPES.variable,
          label: textOf(inner, 60),
          bodies: [],
          extra: { varName: name, varOp: op, varValueText: null },
        };
      }
      if (inner.type === "function_call_expression" || inner.type === "member_call_expression" || inner.type === "scoped_call_expression") {
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
