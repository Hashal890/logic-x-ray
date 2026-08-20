import { NODE_TYPES } from "../../nodeStyles";
import { textOf, sameNode } from "./common";

const FN_MODIFIERS = new Set(["virtual", "explicit", "friend", "constexpr", "static"]);

function modifiersOf(node) {
  const mods = node.namedChildren
    .filter((c) => c && FN_MODIFIERS.has(c.type))
    .map((c) => textOf(c, 20));
  return mods.length ? `${mods.join(" ")} ` : "";
}

function findFunctionDeclarator(node) {
  let d = node;
  while (d && d.type !== "function_declarator") {
    d = d.childForFieldName("declarator");
  }
  return d;
}

function classifyFunctionDef(node) {
  const declarator = node.childForFieldName("declarator");
  const fd = findFunctionDeclarator(declarator);
  const sig = textOf(fd ?? declarator, 80);
  const ret = textOf(node.childForFieldName("type"), 20);
  const body = node.childForFieldName("body");
  return {
    type: NODE_TYPES.function,
    label: `${modifiersOf(node)}${ret ? `${ret} ` : ""}${sig}`,
    bodies: body ? [{ node: body }] : [],
  };
}

function classifyDeclaration(node, keyword) {
  const type = textOf(node.childForFieldName("type"), 20);
  const declarators = node.childrenForFieldName
    ? node.childrenForFieldName("declarator")
    : node.namedChildren.filter((c) => c && c.type !== "primitive_type" && c.type !== "type_identifier");
  return declarators.map((d) => {
    // plain "int x;" -> d IS the identifier; "int x = 5;" -> d is an
    // init_declarator wrapping declarator/value fields
    const name = d.type === "init_declarator" ? d.childForFieldName("declarator") : d;
    const value = d.type === "init_declarator" ? d.childForFieldName("value") : null;
    return {
      type: NODE_TYPES.variable,
      label: `${keyword ?? ""}${type} ${textOf(d, 40)}`,
      bodies: [],
      extra: {
        varName: name?.type === "identifier" ? textOf(name, 60) : null,
        varOp: "=",
        varValueText: value ? textOf(value, 200) : null,
      },
    };
  });
}

function classifyClassLike(node, keyword) {
  const name = textOf(node.childForFieldName("name"), 40);
  const base = node.namedChildren.find((c) => c?.type === "base_class_clause");
  return {
    type: NODE_TYPES.class,
    label: `${keyword} ${name}${base ? ` ${textOf(base, 40)}` : ""}`,
    bodies: [{ node: node.childForFieldName("body") }],
  };
}

