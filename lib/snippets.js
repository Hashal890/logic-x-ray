// ─── Default code snippets ────────────────────────────────────────────────────
// Each snippet is a self-contained demo that exercises every construct the
// parser for that language can visualise.

// ─── JavaScript ───────────────────────────────────────────────────────────────
export const JS_SNIPPET = `// ── Imports / Modules ──────────────────────────────────
import { EventEmitter } from "events";

// ── Constants & variables ───────────────────────────────
const MAX_RETRIES = 3;
let   retryCount  = 0;
var   legacyFlag  = false;

// ── Class with inheritance ───────────────────────────────
class Animal {
  #name;                          // private field
  constructor(name) { this.#name = name; }
  get name()        { return this.#name; }
  speak()           { return \`\${this.#name} makes a sound.\`; }
}

class Dog extends Animal {
  #tricks = [];

  constructor(name) { super(name); }

  learn(trick) { this.#tricks.push(trick); }

  perform() {
    if (this.#tricks.length === 0) return "No tricks learned yet.";
    return this.#tricks.map((t) => \`\${this.name}: \${t}!\`).join("\\n");
  }

  get trickCount() { return this.#tricks.length; }
  set alias(v)     { this._alias = v; }
}

// ── Prototype extension ──────────────────────────────────
Dog.prototype.bark = function () { return "Woof!"; };

// ── Closures & higher-order functions ────────────────────
function makeCounter(start = 0) {
  let count = start;
  return {
    increment: ()  => ++count,
    decrement: ()  => --count,
    reset:     ()  => { count = start; },
    value:     ()  => count,
  };
}

// ── Destructuring, rest, spread ──────────────────────────
const { increment, value } = makeCounter(10);
const nums   = [1, 2, 3, 4, 5];
const [first, second, ...rest] = nums;
const merged = [...nums, 6, 7];

// ── Control flow ─────────────────────────────────────────
function classify(n) {
  if (n < 0)       return "negative";
  else if (n === 0) return "zero";
  else              return "positive";
}

function dayName(d) {
  switch (d) {
    case 1:  return "Monday";
    case 2:  return "Tuesday";
    default: return "Other";
  }
}

// ── Loops ────────────────────────────────────────────────
for (let i = 0; i < 3; i++)     console.log(i);
for (const n of nums)            console.log(n);
for (const k in { a: 1, b: 2 }) console.log(k);

let w = 5;
while (w > 0)  w--;
do { w++; } while (w < 3);

// ── Async / Await / Promises ─────────────────────────────
async function fetchUser(id) {
  try {
    const res  = await fetch(\`/api/users/\${id}\`);
    const data = await res.json();
    return data ?? null;           // nullish coalescing
  } catch (err) {
    console.error("Fetch failed:", err?.message);  // optional chaining
    return null;
  } finally {
    console.log("fetchUser done");
  }
}

const fetchAll = (ids) =>
  Promise.all(ids.map(fetchUser));

// ── Callbacks & event loop ───────────────────────────────
function withRetry(fn, retries = MAX_RETRIES) {
  return function (...args) {
    let attempt = 0;
    const run = () =>
      fn(...args).catch((e) => {
        if (++attempt < retries) return run();
        throw e;
      });
    return run();
  };
}

// ── Template literals & tagged templates ─────────────────
const tag = (strings, ...vals) => strings.raw.join("") + vals.join("");
const msg  = tag\`Hello \${"world"}!\`;

// ── Optional chaining & nullish coalescing ───────────────
const cfg  = null;
const port = cfg?.server?.port ?? 3000;

// ── Modules re-export ────────────────────────────────────
export { Dog, makeCounter };
export default Animal;
`;

