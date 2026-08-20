import { NODE_TYPES } from "../../nodeStyles";
import { textOf } from "./common";
import { classifyJS } from "./javascript";

function heritageLabel(node) {
  // interfaces use a bare "extends_type_clause"; classes wrap
  // extends/implements together inside a "class_heritage" node
  const directExtends = node.namedChildren.find((c) => c?.type === "extends_type_clause");
  if (directExtends) return ` ${textOf(directExtends, 60)}`;

  const heritage = node.namedChildren.find((c) => c?.type === "class_heritage");
  if (!heritage) return "";
  const ext = heritage.namedChildren.find((c) => c?.type === "extends_clause");
  const impl = heritage.namedChildren.find((c) => c?.type === "implements_clause");
  const extText = ext ? ` extends ${textOf(ext.namedChild(0), 30)}` : "";
  const implText = impl
    ? ` implements ${impl.namedChildren.map((c) => textOf(c, 20)).join(", ")}`
    : "";
  return `${extText}${implText}`;
}

// "type"/"return_type" field text already includes its own leading ": ",
// so labels just concatenate it directly rather than adding another colon.
function classifyInterfaceMember(node) {
  if (node.type === "method_signature") {
    const name = textOf(node.childForFieldName("name"), 40);
    const params = textOf(node.childForFieldName("parameters"), 40);
    const ret = textOf(node.childForFieldName("return_type"), 20);
    return { type: NODE_TYPES.function, label: `${name}${params}${ret}`, bodies: [] };
  }
  if (node.type === "property_signature") {
    const name = textOf(node.childForFieldName("name"), 40);
    const type = textOf(node.childForFieldName("type"), 30);
    return { type: NODE_TYPES.variable, label: `${name}${type}`, bodies: [] };
  }
  return null;
}

// TS-specific node types layered on top of the JS classifier — anything not
// handled here falls straight through to classifyJS, so every construct
// the JS grammar already understands (loops, conditions, try/catch, ...)
// works identically for .ts source.
export function classifyTS(node) {
  switch (node.type) {
    case "type_alias_declaration": {
      const name = textOf(node.childForFieldName("name"), 30);
      const value = textOf(node.childForFieldName("value"), 40);
      return { type: NODE_TYPES.variable, label: `type ${name} = ${value}`, bodies: [] };
    }

    case "interface_declaration": {
      const name = textOf(node.childForFieldName("name"), 30);
      return {
        type: NODE_TYPES.class,
        label: `interface ${name}${heritageLabel(node)}`,
        bodies: [{ node: node.childForFieldName("body") }],
      };
    }

    case "property_signature":
    case "method_signature":
      return classifyInterfaceMember(node);

    case "enum_declaration": {
      const name = textOf(node.childForFieldName("name"), 30);
      const body = node.childForFieldName("body");
      const members = (body?.namedChildren ?? []).map((m) => textOf(m, 20));
      return {
        type: NODE_TYPES.class,
        label: `enum ${name} { ${members.join(", ")} }`,
        bodies: [],
      };
    }

    case "abstract_class_declaration":
    case "class_declaration": {
      const name = textOf(node.childForFieldName("name"), 30) || "AnonymousClass";
      const abstract_ = node.type === "abstract_class_declaration" ? "abstract " : "";
      return {
        type: NODE_TYPES.class,
        label: `${abstract_}${name}${heritageLabel(node)}`,
        bodies: [{ node: node.childForFieldName("body") }],
      };
    }

    case "abstract_method_signature": {
      const name = textOf(node.childForFieldName("name"), 30);
      const params = textOf(node.childForFieldName("parameters"), 40);
      return {
        type: NODE_TYPES.function,
        label: `abstract ${name}${params}`,
        bodies: [],
      };
    }

    case "public_field_definition": {
      const name = textOf(node.childForFieldName("name"), 30);
      const type = textOf(node.childForFieldName("type"), 20);
      const value = node.childForFieldName("value");
      return {
        type: NODE_TYPES.variable,
        label: `${name}${type}${value ? ` = ${textOf(value, 30)}` : ""}`,
        bodies: [],
      };
    }

    // `namespace X { ... }` parses as expression_statement > internal_module
    case "expression_statement": {
      const inner = node.namedChild(0);
      if (inner?.type === "internal_module") return classifyTS(inner);
      return null; // fall through to classifyJS for everything else
    }
    case "internal_module": {
      const name = textOf(node.childForFieldName("name"), 30);
      return {
        type: NODE_TYPES.class,
        label: `namespace ${name}`,
        bodies: [{ node: node.childForFieldName("body") }],
      };
    }

    case "ambient_declaration": {
      const inner = node.namedChild(0);
      return inner ? classifyTS(inner) ?? classifyJS(inner) : null;
    }
    case "function_signature": {
      const name = textOf(node.childForFieldName("name"), 30) || "fn";
      const params = textOf(node.childForFieldName("parameters"), 40);
      return {
        type: NODE_TYPES.function,
        label: `declare function ${name}${params}`,
        bodies: [],
      };
    }

    case "import_statement": {
      const reqClause = node.namedChildren.find(
        (c) => c?.type === "import_require_clause",
      );
      if (reqClause) {
        return { type: NODE_TYPES.import, label: `import ${textOf(reqClause, 60)}`, bodies: [] };
      }
      return null;
    }

    case "export_statement": {
      // `export = X` — a bare "=" token distinguishes it from every other
      // export_statement shape, which all use a "declaration"/"source" field
      let hasEquals = false;
      for (let i = 0; i < node.childCount; i++) {
        if (node.child(i).type === "=") hasEquals = true;
      }
      if (hasEquals) {
        return {
          type: NODE_TYPES.export,
          label: `export = ${textOf(node.lastNamedChild, 40)}`,
          bodies: [],
        };
      }
      return null;
    }

    default:
      return null;
  }
}