export function classifyC(node) {
  switch (node.type) {
    case "preproc_include":
      return { type: NODE_TYPES.import, label: textOf(node, 60), bodies: [] };
    case "preproc_def":
    case "preproc_function_def":
    case "preproc_call":
      return { type: NODE_TYPES.variable, label: textOf(node, 60), bodies: [] };

    case "preproc_if":
    case "preproc_ifdef": {
      const altNode = node.childForFieldName("alternative");
      const isIfdef = node.type === "preproc_ifdef";
      const keyword = isIfdef ? node.child(0)?.text ?? "#ifdef" : "#if";
      const condNode = isIfdef ? node.childForFieldName("name") : node.childForFieldName("condition");
      const stmts = node.namedChildren.filter((c) => c && !sameNode(c, altNode) && !sameNode(c, condNode));
      const bodies = [{ stmts }];

      let alt = altNode;
      while (alt) {
        if (alt.type === "preproc_elif") {
          const elifCond = alt.childForFieldName("condition");
          const elifAlt = alt.childForFieldName("alternative");
          bodies.push({
            branchType: NODE_TYPES.condition,
            branchLabel: `#elif ${textOf(elifCond, 30)}`,
            edgeLabel: "elif",
            stmts: alt.namedChildren.filter((c) => c && !sameNode(c, elifCond) && !sameNode(c, elifAlt)),
          });
          alt = elifAlt;
        } else if (alt.type === "preproc_else") {
          bodies.push({
            branchType: NODE_TYPES.condition,
            branchLabel: "#else",
            edgeLabel: "else",
            stmts: alt.namedChildren.filter(Boolean),
          });
          alt = null;
        } else {
          alt = null;
        }
      }
      return { type: NODE_TYPES.condition, label: `${keyword} ${textOf(condNode, 30)}`, bodies };
    }
    case "preproc_elif":
    case "preproc_else":
      return false;

    case "type_definition": {
      const inner = node.namedChildren.find(
        (c) => c && ["struct_specifier", "union_specifier", "enum_specifier"].includes(c.type),
      );
      const alias = node.childForFieldName("declarator");
      if (inner) {
        const kind = inner.type.replace("_specifier", "");
        return {
          type: NODE_TYPES.class,
          label: `typedef ${kind} ${textOf(alias, 30)}`,
          bodies: inner.childForFieldName("body") ? [{ node: inner.childForFieldName("body") }] : [],
        };
      }
      return { type: NODE_TYPES.variable, label: textOf(node, 60), bodies: [] };
    }

    case "struct_specifier":
      return classifyClassLike(node, "struct");
    case "union_specifier":
      return classifyClassLike(node, "union");
    case "class_specifier":
      return classifyClassLike(node, "class");
    case "enum_specifier": {
      const name = textOf(node.childForFieldName("name"), 30);
      const body = node.childForFieldName("body");
      const values = (body?.namedChildren ?? []).map((c) => textOf(c, 20));
      return { type: NODE_TYPES.class, label: `enum ${name} { ${values.join(", ")} }`, bodies: [] };
    }

    case "namespace_definition": {
      const name = textOf(node.childForFieldName("name"), 30);
      return {
        type: NODE_TYPES.import,
        label: name ? `namespace ${name}` : "namespace",
        bodies: [{ node: node.childForFieldName("body") }],
      };
    }
    case "using_declaration":
    case "alias_declaration":
      return { type: NODE_TYPES.import, label: textOf(node, 60), bodies: [] };
    case "linkage_specification":
      return {
        type: NODE_TYPES.import,
        label: `extern ${textOf(node.childForFieldName("value"), 20)}`,
        bodies: [{ node: node.childForFieldName("body") }],
      };

    case "template_declaration": {
      const params = textOf(node.namedChildren.find((c) => c?.type === "template_parameter_list"), 40);
      const inner = node.namedChildren.find(
        (c) => c && ["function_definition", "class_specifier", "struct_specifier"].includes(c.type),
      );
      if (!inner) return null;
      const result = classifyC(inner);
      if (!result) return null;
      return { ...result, label: `template${params} ${result.label}` };
    }

    case "access_specifier":
      return { type: NODE_TYPES.statement, label: `${textOf(node, 20)}:`, bodies: [] };

    case "function_definition":
      return classifyFunctionDef(node);

    case "declaration":
      return classifyDeclaration(node);
    case "field_declaration": {
      if (node.namedChildren.some((c) => c?.type === "function_declarator")) {
        return classifyFunctionDef(node);
      }
      return classifyDeclaration(node);
    }

    case "if_statement": {
      const cond = textOf(node.childForFieldName("condition"), 50);
      const consequence = node.childForFieldName("consequence");
      const alt = node.childForFieldName("alternative");
      const bodies = [{ node: consequence, single: consequence.type !== "compound_statement" }];
      if (alt) {
        const inner = alt.type === "else_clause" ? alt.namedChild(0) : alt;
        if (inner?.type === "if_statement") {
          bodies.push({ node: inner, single: true });
        } else {
          bodies.push({
            branchType: NODE_TYPES.condition,
            branchLabel: "else",
            edgeLabel: "else",
            node: inner,
            single: inner?.type !== "compound_statement",
          });
        }
      }
      return { type: NODE_TYPES.condition, label: `if ${cond}`, bodies };
    }

    case "switch_statement": {
      const cond = textOf(node.childForFieldName("condition"), 40);
      const block = node.childForFieldName("body");
      const bodies = (block?.namedChildren ?? [])
        .filter((c) => c?.type === "case_statement")
        .map((c) => {
          const valueNode = c.childForFieldName("value");
          const label = valueNode ? `case ${textOf(valueNode, 30)}` : "default";
          const stmts = c.namedChildren.filter((ch) => ch && !sameNode(ch, valueNode));
          return { branchType: NODE_TYPES.condition, branchLabel: label, edgeLabel: null, node: c, stmts };
        });
      return { type: NODE_TYPES.condition, label: `switch ${cond}`, bodies };
    }

    case "for_statement": {
      const init = textOf(node.childForFieldName("initializer"), 20);
      const cond = textOf(node.childForFieldName("condition"), 20);
      const upd = textOf(node.childForFieldName("update"), 20);
      const bodyNode = node.childForFieldName("body");
      return {
        type: NODE_TYPES.loop,
        label: `for (${init}; ${cond}; ${upd})`,
        bodies: [{ node: bodyNode, single: bodyNode.type !== "compound_statement" }],
      };
    }
    case "for_range_loop": {
      const type = textOf(node.childForFieldName("type"), 20);
      const decl = textOf(node.childForFieldName("declarator"), 20);
      const right = textOf(node.childForFieldName("right"), 30);
      const bodyNode = node.childForFieldName("body");
      return {
        type: NODE_TYPES.loop,
        label: `for (${type} ${decl} : ${right})`,
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
          const params = textOf(clause.childForFieldName("parameters"), 40);
          bodies.push({
            branchType: NODE_TYPES.trycatch,
            branchLabel: params && params !== "()" ? `catch ${params}` : "catch (...)",
            edgeLabel: "catch",
            node: clause.childForFieldName("body"),
          });
        }
      }
      return { type: NODE_TYPES.trycatch, label: "try", bodies };
    }

    case "labeled_statement": {
      const label = textOf(node.childForFieldName("label"), 20);
      const stmt = node.namedChildren.find((c) => c && c.type !== "statement_identifier");
      const inner = stmt ? classifyC(stmt) : null;
      if (!inner) return { type: NODE_TYPES.statement, label: `${label}:`, bodies: [] };
      return { ...inner, label: `${label}: ${inner.label}` };
    }

    case "return_statement":
      return { type: NODE_TYPES.returnNode, label: textOf(node, 60), bodies: [] };
    case "throw_statement":
      return { type: NODE_TYPES.returnNode, label: textOf(node, 60), bodies: [] };
    case "break_statement":
      return { type: NODE_TYPES.returnNode, label: "break", bodies: [] };
    case "continue_statement":
      return { type: NODE_TYPES.returnNode, label: "continue", bodies: [] };
    case "goto_statement":
      return { type: NODE_TYPES.returnNode, label: textOf(node, 30), bodies: [] };
    case "static_assert_declaration":
      return { type: NODE_TYPES.statement, label: textOf(node, 60), bodies: [] };

    case "expression_statement": {
      const inner = node.namedChild(0);
      if (!inner) return null;
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
      if (inner.type === "delete_expression") {
        return { type: NODE_TYPES.variable, label: textOf(inner, 60), bodies: [] };
      }
      if (inner.type === "call_expression") {
        return { type: NODE_TYPES.function, label: textOf(inner, 60), bodies: [] };
      }
      if (inner.type === "binary_expression" && /^(std::)?(cout|cerr|clog)\b/.test(textOf(inner, 20))) {
        return { type: NODE_TYPES.function, label: textOf(inner, 60), bodies: [] };
      }
      return { type: NODE_TYPES.statement, label: textOf(inner, 60), bodies: [] };
    }

    case "comment":
      return false;

    default:
      return null;
  }
}