// ─── TypeScript ───────────────────────────────────────────────────────────────
export const TS_SNIPPET = `// ── Imports ─────────────────────────────────────────────
import type { FC } from "react";

// ── Type aliases & unions ────────────────────────────────
type ID      = string | number;
type Status  = "active" | "inactive" | "pending";   // literal union
type Nullable<T> = T | null;

// ── Interface & declaration merging ──────────────────────
interface User {
  readonly id: ID;
  name:   string;
  email?: string;           // optional
  status: Status;
}

interface User {            // declaration merging
  createdAt: Date;
}

// ── Enum ─────────────────────────────────────────────────
enum Direction { Up, Down, Left, Right }
const enum LogLevel { Info = "INFO", Warn = "WARN", Error = "ERROR" }

// ── Generics ─────────────────────────────────────────────
function identity<T>(val: T): T { return val; }

class Stack<T> {
  private items: T[] = [];
  push(item: T)  { this.items.push(item); }
  pop(): T | undefined { return this.items.pop(); }
  get size(): number   { return this.items.length; }
}

// ── Utility types ────────────────────────────────────────
type PartialUser  = Partial<User>;
type RequiredUser = Required<User>;
type ReadonlyUser = Readonly<User>;
type UserPreview  = Pick<User, "id" | "name">;
type UserRecord   = Record<string, User>;

// ── Mapped types ─────────────────────────────────────────
type Mutable<T> = { -readonly [K in keyof T]: T[K] };
type Optional<T> = { [K in keyof T]?: T[K] };

// ── Conditional types ────────────────────────────────────
type IsString<T> = T extends string ? true : false;
type Unwrap<T>   = T extends Promise<infer U> ? U : T;

// ── Intersection types ───────────────────────────────────
type AdminUser = User & { permissions: string[] };

// ── Type guards ──────────────────────────────────────────
function isUser(obj: unknown): obj is User {
  return typeof obj === "object" && obj !== null && "id" in obj;
}

// ── Abstract class & OOP ─────────────────────────────────
abstract class Shape {
  abstract area(): number;
  describe(): string { return \`Area: \${this.area()}\`; }
}

class Circle extends Shape {
  constructor(private readonly radius: number) { super(); }
  area(): number { return Math.PI * this.radius ** 2; }
}

// ── Access modifiers & parameter properties ──────────────
class Service {
  constructor(
    private   readonly url: string,
    protected timeout: number = 5000,
    public    name: string    = "default",
  ) {}

  async get<T>(path: string): Promise<T> {
    const res = await fetch(\`\${this.url}\${path}\`);
    if (!res.ok) throw new Error(\`HTTP \${res.status}\`);
    return res.json() as Promise<T>;
  }
}

// ── Decorators ───────────────────────────────────────────
function Log(target: any, key: string, descriptor: PropertyDescriptor) {
  const orig = descriptor.value;
  descriptor.value = function (...args: any[]) {
    console.log(\`Calling \${key}\`);
    return orig.apply(this, args);
  };
  return descriptor;
}

// ── Async / Await with typed return ──────────────────────
async function loadUsers(): Promise<User[]> {
  try {
    const svc  = new Service("https://api.example.com");
    const data = await svc.get<User[]>("/users");
    return data.filter((u) => u.status === "active");
  } catch (err) {
    console.error(err instanceof Error ? err.message : err);
    return [];
  }
}

// ── Namespaces ───────────────────────────────────────────
namespace Utils {
  export function clamp(n: number, min: number, max: number): number {
    return Math.min(Math.max(n, min), max);
  }
  export type Range = { min: number; max: number };
}

export { Stack, Circle, Utils, loadUsers };
export type { User, AdminUser, Status };
`;

