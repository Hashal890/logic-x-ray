import { parseJS } from "./js-parser";
import { parseTS } from "./ts-parser";
import { parsePython } from "./python-parser";
import { parseJava } from "./java-parser";
import { parsePHP } from "./php-parser";
import { parseC } from "./c-parser";

export const SUPPORTED_LANGUAGES = [
  { value: "javascript", label: "JavaScript", monaco: "javascript" },
  { value: "typescript", label: "TypeScript", monaco: "typescript" },
  { value: "python", label: "Python", monaco: "python" },
  { value: "java", label: "Java", monaco: "java" },
  { value: "php", label: "PHP", monaco: "php" },
  { value: "c", label: "C", monaco: "c" },
  { value: "cpp", label: "C++", monaco: "cpp" },
];

/**
 * Route to the correct parser based on selected language.
 * All parsers return: { flowNodes, flowEdges, complexity, suggestions, error? }
 */
export function parseCode(code, language) {
  switch (language) {
    case "javascript":
      return parseJS(code);
    case "typescript":
      return parseTS(code);
    case "python":
      return parsePython(code);
    case "java":
      return parseJava(code);
    case "php":
      return parsePHP(code);
    case "c":
      return parseC(code, "C");
    case "cpp":
      return parseC(code, "C++");
    default:
      return parseJS(code, false);
  }
}
