// logicEngine is now a thin pass-through.
// All parsing logic lives in lib/parsers/*.
// This file is kept so existing imports don't break.

import { parseCode } from "./parsers/index";

export function processCodeStructure(code, language = "javascript") {
  return parseCode(code, language);
}