// ─── Python ───────────────────────────────────────────────────────────────────
export const PYTHON_SNIPPET = `# ── Imports & packages ─────────────────────────────────
import os
import sys
from typing import Optional, Generator, Any
from dataclasses import dataclass, field
from functools import wraps

# ── Constants & type hints ──────────────────────────────
MAX_SIZE: int       = 100
APP_NAME: str       = "Logic-X-Ray"
DEBUG:    bool      = False

# ── Data structures ─────────────────────────────────────
numbers   = [1, 2, 3, 4, 5]
coords    = (10.0, 20.0)              # tuple
unique    = {1, 2, 3}                 # set
registry  = {"a": 1, "b": 2}         # dict

squares   = [x**2 for x in numbers]  # list comprehension
evens     = {x for x in numbers if x % 2 == 0}
indexed   = {i: v for i, v in enumerate(numbers)}
sliced    = numbers[1:4]

# ── Control flow ─────────────────────────────────────────
def classify(n: int) -> str:
    if n < 0:
        return "negative"
    elif n == 0:
        return "zero"
    else:
        return "positive"

def iterate_demo():
    for i in range(5):
        if i == 2:
            continue
        if i == 4:
            break
        print(i)

    count = 0
    while count < 3:
        count += 1

    pass  # placeholder

# ── Functions: defaults, *args, **kwargs ─────────────────
def greet(name: str, greeting: str = "Hello") -> str:
    return f"{greeting}, {name}!"

def summarise(*args: int, label: str = "total", **kwargs: Any) -> dict:
    return {"label": label, "sum": sum(args), "meta": kwargs}

# ── Lambda ───────────────────────────────────────────────
multiply = lambda x, y: x * y
sorted_nums = sorted(numbers, key=lambda x: -x)

# ── Closures ─────────────────────────────────────────────
def make_adder(n: int):
    def adder(x: int) -> int:
        return x + n
    return adder

# ── Decorators ───────────────────────────────────────────
def log_call(fn):
    @wraps(fn)
    def wrapper(*args, **kwargs):
        print(f"Calling {fn.__name__}")
        result = fn(*args, **kwargs)
        print(f"Done {fn.__name__}")
        return result
    return wrapper

@log_call
def add(a: int, b: int) -> int:
    return a + b

# ── Classes & dunder methods ─────────────────────────────
class Animal:
    species: str = "Unknown"

    def __init__(self, name: str, age: int) -> None:
        self.name = name
        self.age  = age

    def __repr__(self) -> str:
        return f"Animal({self.name!r}, {self.age})"

    def __eq__(self, other: object) -> bool:
        return isinstance(other, Animal) and self.name == other.name

    def speak(self) -> str:
        return f"{self.name} makes a sound."

class Dog(Animal):
    def __init__(self, name: str, age: int, breed: str) -> None:
        super().__init__(name, age)
        self.breed  = breed
        self._tricks: list[str] = []

    def learn(self, trick: str) -> None:
        self._tricks.append(trick)

    def speak(self) -> str:           # override
        return f"{self.name} barks!"

# ── Multiple inheritance ─────────────────────────────────
class Flyable:
    def fly(self): return "Flying!"

class FlyingDog(Dog, Flyable): pass

# ── Dataclass ────────────────────────────────────────────
@dataclass
class Point:
    x: float
    y: float
    tags: list[str] = field(default_factory=list)

    def distance(self) -> float:
        return (self.x**2 + self.y**2) ** 0.5

# ── Generators ───────────────────────────────────────────
def fibonacci(limit: int) -> Generator[int, None, None]:
    a, b = 0, 1
    while a < limit:
        yield a
        a, b = b, a + b

# ── Iterators ────────────────────────────────────────────
class CountDown:
    def __init__(self, start: int): self.n = start
    def __iter__(self):             return self
    def __next__(self):
        if self.n <= 0: raise StopIteration
        self.n -= 1
        return self.n + 1

# ── Context manager ──────────────────────────────────────
class ManagedFile:
    def __init__(self, path: str): self.path = path
    def __enter__(self):           return open(self.path)
    def __exit__(self, *_):        pass

# ── Exception handling ───────────────────────────────────
class AppError(Exception):
    def __init__(self, msg: str, code: int = 0):
        super().__init__(msg)
        self.code = code

def safe_divide(a: float, b: float) -> Optional[float]:
    try:
        if b == 0:
            raise AppError("Division by zero", code=400)
        return a / b
    except AppError as e:
        print(f"[{e.code}] {e}")
        return None
    finally:
        print("safe_divide complete")

# ── Async / Await ────────────────────────────────────────
import asyncio

async def fetch_data(url: str) -> dict:
    await asyncio.sleep(0.1)      # simulate I/O
    return {"url": url, "data": []}

async def main():
    tasks   = [fetch_data(f"/item/{i}") for i in range(3)]
    results = await asyncio.gather(*tasks)
    for r in results:
        print(r)

# ── Metaclass ────────────────────────────────────────────
class SingletonMeta(type):
    _instances: dict = {}
    def __call__(cls, *a, **kw):
        if cls not in cls._instances:
            cls._instances[cls] = super().__call__(*a, **kw)
        return cls._instances[cls]

class Config(metaclass=SingletonMeta):
    def __init__(self): self.debug = False
`;

