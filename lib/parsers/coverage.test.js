import { describe, it, expect } from "vitest";
import { parseCode } from "./index.js";

// Every parser must turn every meaningful source construct into a node —
// nothing should silently vanish from the flowchart. These samples
// deliberately include constructs that used to be dropped or misclassified
// under the old regex/heuristic parsers, now re-verified against the
// Tree-Sitter-based parsers (all parseCode() calls are async).

describe("zero-skip coverage: javascript", () => {
  it("labeled loop, debugger, with, static block, multi-declarator all produce nodes", async () => {
    const code = `function process(items) {
  let total = 0;
  outer: for (const item of items) {
    if (item < 0) continue outer;
    total += item;
  }
  debugger;
  with (Math) { total = max(total, 0); }
  return total;
}
class Foo {
  static { init(); }
}
let a = () => 1, b = 2, c = 3;
`;
    const r = await parseCode(code, "javascript");
    expect(r.error).toBeUndefined();
    const labels = r.flowNodes.map((n) => n.data.label).join(" | ");
    expect(labels).toContain("debugger");
    expect(labels).toContain("with (Math)");
    expect(labels).toContain("static { … }");
    // all three declarators of "let a = ..., b = ..., c = ..." must appear
    expect(labels).toContain("let b = 2");
    expect(labels).toContain("let c = 3");
    expect(labels).toMatch(/ƒ\s+a\(\)/);
    expect(labels).toContain("continue outer");
  });
});

describe("zero-skip coverage: typescript", () => {
  it("export=, import=, export *, labeled loop all produce nodes", async () => {
    const code = `import foo = require('foo');
export = MyNamespace;
export * from './mod';
function process() {
  outer: for (let i = 0; i < 3; i++) {
    debugger;
  }
}
`;
    const r = await parseCode(code, "typescript");
    expect(r.error).toBeUndefined();
    const labels = r.flowNodes.map((n) => n.data.label).join(" ");
    expect(labels).toContain("import foo = require");
    expect(labels).toContain("export = MyNamespace");
    expect(labels).toContain("export * from");
    expect(labels).toContain("debugger");
  });
});

describe("zero-skip coverage: python", () => {
  it("match/case, async with/for, tuple/attribute assignment all produce nodes", async () => {
    const code = `async def process(items):
    total = 0
    x, y = 1, 2
    self.x -= 1
    match command:
        case "go":
            total = 1
        case _:
            total = 0
    async with open(x) as f:
        pass
    async for item in items:
        pass
    del x
    assert total > 0
    global counter
    pass
    return total
`;
    const r = await parseCode(code, "python");
    expect(r.error).toBeUndefined();
    const labels = r.flowNodes.map((n) => n.data.label).join(" | ");
    expect(labels).toContain("async process");
    expect(labels).toContain("x, y = 1, 2");
    expect(labels).toContain("self.x -= 1");
    expect(labels).toContain("match command");
    expect(labels).toContain('case "go"');
    expect(labels).toContain("case _");
    expect(labels).toContain("async with");
    expect(labels).toContain("async for");
    expect(labels).toContain("del x");
    expect(labels).toContain("assert total > 0");
    expect(labels).toContain("global counter");
    expect(labels).toContain("pass");
    expect(labels).toContain("return total");
  });
});

describe("zero-skip coverage: java", () => {
  it("for/while/if are correctly typed, not misclassified as constructors", async () => {
    const code = `class Foo {
  void bar() {
    for (int i = 0; i < 10; i++) {
      System.out.println(i);
    }
    while (x < 5) {
      x++;
    }
    if (x > 0) {
      return;
    }
  }
}
`;
    const r = await parseCode(code, "java");
    expect(r.error).toBeUndefined();
    const forNode = r.flowNodes.find((n) => n.data.label.includes("for ("));
    const whileNode = r.flowNodes.find((n) => n.data.label.includes("while ("));
    const ifNode = r.flowNodes.find((n) => n.data.label.includes("if ("));
    expect(forNode.data.nodeType).toBe("loop");
    expect(whileNode.data.nodeType).toBe("loop");
    expect(ifNode.data.nodeType).toBe("condition");
    // println and the earlier-dropped statements must all be present
    expect(r.flowNodes.some((n) => n.data.label.includes("println"))).toBe(
      true,
    );
  });

  it("annotations, package, sealed permits, switch arrows, assert, initializer blocks all produce nodes", async () => {
    const code = `package com.example.app;

@Override
public sealed interface Shape permits Circle, Square {
}

public class Foo {
    static { init(); }

    public void test(int day) {
        String result = switch (day) {
            case 1, 2 -> "Weekday";
            default -> "Unknown";
        };
        assert result != null;
    }
}
`;
    const r = await parseCode(code, "java");
    expect(r.error).toBeUndefined();
    const labels = r.flowNodes.map((n) => n.data.label).join(" | ");
    expect(labels).toContain("package com.example.app");
    expect(labels).toContain("permits");
    expect(labels).toContain("static {");
    expect(labels).toContain("case 1, 2");
    expect(labels).toContain("assert");
  });
});

describe("zero-skip coverage: php", () => {
  it("echo/print, property access, list(), global/unset/yield, compound ops all produce nodes", async () => {
    const code = `<?php
class Foo {
    public function bar() {
        echo "hello";
        $this->x = 5;
        $obj->method();
        list($a, $b) = [1, 2];
        global $x;
        unset($x);
        $y ??= 5;
        $arr[] = 5;
        $z++;
    }
}
`;
    const r = await parseCode(code, "php");
    expect(r.error).toBeUndefined();
    const labels = r.flowNodes.map((n) => n.data.label).join(" | ");
    expect(labels).toContain("echo");
    expect(labels).toContain("$this->x");
    expect(labels).toContain("$obj->method");
    expect(labels).toContain("list(");
    expect(labels).toContain("global $x");
    expect(labels).toContain("unset");
    expect(labels).toContain("??=");
    expect(labels).toContain("$arr[]");
    expect(labels).toContain("$z++");
  });
});

describe("zero-skip coverage: c/c++", () => {
  it("plain calls, assignments and augmented assignment all produce nodes (previously all dropped)", async () => {
    const code = `#include <stdio.h>

int main(int argc, char** argv) {
    int total = 0;
    for (int i = 0; i < argc; i++) {
        printf("Arg: %s\\n", argv[i]);
        total += i;
    }
    total = total * 2;
    return total;
}
`;
    const r = await parseCode(code, "c");
    expect(r.error).toBeUndefined();
    const labels = r.flowNodes.map((n) => n.data.label).join(" | ");
    expect(labels).toContain("printf");
    expect(labels).toContain("total +=");
    expect(labels).toContain("total =");
  });

  it("namespace, typedef, preprocessor conditionals, static_assert, delete/new all produce nodes", async () => {
    const code = `namespace App {
}
typedef int MyInt;
#pragma once
#ifdef DEBUG
#endif
static_assert(sizeof(int) == 4, "bad size");

void f() {
    delete ptr;
    new int[10];
    obj->method();
}
`;
    const r = await parseCode(code, "cpp");
    expect(r.error).toBeUndefined();
    const labels = r.flowNodes.map((n) => n.data.label).join(" | ");
    expect(labels).toContain("namespace App");
    expect(labels).toContain("typedef int MyInt");
    expect(labels).toContain("#pragma once");
    expect(labels).toContain("#ifdef DEBUG");
    expect(labels).toContain("static_assert");
    expect(labels).toContain("delete ptr");
    expect(labels).toContain("new int[10]");
  });
});
