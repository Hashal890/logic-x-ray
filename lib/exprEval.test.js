import { describe, it, expect } from "vitest";
import { evalExpr, applyAssignment, formatValue } from "./exprEval";

describe("evalExpr", () => {
  it("resolves numeric, boolean and null/None literals", () => {
    expect(evalExpr("5", {})).toBe(5);
    expect(evalExpr("-3.5", {})).toBe(-3.5);
    expect(evalExpr("true", {})).toBe(true);
    expect(evalExpr("False", {})).toBe(false);
    expect(evalExpr("null", {})).toBe(null);
    expect(evalExpr("None", {})).toBe(null);
  });

  it("resolves string literals in both quote styles", () => {
    expect(evalExpr('"hello"', {})).toBe("hello");
    expect(evalExpr("'hello'", {})).toBe("hello");
  });

  it("resolves a known identifier from varState", () => {
    expect(evalExpr("x", { x: 10 })).toBe(10);
  });

  it("returns undefined for an unknown identifier", () => {
    expect(evalExpr("y", { x: 10 })).toBeUndefined();
  });

  it("evaluates simple binary arithmetic over known variables", () => {
    expect(evalExpr("x + 1", { x: 10 })).toBe(11);
    expect(evalExpr("x - y", { x: 10, y: 3 })).toBe(7);
    expect(evalExpr("x * 2", { x: 5 })).toBe(10);
  });

  it("evaluates comparisons", () => {
    expect(evalExpr("x > 5", { x: 10 })).toBe(true);
    expect(evalExpr("x < 5", { x: 10 })).toBe(false);
  });

  it("returns undefined when an operand is unresolvable (function call, member access)", () => {
    expect(evalExpr("foo()", {})).toBeUndefined();
    expect(evalExpr("obj.field", {})).toBeUndefined();
    expect(evalExpr("x + foo()", { x: 1 })).toBeUndefined();
  });

  it("returns undefined for empty/missing text", () => {
    expect(evalExpr("", {})).toBeUndefined();
    expect(evalExpr(undefined, {})).toBeUndefined();
  });

  it("does not split inside string literals containing operator-like characters", () => {
    expect(evalExpr('"a+b"', {})).toBe("a+b");
  });
});

describe("applyAssignment", () => {
  it("plain '=' assigns the evaluated value", () => {
    const { next } = applyAssignment({}, "x", "5", "=");
    expect(next.x).toBe(5);
  });

  it("'+=' adds to the current tracked value", () => {
    const { next } = applyAssignment({ x: 10 }, "x", "1", "+=");
    expect(next.x).toBe(11);
  });

  it("'+=' is undefined if the current value isn't tracked", () => {
    const { next } = applyAssignment({}, "x", "1", "+=");
    expect(next.x).toBeUndefined();
  });

  it("'++' increments the current tracked value", () => {
    const { next } = applyAssignment({ x: 4 }, "x", null, "++");
    expect(next.x).toBe(5);
  });

  it("'??=' assigns only when the current value is null/undefined", () => {
    expect(applyAssignment({}, "x", "5", "??=").next.x).toBe(5);
    expect(applyAssignment({ x: null }, "x", "5", "??=").next.x).toBe(5);
    expect(applyAssignment({ x: 1 }, "x", "5", "??=").next.x).toBe(1);
  });

  it("'--' decrements the current tracked value", () => {
    const { next } = applyAssignment({ x: 4 }, "x", null, "--");
    expect(next.x).toBe(3);
  });

  it("does not mutate the input state object", () => {
    const state = { x: 1 };
    applyAssignment(state, "x", "5", "=");
    expect(state.x).toBe(1);
  });

  it("no-ops when there is no variable name", () => {
    const state = { x: 1 };
    const { next, changed } = applyAssignment(state, null, "5", "=");
    expect(next).toBe(state);
    expect(changed).toBe(false);
  });
});

describe("formatValue", () => {
  it("renders undefined as a question mark", () => {
    expect(formatValue(undefined)).toBe("?");
  });
  it("renders null literally", () => {
    expect(formatValue(null)).toBe("null");
  });
  it("quotes strings", () => {
    expect(formatValue("hi")).toBe('"hi"');
  });
  it("stringifies numbers/booleans plainly", () => {
    expect(formatValue(5)).toBe("5");
    expect(formatValue(true)).toBe("true");
  });
});