// ─── Java ─────────────────────────────────────────────────────────────────────
export const JAVA_SNIPPET = `// ── Package & imports ───────────────────────────────────
package com.logicxray.demo;

import java.util.*;
import java.util.stream.*;
import java.util.function.*;
import java.io.*;

// ── Enum ─────────────────────────────────────────────────
enum Status { ACTIVE, INACTIVE, PENDING }

// ── Custom exception ─────────────────────────────────────
class AppException extends RuntimeException {
    private final int code;
    public AppException(String msg, int code) {
        super(msg);
        this.code = code;
    }
    public int getCode() { return code; }
}

// ── Interface & abstract class ───────────────────────────
interface Describable {
    String describe();
    default String tag() { return "[" + describe() + "]"; }
}

abstract class Shape implements Describable {
    abstract double area();

    @Override
    public String describe() {
        return getClass().getSimpleName() + " area=" + String.format("%.2f", area());
    }
}

// ── Generics ─────────────────────────────────────────────
class Pair<A, B> {
    private final A first;
    private final B second;
    public Pair(A first, B second) { this.first = first; this.second = second; }
    public A getFirst()  { return first; }
    public B getSecond() { return second; }
    @Override public String toString() { return "(" + first + ", " + second + ")"; }
}

// ── Main class ───────────────────────────────────────────
public class Demo {

    // ── Static & final ──────────────────────────────────
    private static final int MAX = 100;
    private static int instanceCount = 0;

    // ── Fields ──────────────────────────────────────────
    private final String name;
    protected int value;

    // ── Constructors ────────────────────────────────────
    public Demo(String name) {
        this.name  = name;
        this.value = 0;
        instanceCount++;
    }

    public Demo(String name, int value) {
        this(name);         // delegating constructor
        this.value = value;
    }

    // ── Method overloading ──────────────────────────────
    public int add(int a, int b)          { return a + b; }
    public double add(double a, double b) { return a + b; }

    // ── Control flow ────────────────────────────────────
    public String classify(int n) {
        if      (n < 0)   return "negative";
        else if (n == 0)  return "zero";
        else              return "positive";
    }

    public String dayName(int d) {
        return switch (d) {
            case 1  -> "Monday";
            case 2  -> "Tuesday";
            default -> "Other";
        };
    }

    // ── Loops ────────────────────────────────────────────
    public void loopDemo() {
        for (int i = 0; i < 5; i++)       System.out.println(i);
        for (int n : List.of(1, 2, 3))    System.out.println(n);
        int w = 3;
        while (w > 0)  w--;
        do { w++; } while (w < 2);
    }

    // ── Exception handling ───────────────────────────────
    public double safeDivide(double a, double b) {
        try {
            if (b == 0) throw new AppException("Division by zero", 400);
            return a / b;
        } catch (AppException e) {
            System.err.println("[" + e.getCode() + "] " + e.getMessage());
            return 0;
        } finally {
            System.out.println("safeDivide done");
        }
    }

    // ── Collections & Streams ────────────────────────────
    public void collectionsDemo() {
        List<Integer>        list = new ArrayList<>(List.of(3, 1, 4, 1, 5));
        Map<String, Integer> map  = new HashMap<>();
        Set<String>          set  = new HashSet<>();

        map.put("a", 1);
        map.put("b", 2);

        // Stream pipeline
        List<Integer> result = list.stream()
            .filter(n -> n > 2)
            .map(n -> n * n)
            .sorted()
            .collect(Collectors.toList());

        // Lambda & functional interface
        Function<Integer, Integer> doubler = n -> n * 2;
        Predicate<Integer> isEven          = n -> n % 2 == 0;

        list.stream()
            .filter(isEven)
            .map(doubler)
            .forEach(System.out::println);
    }

    // ── Inheritance & polymorphism ────────────────────────
    static class Circle extends Shape {
        private final double radius;
        Circle(double r) { this.radius = r; }
        @Override public double area() { return Math.PI * radius * radius; }
    }

    static class Rectangle extends Shape {
        private final double w, h;
        Rectangle(double w, double h) { this.w = w; this.h = h; }
        @Override public double area() { return w * h; }
    }

    // ── Record ───────────────────────────────────────────
    record Point(double x, double y) {
        double distance() { return Math.sqrt(x * x + y * y); }
    }

    // ── Thread & Runnable ────────────────────────────────
    public void threadDemo() {
        Thread t = new Thread(() -> System.out.println("Thread running"));
        t.start();
        try { t.join(); } catch (InterruptedException e) { Thread.currentThread().interrupt(); }
    }

    // ── File I/O ─────────────────────────────────────────
    public void writeFile(String path, String content) throws IOException {
        try (BufferedWriter bw = new BufferedWriter(new FileWriter(path))) {
            bw.write(content);
        }
    }

    // ── Annotations & main ───────────────────────────────
    @Override
    public String toString() { return "Demo{name=" + name + ", value=" + value + "}"; }

    public static void main(String[] args) {
        Demo d = new Demo("test", 42);
        System.out.println(d.classify(-5));
        d.collectionsDemo();
        d.loopDemo();

        Shape[] shapes = { new Circle(3), new Rectangle(4, 5) };
        for (Shape s : shapes) System.out.println(s.describe());

        Pair<String, Integer> p = new Pair<>("score", 99);
        System.out.println(p);
    }
}
`;

