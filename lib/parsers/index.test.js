import { describe, it, expect } from "vitest";
import { parseCode } from "./index.js";

describe("parseCode routing", () => {
  it("falls back to the JavaScript parser for an unrecognized language", async () => {
    const r = await parseCode("const x = 1;", "cobol");
    expect(r.error).toBeUndefined();
    expect(r.flowNodes.length).toBeGreaterThan(0);
  });

  it("routes 'c' and 'cpp' through the same grammar but keeps them distinguishable", async () => {
    const cResult = await parseCode("int main() { return 0; }", "c");
    const cppResult = await parseCode(
      "class Foo { public: void bar() {} };\nint main() { return 0; }",
      "cpp",
    );
    expect(cResult.error).toBeUndefined();
    expect(cppResult.error).toBeUndefined();
    // C has no classes, so only the C++ parse should produce a class node
    expect(cResult.flowNodes.some((n) => n.data.nodeType === "class")).toBe(false);
    expect(cppResult.flowNodes.some((n) => n.data.nodeType === "class")).toBe(true);
  });
});
