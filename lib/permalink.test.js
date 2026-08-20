import { describe, it, expect } from "vitest";
import { encodeShareState, decodeShareState } from "./permalink";

describe("permalink encode/decode", () => {
  it("round-trips code, language, and indentSize", () => {
    const state = { code: "function f() {\n  return 1;\n}", language: "javascript", indentSize: 4 };
    const encoded = encodeShareState(state);
    expect(typeof encoded).toBe("string");
    expect(decodeShareState(encoded)).toEqual(state);
  });

  it("round-trips unicode and special characters in code", () => {
    const state = { code: "// émoji 🚀 and \"quotes\" and 'ticks'\nlet x = 1;", language: "python", indentSize: "tab" };
    const encoded = encodeShareState(state);
    expect(decodeShareState(encoded)).toEqual(state);
  });

  it("produces a URL-safe string (no +, /, or = padding)", () => {
    const encoded = encodeShareState({ code: "a".repeat(200), language: "c", indentSize: 2 });
    expect(encoded).not.toMatch(/[+/=]/);
  });

  it("returns null for garbage input instead of throwing", () => {
    expect(decodeShareState("not-valid-base64!!!")).toBeNull();
    expect(decodeShareState("")).toBeNull();
  });

  it("returns null when the decoded payload is missing required fields", () => {
    const bogus = btoa(JSON.stringify({ foo: "bar" }));
    expect(decodeShareState(bogus)).toBeNull();
  });
});