// ─── PHP ──────────────────────────────────────────────────────────────────────
export const PHP_SNIPPET = `<?php
// ── Namespace & use ──────────────────────────────────────
namespace App\\Demo;

use Exception;
use Closure;

// ── Constants ────────────────────────────────────────────
define('APP_NAME', 'Logic-X-Ray');
const VERSION = '1.0.0';

// ── Variables & data types ───────────────────────────────
$name    = "Alice";
$age     = 30;
$height  = 5.7;
$active  = true;
$nothing = null;

// ── Arrays ───────────────────────────────────────────────
$indexed  = [1, 2, 3, 4, 5];
$assoc    = ['name' => 'Alice', 'age' => 30];
$multi    = [['a', 'b'], ['c', 'd']];

// ── Control flow ─────────────────────────────────────────
function classify(int $n): string {
    if ($n < 0) {
        return 'negative';
    } elseif ($n === 0) {
        return 'zero';
    } else {
        return 'positive';
    }
}

function dayName(int $d): string {
    return match($d) {
        1 => 'Monday',
        2 => 'Tuesday',
        default => 'Other',
    };
}

// ── Loops ────────────────────────────────────────────────
function loopDemo(array $items): void {
    for ($i = 0; $i < count($items); $i++) {
        if ($i === 0) continue;
        echo $items[$i] . PHP_EOL;
    }

    foreach ($items as $key => $val) {
        echo "$key: $val" . PHP_EOL;
    }

    $w = 3;
    while ($w > 0) $w--;
    do { $w++; } while ($w < 2);
}

// ── Functions ────────────────────────────────────────────
function greet(string $name, string $greeting = 'Hello'): string {
    return "$greeting, $name!";
}

$multiply  = fn($a, $b) => $a * $b;             // arrow function
$double    = function (int $n) use (&$indexed): int {  // closure
    $indexed[] = $n;
    return $n * 2;
};

// ── OOP ──────────────────────────────────────────────────
interface Describable {
    public function describe(): string;
}

trait Loggable {
    public function log(string $msg): void {
        echo "[LOG] {$msg}" . PHP_EOL;
    }
}

abstract class Shape implements Describable {
    abstract public function area(): float;
    public function describe(): string {
        return static::class . ' area=' . round($this->area(), 2);
    }
}

class Circle extends Shape {
    use Loggable;

    public function __construct(private float $radius) {}

    public function area(): float { return M_PI * $this->radius ** 2; }

    public function __toString(): string { return "Circle(r={$this->radius})"; }
}

class Rectangle extends Shape {
    public function __construct(
        private float $width,
        private float $height,
    ) {}
    public function area(): float { return $this->width * $this->height; }
}

// ── Inheritance ──────────────────────────────────────────
class Animal {
    public function __construct(protected string $name) {}
    public function speak(): string { return "{$this->name} makes a sound."; }
    public function __destruct() { /* cleanup */ }
}

class Dog extends Animal {
    private array $tricks = [];
    public function __construct(string $name, private string $breed) {
        parent::__construct($name);
    }
    public function learn(string $trick): void { $this->tricks[] = $trick; }
    public function speak(): string { return "{$this->name} barks!"; }
    public static function create(string $n, string $b): static {
        return new static($n, $b);
    }
}

// ── Exception handling ───────────────────────────────────
class AppException extends Exception {
    public function __construct(string $msg, private int $errorCode = 0) {
        parent::__construct($msg);
    }
    public function getErrorCode(): int { return $this->errorCode; }
}

function safeDivide(float $a, float $b): float {
    try {
        if ($b == 0) throw new AppException('Division by zero', 400);
        return $a / $b;
    } catch (AppException $e) {
        echo "[{$e->getErrorCode()}] {$e->getMessage()}" . PHP_EOL;
        return 0.0;
    } finally {
        echo 'safeDivide done' . PHP_EOL;
    }
}

// ── Superglobals (web context) ───────────────────────────
function handleRequest(): void {
    $method = $_SERVER['REQUEST_METHOD'] ?? 'CLI';
    $id     = $_GET['id']   ?? null;
    $body   = $_POST['data'] ?? [];
    $token  = $_SESSION['token'] ?? null;

    if ($method === 'POST' && !empty($body)) {
        // process
    }
}

// ── Sessions & cookies ───────────────────────────────────
function startUserSession(string $userId): void {
    session_start();
    $_SESSION['user_id'] = $userId;
    setcookie('last_visit', date('Y-m-d'), time() + 86400);
}

// ── Include / require ────────────────────────────────────
// require_once 'config.php';
// include 'helpers.php';

// ── Entry point ──────────────────────────────────────────
$dog = Dog::create('Rex', 'Labrador');
$dog->learn('sit');
$dog->learn('roll over');
$dog->log('Dog created');

$shapes = [new Circle(3), new Rectangle(4, 5)];
foreach ($shapes as $shape) {
    echo $shape->describe() . PHP_EOL;
}

echo safeDivide(10, 0) . PHP_EOL;
echo classify(-3) . PHP_EOL;
`;

