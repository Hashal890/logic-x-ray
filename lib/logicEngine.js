// thin pass-through — parsing logic lives in lib/parsers/*, kept here so
// existing imports don't break
import { parseCode } from "./parsers/index";

export async function processCodeStructure(code, language = "javascript") {
  return parseCode(code, language);
}