// ─── C ────────────────────────────────────────────────────────────────────────
export const C_SNIPPET = `/* ── Headers ─────────────────────────────────────────── */
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <stdarg.h>
#include <stdbool.h>

/* ── Macros ──────────────────────────────────────────── */
#define MAX_SIZE  100
#define SQ(x)     ((x) * (x))          /* function-like macro */
#define DEBUG     1

#ifdef DEBUG
  #define LOG(msg) printf("[DEBUG] %s\\n", msg)
#else
  #define LOG(msg) ((void)0)
#endif

/* ── Typedefs & enums ───────────────────────────────── */
typedef unsigned int uint;
typedef enum { STATUS_OK, STATUS_FAIL, STATUS_PENDING } Status;

/* ── Struct & union ─────────────────────────────────── */
typedef struct {
    char   name[64];
    int    age;
    float  score;
} Student;

typedef union {
    int   i;
    float f;
    char  c;
} Data;

/* ── Function pointer typedef ───────────────────────── */
typedef int (*Comparator)(const void*, const void*);

/* ── Forward declarations ───────────────────────────── */
int    factorial(int n);
void   swap(int *a, int *b);
int    cmpInt(const void *a, const void *b);
void   logMsg(const char *fmt, ...);

/* ── Variadic function ──────────────────────────────── */
void logMsg(const char *fmt, ...) {
    va_list args;
    va_start(args, fmt);
    vprintf(fmt, args);
    va_end(args);
}

/* ── Recursion ──────────────────────────────────────── */
int factorial(int n) {
    if (n <= 1) return 1;
    return n * factorial(n - 1);
}

/* ── Pointer & pointer arithmetic ───────────────────── */
void arrayDemo(void) {
    int arr[5]  = {5, 3, 1, 4, 2};
    int *ptr    = arr;
    int matrix[2][3] = {{1,2,3},{4,5,6}};

    for (int i = 0; i < 5; i++) {
        printf("%d ", *(ptr + i));     /* pointer arithmetic */
    }

    /* void pointer */
    void *vp = arr;
    printf("\\nFirst: %d\\n", *(int *)vp);
}

/* ── Control flow ───────────────────────────────────── */
const char* classify(int n) {
    if      (n < 0)  return "negative";
    else if (n == 0) return "zero";
    else             return "positive";
}

void switchDemo(Status s) {
    switch (s) {
        case STATUS_OK:      printf("OK\\n");      break;
        case STATUS_FAIL:    printf("FAIL\\n");    break;
        case STATUS_PENDING: printf("PENDING\\n"); break;
        default:             printf("UNKNOWN\\n"); break;
    }
}

/* ── Loops ──────────────────────────────────────────── */
void loopDemo(void) {
    for (int i = 0; i < 5; i++) {
        if (i == 2) continue;
        printf("%d ", i);
    }

    int w = 5;
    while (w > 0) w--;

    do { w++; } while (w < 3);

    /* goto (rare but valid C) */
    int x = 0;
    retry:
        if (x < 3) { x++; goto retry; }
}

/* ── Swap via pointers ──────────────────────────────── */
void swap(int *a, int *b) {
    int tmp = *a;
    *a = *b;
    *b = tmp;
}

/* ── Comparator for qsort ───────────────────────────── */
int cmpInt(const void *a, const void *b) {
    return (*(int*)a - *(int*)b);
}

/* ── Memory management ──────────────────────────────── */
int* buildArray(int size) {
    int *arr = (int *)malloc(size * sizeof(int));
    if (!arr) { perror("malloc"); return NULL; }

    for (int i = 0; i < size; i++) arr[i] = i * 2;

    arr = (int *)realloc(arr, size * 2 * sizeof(int));
    if (!arr) { perror("realloc"); return NULL; }

    return arr;
}

/* ── Inline function ────────────────────────────────── */
static inline int maxOf(int a, int b) { return a > b ? a : b; }

/* ── Main ───────────────────────────────────────────── */
int main(void) {
    /* struct init */
    Student s = {"Alice", 22, 91.5f};
    printf("Student: %s age=%d\\n", s.name, s.age);

    /* arrays & sorting */
    int nums[] = {5, 3, 1, 4, 2};
    qsort(nums, 5, sizeof(int), cmpInt);

    /* function pointer */
    Comparator cmp = cmpInt;

    /* dynamic memory */
    int *dynamic = buildArray(MAX_SIZE);
    if (dynamic) {
        LOG("Array built");
        free(dynamic);
    }

    /* control flow */
    printf("%s\\n", classify(-3));
    switchDemo(STATUS_OK);
    loopDemo();
    arrayDemo();

    /* macros */
    printf("SQ(7) = %d\\n", SQ(7));
    printf("max(3,9) = %d\\n", maxOf(3, 9));
    printf("10! = %d\\n", factorial(10));

    return 0;
}
`;

// ─── C++ ──────────────────────────────────────────────────────────────────────
export const CPP_SNIPPET = `// ── Headers ──────────────────────────────────────────────
#include <iostream>
#include <vector>
#include <map>
#include <set>
#include <memory>
#include <algorithm>
#include <functional>
#include <thread>
#include <fstream>
#include <stdexcept>

using namespace std;

// ── Namespace ────────────────────────────────────────────
namespace MathUtils {
    constexpr double PI = 3.14159265358979;
    template<typename T>
    T clamp(T val, T lo, T hi) { return max(lo, min(val, hi)); }
}

// ── Enum class ───────────────────────────────────────────
enum class Status { Active, Inactive, Pending };

// ── Abstract base + interface pattern ───────────────────
class Shape {
public:
    virtual double area()     const = 0;   // pure virtual
    virtual string describe() const { return "Shape"; }
    virtual ~Shape() = default;
};

// ── Template class ───────────────────────────────────────
template<typename T>
class Stack {
    vector<T> data;
public:
    void   push(T val)      { data.push_back(move(val)); }
    void   pop()            { if (!data.empty()) data.pop_back(); }
    T&     top()            { return data.back(); }
    bool   empty()  const   { return data.empty(); }
    size_t size()   const   { return data.size(); }
};

// ── Exception hierarchy ──────────────────────────────────
class AppError : public runtime_error {
    int code_;
public:
    AppError(const string& msg, int code)
        : runtime_error(msg), code_(code) {}
    int code() const { return code_; }
};

// ── Class with full OOP ──────────────────────────────────
class Animal {
protected:
    string name_;
public:
    explicit Animal(string name) : name_(move(name)) {}
    virtual ~Animal() = default;

    Animal(const Animal&)            = default;   // copy ctor
    Animal& operator=(const Animal&) = default;
    Animal(Animal&&)                 = default;   // move ctor
    Animal& operator=(Animal&&)      = default;

    virtual string speak() const { return name_ + " makes a sound."; }
    string name()          const { return name_; }

    // Operator overloading
    bool operator==(const Animal& o) const { return name_ == o.name_; }
    friend ostream& operator<<(ostream& os, const Animal& a) {
        return os << "Animal(" << a.name_ << ")";
    }
};

class Dog : public Animal {
    vector<string> tricks_;
public:
    Dog(string name) : Animal(move(name)) {}

    void   learn(string trick)   { tricks_.push_back(move(trick)); }
    string speak() const override { return name_ + " barks!"; }

    // Range-based loop
    void showTricks() const {
        for (const auto& t : tricks_) cout << name_ << ": " << t << "\n";
    }
};

// ── Multiple inheritance ─────────────────────────────────
class Flyable {
public:
    virtual string fly() const { return "I can fly!"; }
};

class FlyingDog : public Dog, public Flyable {
public:
    FlyingDog(string name) : Dog(move(name)) {}
    string fly() const override { return name_ + " flies!"; }
};

// ── Concrete shapes ──────────────────────────────────────
class Circle : public Shape {
    double radius_;
public:
    explicit Circle(double r) : radius_(r) {}
    double area()     const override { return MathUtils::PI * radius_ * radius_; }
    string describe() const override { return "Circle r=" + to_string(radius_); }
};

class Rectangle : public Shape {
    double w_, h_;
public:
    Rectangle(double w, double h) : w_(w), h_(h) {}
    double area()     const override { return w_ * h_; }
    string describe() const override { return "Rect " + to_string(w_) + "x" + to_string(h_); }
};

// ── Smart pointers ───────────────────────────────────────
void smartPtrDemo() {
    auto c  = make_unique<Circle>(5.0);
    auto r  = make_shared<Rectangle>(4.0, 6.0);
    cout << c->describe() << " area=" << c->area() << "\n";
    cout << r->describe() << " area=" << r->area() << "\n";
}

// ── STL containers & algorithms ──────────────────────────
void stlDemo() {
    vector<int>       v  = {5, 3, 1, 4, 2};
    map<string, int>  m  = {{"a",1},{"b",2}};
    set<int>          s  = {3, 1, 4, 1, 5};   // auto-deduped

    sort(v.begin(), v.end());

    // Lambda
    auto doubled = v;
    transform(doubled.begin(), doubled.end(), doubled.begin(),
              [](int x) { return x * 2; });

    // Range-based for
    for (const auto& [key, val] : m) cout << key << "=" << val << " ";

    // Function object
    function<bool(int)> isEven = [](int n) { return n % 2 == 0; };
    auto it = find_if(v.begin(), v.end(), isEven);
    if (it != v.end()) cout << "First even: " << *it << "\n";
}

// ── Exception handling ───────────────────────────────────
double safeDivide(double a, double b) {
    try {
        if (b == 0) throw AppError("Division by zero", 400);
        return a / b;
    } catch (const AppError& e) {
        cerr << "[" << e.code() << "] " << e.what() << "\n";
        return 0;
    } catch (...) {
        cerr << "Unknown error\n";
        return 0;
    }
}

// ── Move semantics & rvalue refs ─────────────────────────
string buildMessage(string&& prefix, const string& body) {
    prefix += ": " + body;
    return move(prefix);
}

// ── Threads ──────────────────────────────────────────────
void threadDemo() {
    thread t1([]{ cout << "Thread 1\n"; });
    thread t2([]{ cout << "Thread 2\n"; });
    t1.join();
    t2.join();
}

// ── File handling ────────────────────────────────────────
void fileDemo(const string& path) {
    ofstream out(path);
    if (!out) throw AppError("Cannot open file", 500);
    out << "Hello from C++\n";

    ifstream in(path);
    string line;
    while (getline(in, line)) cout << line << "\n";
}

// ── Control flow ────────────────────────────────────────
void controlDemo() {
    for (int i = 0; i < 5; i++) {
        if (i == 2) continue;
        if (i == 4) break;
    }
    int w = 3;
    while (w > 0) w--;
    do { w++; } while (w < 2);

    Status s = Status::Active;
    switch (s) {
        case Status::Active:   cout << "active\n";   break;
        case Status::Inactive: cout << "inactive\n"; break;
        default:               cout << "pending\n";  break;
    }
}

// ── Main ─────────────────────────────────────────────────
int main() {
    // Polymorphism via pointers
    vector<unique_ptr<Shape>> shapes;
    shapes.push_back(make_unique<Circle>(3.0));
    shapes.push_back(make_unique<Rectangle>(4.0, 5.0));
    for (const auto& s : shapes) cout << s->describe() << "\n";

    // Template stack
    Stack<int> st;
    st.push(1); st.push(2); st.push(3);
    while (!st.empty()) { cout << st.top() << " "; st.pop(); }

    // Dog with tricks
    Dog d("Rex");
    d.learn("sit"); d.learn("roll over");
    d.showTricks();

    smartPtrDemo();
    stlDemo();
    controlDemo();
    cout << safeDivide(10, 0) << "\n";

    // Constexpr
    constexpr double pi = MathUtils::PI;
    cout << "PI=" << pi << "\n";

    return 0;
}
`;

// ─── Snippet map ─────────────────────────────────────────────────────────────
export const DEFAULT_SNIPPETS = {
  javascript: JS_SNIPPET,
  typescript: TS_SNIPPET,
  python: PYTHON_SNIPPET,
  java: JAVA_SNIPPET,
  php: PHP_SNIPPET,
  c: C_SNIPPET,
  cpp: CPP_SNIPPET,
};

// Kept for backward compat (JS is the original default)
export const DEFAULT_SNIPPET = JS_SNIPPET;
