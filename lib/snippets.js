// demo snippets — the same small task-manager program, implemented
// idiomatically in each supported language, so switching the language
// dropdown shows a familiar shape instead of a different toy example
// every time.
export const JS_SNIPPET = `// Task Manager — a small CLI-style demo of adding, completing,
// and filtering tasks by priority.

const PRIORITIES = ["low", "medium", "high"];

class Task {
  constructor(id, title, priority = "medium") {
    this.id = id;
    this.title = title;
    this.priority = priority;
    this.done = false;
    this.createdAt = new Date();
  }

  complete() {
    this.done = true;
  }

  toString() {
    const mark = this.done ? "x" : " ";
    return \`[\${mark}] #\${this.id} (\${this.priority}) \${this.title}\`;
  }
}

class TaskManager {
  #tasks = [];
  #nextId = 1;

  add(title, priority = "medium") {
    if (!title || !title.trim()) {
      throw new Error("Task title cannot be empty");
    }
    if (!PRIORITIES.includes(priority)) {
      priority = "medium";
    }
    const task = new Task(this.#nextId++, title.trim(), priority);
    this.#tasks.push(task);
    return task;
  }

  complete(id) {
    const task = this.#tasks.find((t) => t.id === id);
    if (!task) {
      console.error(\`No task with id \${id}\`);
      return false;
    }
    task.complete();
    return true;
  }

  remove(id) {
    const before = this.#tasks.length;
    this.#tasks = this.#tasks.filter((t) => t.id !== id);
    return this.#tasks.length < before;
  }

  get pending() {
    return this.#tasks.filter((t) => !t.done);
  }

  get completed() {
    return this.#tasks.filter((t) => t.done);
  }

  byPriority(priority) {
    return this.#tasks.filter((t) => t.priority === priority);
  }

  summary() {
    const counts = { low: 0, medium: 0, high: 0 };
    for (const task of this.#tasks) {
      if (!task.done) counts[task.priority]++;
    }
    return counts;
  }

  list() {
    if (this.#tasks.length === 0) {
      return "No tasks yet.";
    }
    return this.#tasks.map((t) => t.toString()).join("\\n");
  }
}

function seedDemoTasks(manager) {
  manager.add("Write project proposal", "high");
  manager.add("Reply to emails", "low");
  manager.add("Fix login bug", "high");
  manager.add("Update dependencies", "medium");
  manager.add("Plan sprint review", "medium");
}

async function loadRemoteTasks(manager) {
  try {
    const saved = await Promise.resolve([
      { title: "Backup database", priority: "high" },
      { title: "Clean up logs", priority: "low" },
    ]);
    for (const item of saved) {
      manager.add(item.title, item.priority);
    }
  } catch (err) {
    console.error("Failed to load remote tasks:", err.message);
  }
}

function printReport(manager) {
  console.log("=== Task Report ===");
  console.log(manager.list());

  const summary = manager.summary();
  for (const priority of PRIORITIES) {
    const count = summary[priority] ?? 0;
    if (count > 0) {
      console.log(\`\${priority}: \${count} pending\`);
    } else {
      console.log(\`\${priority}: none\`);
    }
  }

  console.log(\`Completed: \${manager.completed.length}\`);
  console.log(\`Pending: \${manager.pending.length}\`);
}

async function main() {
  const manager = new TaskManager();
  seedDemoTasks(manager);
  await loadRemoteTasks(manager);

  manager.complete(1);
  manager.complete(3);

  let attempt = 0;
  while (attempt < 3) {
    const highPriority = manager.byPriority("high");
    if (highPriority.length === 0) break;
    attempt++;
  }

  try {
    manager.add("");
  } catch (err) {
    console.error("Expected error:", err.message);
  }

  printReport(manager);
}

main();
`;

// TypeScript
export const TS_SNIPPET = `// Task Manager — a small CLI-style demo of adding, completing,
// and filtering tasks by priority.

type Priority = "low" | "medium" | "high";

interface TaskSummary {
  low: number;
  medium: number;
  high: number;
}

class Task {
  readonly id: number;
  title: string;
  priority: Priority;
  done: boolean;
  readonly createdAt: Date;

  constructor(id: number, title: string, priority: Priority = "medium") {
    this.id = id;
    this.title = title;
    this.priority = priority;
    this.done = false;
    this.createdAt = new Date();
  }

  complete(): void {
    this.done = true;
  }

  toString(): string {
    const mark = this.done ? "x" : " ";
    return \`[\${mark}] #\${this.id} (\${this.priority}) \${this.title}\`;
  }
}

class TaskManager {
  private tasks: Task[] = [];
  private nextId = 1;

  add(title: string, priority: Priority = "medium"): Task {
    if (!title || !title.trim()) {
      throw new Error("Task title cannot be empty");
    }
    const task = new Task(this.nextId++, title.trim(), priority);
    this.tasks.push(task);
    return task;
  }

  complete(id: number): boolean {
    const task = this.tasks.find((t) => t.id === id);
    if (!task) {
      console.error(\`No task with id \${id}\`);
      return false;
    }
    task.complete();
    return true;
  }

  remove(id: number): boolean {
    const before = this.tasks.length;
    this.tasks = this.tasks.filter((t) => t.id !== id);
    return this.tasks.length < before;
  }

  get pending(): Task[] {
    return this.tasks.filter((t) => !t.done);
  }

  get completed(): Task[] {
    return this.tasks.filter((t) => t.done);
  }

  byPriority(priority: Priority): Task[] {
    return this.tasks.filter((t) => t.priority === priority);
  }

  summary(): TaskSummary {
    const counts: TaskSummary = { low: 0, medium: 0, high: 0 };
    for (const task of this.tasks) {
      if (!task.done) counts[task.priority]++;
    }
    return counts;
  }

  list(): string {
    if (this.tasks.length === 0) {
      return "No tasks yet.";
    }
    return this.tasks.map((t) => t.toString()).join("\\n");
  }
}

function seedDemoTasks(manager: TaskManager): void {
  manager.add("Write project proposal", "high");
  manager.add("Reply to emails", "low");
  manager.add("Fix login bug", "high");
  manager.add("Update dependencies", "medium");
  manager.add("Plan sprint review", "medium");
}

interface RemoteTask {
  title: string;
  priority: Priority;
}

async function loadRemoteTasks(manager: TaskManager): Promise<void> {
  try {
    const saved: RemoteTask[] = await Promise.resolve([
      { title: "Backup database", priority: "high" },
      { title: "Clean up logs", priority: "low" },
    ]);
    for (const item of saved) {
      manager.add(item.title, item.priority);
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("Failed to load remote tasks:", message);
  }
}

function printReport(manager: TaskManager): void {
  console.log("=== Task Report ===");
  console.log(manager.list());

  const summary = manager.summary();
  const priorities: Priority[] = ["low", "medium", "high"];
  for (const priority of priorities) {
    const count = summary[priority];
    if (count > 0) {
      console.log(\`\${priority}: \${count} pending\`);
    } else {
      console.log(\`\${priority}: none\`);
    }
  }

  console.log(\`Completed: \${manager.completed.length}\`);
  console.log(\`Pending: \${manager.pending.length}\`);
}

async function main(): Promise<void> {
  const manager = new TaskManager();
  seedDemoTasks(manager);
  await loadRemoteTasks(manager);

  manager.complete(1);
  manager.complete(3);

  let attempt = 0;
  while (attempt < 3) {
    const highPriority = manager.byPriority("high");
    if (highPriority.length === 0) break;
    attempt++;
  }

  try {
    manager.add("");
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("Expected error:", message);
  }

  printReport(manager);
}

main();
`;

// Python
export const PYTHON_SNIPPET = `# Task Manager - a small CLI-style demo of adding, completing,
# and filtering tasks by priority.

from dataclasses import dataclass, field
from datetime import datetime
from typing import Optional

PRIORITIES = ["low", "medium", "high"]


@dataclass
class Task:
    id: int
    title: str
    priority: str = "medium"
    done: bool = False
    created_at: datetime = field(default_factory=datetime.now)

    def complete(self) -> None:
        self.done = True

    def __str__(self) -> str:
        mark = "x" if self.done else " "
        return f"[{mark}] #{self.id} ({self.priority}) {self.title}"


class TaskManager:
    def __init__(self):
        self._tasks: list[Task] = []
        self._next_id = 1

    def add(self, title: str, priority: str = "medium") -> Task:
        if not title or not title.strip():
            raise ValueError("Task title cannot be empty")
        if priority not in PRIORITIES:
            priority = "medium"
        task = Task(self._next_id, title.strip(), priority)
        self._tasks.append(task)
        self._next_id += 1
        return task

    def complete(self, task_id: int) -> bool:
        task = self._find(task_id)
        if task is None:
            print(f"No task with id {task_id}")
            return False
        task.complete()
        return True

    def remove(self, task_id: int) -> bool:
        before = len(self._tasks)
        self._tasks = [t for t in self._tasks if t.id != task_id]
        return len(self._tasks) < before

    def _find(self, task_id: int) -> Optional[Task]:
        for task in self._tasks:
            if task.id == task_id:
                return task
        return None

    @property
    def pending(self) -> list[Task]:
        return [t for t in self._tasks if not t.done]

    @property
    def completed(self) -> list[Task]:
        return [t for t in self._tasks if t.done]

    def by_priority(self, priority: str) -> list[Task]:
        return [t for t in self._tasks if t.priority == priority]

    def summary(self) -> dict[str, int]:
        counts = {"low": 0, "medium": 0, "high": 0}
        for task in self._tasks:
            if not task.done:
                counts[task.priority] += 1
        return counts

    def list_tasks(self) -> str:
        if not self._tasks:
            return "No tasks yet."
        return "\\n".join(str(t) for t in self._tasks)


def seed_demo_tasks(manager: TaskManager) -> None:
    manager.add("Write project proposal", "high")
    manager.add("Reply to emails", "low")
    manager.add("Fix login bug", "high")
    manager.add("Update dependencies", "medium")
    manager.add("Plan sprint review", "medium")


def load_remote_tasks(manager: TaskManager) -> None:
    try:
        saved = [
            {"title": "Backup database", "priority": "high"},
            {"title": "Clean up logs", "priority": "low"},
        ]
        for item in saved:
            manager.add(item["title"], item["priority"])
    except Exception as err:
        print(f"Failed to load remote tasks: {err}")


def print_report(manager: TaskManager) -> None:
    print("=== Task Report ===")
    print(manager.list_tasks())

    summary = manager.summary()
    for priority in PRIORITIES:
        count = summary.get(priority, 0)
        if count > 0:
            print(f"{priority}: {count} pending")
        else:
            print(f"{priority}: none")

    print(f"Completed: {len(manager.completed)}")
    print(f"Pending: {len(manager.pending)}")


def main() -> None:
    manager = TaskManager()
    seed_demo_tasks(manager)
    load_remote_tasks(manager)

    manager.complete(1)
    manager.complete(3)

    attempt = 0
    while attempt < 3:
        high_priority = manager.by_priority("high")
        if not high_priority:
            break
        attempt += 1

    try:
        manager.add("")
    except ValueError as err:
        print(f"Expected error: {err}")

    print_report(manager)


if __name__ == "__main__":
    main()
`;

// Java
export const JAVA_SNIPPET = `// Task Manager — a small CLI-style demo of adding, completing,
// and filtering tasks by priority.

import java.util.*;
import java.util.stream.*;

class Task {
    private final int id;
    private final String title;
    private final String priority;
    private boolean done;
    private final Date createdAt;

    public Task(int id, String title, String priority) {
        this.id = id;
        this.title = title;
        this.priority = priority;
        this.done = false;
        this.createdAt = new Date();
    }

    public int getId() { return id; }
    public String getTitle() { return title; }
    public String getPriority() { return priority; }
    public boolean isDone() { return done; }

    public void complete() {
        this.done = true;
    }

    @Override
    public String toString() {
        String mark = done ? "x" : " ";
        return "[" + mark + "] #" + id + " (" + priority + ") " + title;
    }
}

class TaskManager {
    private static final List<String> PRIORITIES = List.of("low", "medium", "high");

    private final List<Task> tasks = new ArrayList<>();
    private int nextId = 1;

    public Task add(String title, String priority) {
        if (title == null || title.trim().isEmpty()) {
            throw new IllegalArgumentException("Task title cannot be empty");
        }
        if (!PRIORITIES.contains(priority)) {
            priority = "medium";
        }
        Task task = new Task(nextId++, title.trim(), priority);
        tasks.add(task);
        return task;
    }

    public boolean complete(int id) {
        for (Task task : tasks) {
            if (task.getId() == id) {
                task.complete();
                return true;
            }
        }
        System.err.println("No task with id " + id);
        return false;
    }

    public boolean remove(int id) {
        return tasks.removeIf(t -> t.getId() == id);
    }

    public List<Task> getPending() {
        return tasks.stream().filter(t -> !t.isDone()).collect(Collectors.toList());
    }

    public List<Task> getCompleted() {
        return tasks.stream().filter(Task::isDone).collect(Collectors.toList());
    }

    public List<Task> byPriority(String priority) {
        return tasks.stream()
            .filter(t -> t.getPriority().equals(priority))
            .collect(Collectors.toList());
    }

    public Map<String, Integer> summary() {
        Map<String, Integer> counts = new HashMap<>();
        counts.put("low", 0);
        counts.put("medium", 0);
        counts.put("high", 0);
        for (Task task : tasks) {
            if (!task.isDone()) {
                counts.merge(task.getPriority(), 1, Integer::sum);
            }
        }
        return counts;
    }

    public String list() {
        if (tasks.isEmpty()) {
            return "No tasks yet.";
        }
        StringBuilder sb = new StringBuilder();
        for (Task task : tasks) {
            sb.append(task.toString()).append("\\n");
        }
        return sb.toString().trim();
    }
}

public class TaskManagerDemo {

    static void seedDemoTasks(TaskManager manager) {
        manager.add("Write project proposal", "high");
        manager.add("Reply to emails", "low");
        manager.add("Fix login bug", "high");
        manager.add("Update dependencies", "medium");
        manager.add("Plan sprint review", "medium");
    }

    static void loadRemoteTasks(TaskManager manager) {
        try {
            Map<String, String> t1 = Map.of("title", "Backup database", "priority", "high");
            Map<String, String> t2 = Map.of("title", "Clean up logs", "priority", "low");
            for (Map<String, String> item : List.of(t1, t2)) {
                manager.add(item.get("title"), item.get("priority"));
            }
        } catch (Exception err) {
            System.err.println("Failed to load remote tasks: " + err.getMessage());
        }
    }

    static void printReport(TaskManager manager) {
        System.out.println("=== Task Report ===");
        System.out.println(manager.list());

        Map<String, Integer> summary = manager.summary();
        for (String priority : List.of("low", "medium", "high")) {
            int count = summary.getOrDefault(priority, 0);
            if (count > 0) {
                System.out.println(priority + ": " + count + " pending");
            } else {
                System.out.println(priority + ": none");
            }
        }

        System.out.println("Completed: " + manager.getCompleted().size());
        System.out.println("Pending: " + manager.getPending().size());
    }

    public static void main(String[] args) {
        TaskManager manager = new TaskManager();
        seedDemoTasks(manager);
        loadRemoteTasks(manager);

        manager.complete(1);
        manager.complete(3);

        int attempt = 0;
        while (attempt < 3) {
            List<Task> highPriority = manager.byPriority("high");
            if (highPriority.isEmpty()) break;
            attempt++;
        }

        try {
            manager.add("", "medium");
        } catch (IllegalArgumentException err) {
            System.err.println("Expected error: " + err.getMessage());
        }

        printReport(manager);
    }
}
`;

// PHP
export const PHP_SNIPPET = `<?php
// Task Manager — a small CLI-style demo of adding, completing,
// and filtering tasks by priority.

const PRIORITIES = ['low', 'medium', 'high'];

class Task {
    public int $id;
    public string $title;
    public string $priority;
    public bool $done = false;
    public string $createdAt;

    public function __construct(int $id, string $title, string $priority = 'medium') {
        $this->id = $id;
        $this->title = $title;
        $this->priority = $priority;
        $this->createdAt = date('Y-m-d H:i:s');
    }

    public function complete(): void {
        $this->done = true;
    }

    public function __toString(): string {
        $mark = $this->done ? 'x' : ' ';
        return "[{$mark}] #{$this->id} ({$this->priority}) {$this->title}";
    }
}

class TaskManager {
    private array $tasks = [];
    private int $nextId = 1;

    public function add(string $title, string $priority = 'medium'): Task {
        if (trim($title) === '') {
            throw new InvalidArgumentException('Task title cannot be empty');
        }
        if (!in_array($priority, PRIORITIES, true)) {
            $priority = 'medium';
        }
        $task = new Task($this->nextId++, trim($title), $priority);
        $this->tasks[] = $task;
        return $task;
    }

    public function complete(int $id): bool {
        foreach ($this->tasks as $task) {
            if ($task->id === $id) {
                $task->complete();
                return true;
            }
        }
        echo "No task with id {$id}" . PHP_EOL;
        return false;
    }

    public function remove(int $id): bool {
        $before = count($this->tasks);
        $this->tasks = array_values(array_filter(
            $this->tasks,
            fn($t) => $t->id !== $id
        ));
        return count($this->tasks) < $before;
    }

    public function pending(): array {
        return array_filter($this->tasks, fn($t) => !$t->done);
    }

    public function completed(): array {
        return array_filter($this->tasks, fn($t) => $t->done);
    }

    public function byPriority(string $priority): array {
        return array_filter($this->tasks, fn($t) => $t->priority === $priority);
    }

    public function summary(): array {
        $counts = ['low' => 0, 'medium' => 0, 'high' => 0];
        foreach ($this->tasks as $task) {
            if (!$task->done) {
                $counts[$task->priority]++;
            }
        }
        return $counts;
    }

    public function list(): string {
        if (empty($this->tasks)) {
            return 'No tasks yet.';
        }
        return implode("\\n", array_map(fn($t) => (string)$t, $this->tasks));
    }
}

function seedDemoTasks(TaskManager $manager): void {
    $manager->add('Write project proposal', 'high');
    $manager->add('Reply to emails', 'low');
    $manager->add('Fix login bug', 'high');
    $manager->add('Update dependencies', 'medium');
    $manager->add('Plan sprint review', 'medium');
}

function loadRemoteTasks(TaskManager $manager): void {
    try {
        $saved = [
            ['title' => 'Backup database', 'priority' => 'high'],
            ['title' => 'Clean up logs', 'priority' => 'low'],
        ];
        foreach ($saved as $item) {
            $manager->add($item['title'], $item['priority']);
        }
    } catch (Exception $err) {
        echo 'Failed to load remote tasks: ' . $err->getMessage() . PHP_EOL;
    }
}

function printReport(TaskManager $manager): void {
    echo "=== Task Report ===" . PHP_EOL;
    echo $manager->list() . PHP_EOL;

    $summary = $manager->summary();
    foreach (PRIORITIES as $priority) {
        $count = $summary[$priority] ?? 0;
        if ($count > 0) {
            echo "{$priority}: {$count} pending" . PHP_EOL;
        } else {
            echo "{$priority}: none" . PHP_EOL;
        }
    }

    echo 'Completed: ' . count($manager->completed()) . PHP_EOL;
    echo 'Pending: ' . count($manager->pending()) . PHP_EOL;
}

function main(): void {
    $manager = new TaskManager();
    seedDemoTasks($manager);
    loadRemoteTasks($manager);

    $manager->complete(1);
    $manager->complete(3);

    $attempt = 0;
    while ($attempt < 3) {
        $highPriority = $manager->byPriority('high');
        if (empty($highPriority)) break;
        $attempt++;
    }

    try {
        $manager->add('');
    } catch (InvalidArgumentException $err) {
        echo 'Expected error: ' . $err->getMessage() . PHP_EOL;
    }

    printReport($manager);
}

main();
`;

// C
export const C_SNIPPET = `/* Task Manager -- a small CLI-style demo of adding, completing,
 * and filtering tasks by priority. */

#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <stdbool.h>

#define MAX_TASKS   50
#define TITLE_LEN   64

typedef enum { LOW, MEDIUM, HIGH } Priority;

typedef struct {
    int      id;
    char     title[TITLE_LEN];
    Priority priority;
    bool     done;
} Task;

typedef struct {
    Task tasks[MAX_TASKS];
    int  count;
    int  nextId;
} TaskManager;

const char* priorityName(Priority p) {
    switch (p) {
        case LOW:    return "low";
        case MEDIUM: return "medium";
        case HIGH:   return "high";
        default:     return "unknown";
    }
}

void managerInit(TaskManager *m) {
    m->count = 0;
    m->nextId = 1;
}

int managerAdd(TaskManager *m, const char *title, Priority priority) {
    if (title == NULL || strlen(title) == 0) {
        fprintf(stderr, "Task title cannot be empty\\n");
        return -1;
    }
    if (m->count >= MAX_TASKS) {
        fprintf(stderr, "Task list is full\\n");
        return -1;
    }

    Task *t = &m->tasks[m->count];
    t->id = m->nextId++;
    strncpy(t->title, title, TITLE_LEN - 1);
    t->title[TITLE_LEN - 1] = '\\0';
    t->priority = priority;
    t->done = false;

    m->count++;
    return t->id;
}

bool managerComplete(TaskManager *m, int id) {
    for (int i = 0; i < m->count; i++) {
        if (m->tasks[i].id == id) {
            m->tasks[i].done = true;
            return true;
        }
    }
    fprintf(stderr, "No task with id %d\\n", id);
    return false;
}

bool managerRemove(TaskManager *m, int id) {
    for (int i = 0; i < m->count; i++) {
        if (m->tasks[i].id == id) {
            for (int j = i; j < m->count - 1; j++) {
                m->tasks[j] = m->tasks[j + 1];
            }
            m->count--;
            return true;
        }
    }
    return false;
}

int countPending(const TaskManager *m) {
    int total = 0;
    for (int i = 0; i < m->count; i++) {
        if (!m->tasks[i].done) total++;
    }
    return total;
}

int countCompleted(const TaskManager *m) {
    int total = 0;
    for (int i = 0; i < m->count; i++) {
        if (m->tasks[i].done) total++;
    }
    return total;
}

int countByPriority(const TaskManager *m, Priority priority) {
    int total = 0;
    for (int i = 0; i < m->count; i++) {
        if (!m->tasks[i].done && m->tasks[i].priority == priority) {
            total++;
        }
    }
    return total;
}

void printTask(const Task *t) {
    char mark = t->done ? 'x' : ' ';
    printf("[%c] #%d (%s) %s\\n", mark, t->id, priorityName(t->priority), t->title);
}

void managerList(const TaskManager *m) {
    if (m->count == 0) {
        printf("No tasks yet.\\n");
        return;
    }
    for (int i = 0; i < m->count; i++) {
        printTask(&m->tasks[i]);
    }
}

void seedDemoTasks(TaskManager *m) {
    managerAdd(m, "Write project proposal", HIGH);
    managerAdd(m, "Reply to emails", LOW);
    managerAdd(m, "Fix login bug", HIGH);
    managerAdd(m, "Update dependencies", MEDIUM);
    managerAdd(m, "Plan sprint review", MEDIUM);
}

void loadRemoteTasks(TaskManager *m) {
    const char *titles[] = { "Backup database", "Clean up logs" };
    const Priority priorities[] = { HIGH, LOW };

    for (int i = 0; i < 2; i++) {
        int id = managerAdd(m, titles[i], priorities[i]);
        if (id < 0) {
            fprintf(stderr, "Failed to load remote task: %s\\n", titles[i]);
        }
    }
}

void printReport(const TaskManager *m) {
    printf("=== Task Report ===\\n");
    managerList(m);

    Priority all[] = { LOW, MEDIUM, HIGH };
    for (int i = 0; i < 3; i++) {
        int count = countByPriority(m, all[i]);
        if (count > 0) {
            printf("%s: %d pending\\n", priorityName(all[i]), count);
        } else {
            printf("%s: none\\n", priorityName(all[i]));
        }
    }

    printf("Completed: %d\\n", countCompleted(m));
    printf("Pending: %d\\n", countPending(m));
}

int main(void) {
    TaskManager manager;
    managerInit(&manager);

    seedDemoTasks(&manager);
    loadRemoteTasks(&manager);

    managerComplete(&manager, 1);
    managerComplete(&manager, 3);

    int attempt = 0;
    while (attempt < 3) {
        int highCount = countByPriority(&manager, HIGH);
        if (highCount == 0) break;
        attempt++;
    }

    int badId = managerAdd(&manager, "", MEDIUM);
    if (badId < 0) {
        fprintf(stderr, "Expected error while adding empty task\\n");
    }

    printReport(&manager);
    return 0;
}
`;

// C++
export const CPP_SNIPPET = `// Task Manager — a small CLI-style demo of adding, completing,
// and filtering tasks by priority.

#include <iostream>
#include <vector>
#include <string>
#include <map>
#include <algorithm>
#include <stdexcept>

using namespace std;

enum class Priority { Low, Medium, High };

string priorityName(Priority p) {
    switch (p) {
        case Priority::Low:    return "low";
        case Priority::Medium: return "medium";
        case Priority::High:   return "high";
        default:               return "unknown";
    }
}

class Task {
public:
    int id;
    string title;
    Priority priority;
    bool done;

    Task(int id, string title, Priority priority)
        : id(id), title(move(title)), priority(priority), done(false) {}

    void complete() {
        done = true;
    }

    string toString() const {
        string mark = done ? "x" : " ";
        return "[" + mark + "] #" + to_string(id) + " (" + priorityName(priority) + ") " + title;
    }
};

class TaskManager {
    vector<Task> tasks;
    int nextId = 1;

public:
    Task& add(const string& title, Priority priority = Priority::Medium) {
        if (title.empty()) {
            throw invalid_argument("Task title cannot be empty");
        }
        tasks.emplace_back(nextId++, title, priority);
        return tasks.back();
    }

    bool complete(int id) {
        for (auto& task : tasks) {
            if (task.id == id) {
                task.complete();
                return true;
            }
        }
        cerr << "No task with id " << id << "\\n";
        return false;
    }

    bool remove(int id) {
        auto before = tasks.size();
        tasks.erase(
            remove_if(tasks.begin(), tasks.end(), [id](const Task& t) { return t.id == id; }),
            tasks.end()
        );
        return tasks.size() < before;
    }

    vector<Task> pending() const {
        vector<Task> result;
        for (const auto& t : tasks) {
            if (!t.done) result.push_back(t);
        }
        return result;
    }

    vector<Task> completed() const {
        vector<Task> result;
        for (const auto& t : tasks) {
            if (t.done) result.push_back(t);
        }
        return result;
    }

    vector<Task> byPriority(Priority priority) const {
        vector<Task> result;
        for (const auto& t : tasks) {
            if (t.priority == priority) result.push_back(t);
        }
        return result;
    }

    map<string, int> summary() const {
        map<string, int> counts = {{"low", 0}, {"medium", 0}, {"high", 0}};
        for (const auto& task : tasks) {
            if (!task.done) counts[priorityName(task.priority)]++;
        }
        return counts;
    }

    string list() const {
        if (tasks.empty()) {
            return "No tasks yet.";
        }
        string result;
        for (const auto& task : tasks) {
            result += task.toString() + "\\n";
        }
        return result;
    }
};

void seedDemoTasks(TaskManager& manager) {
    manager.add("Write project proposal", Priority::High);
    manager.add("Reply to emails", Priority::Low);
    manager.add("Fix login bug", Priority::High);
    manager.add("Update dependencies", Priority::Medium);
    manager.add("Plan sprint review", Priority::Medium);
}

void loadRemoteTasks(TaskManager& manager) {
    try {
        vector<pair<string, Priority>> saved = {
            {"Backup database", Priority::High},
            {"Clean up logs", Priority::Low},
        };
        for (const auto& [title, priority] : saved) {
            manager.add(title, priority);
        }
    } catch (const exception& err) {
        cerr << "Failed to load remote tasks: " << err.what() << "\\n";
    }
}

void printReport(const TaskManager& manager) {
    cout << "=== Task Report ===\\n";
    cout << manager.list();

    auto summary = manager.summary();
    for (const string& priority : {"low", "medium", "high"}) {
        int count = summary[priority];
        if (count > 0) {
            cout << priority << ": " << count << " pending\\n";
        } else {
            cout << priority << ": none\\n";
        }
    }

    cout << "Completed: " << manager.completed().size() << "\\n";
    cout << "Pending: " << manager.pending().size() << "\\n";
}

int main() {
    TaskManager manager;
    seedDemoTasks(manager);
    loadRemoteTasks(manager);

    manager.complete(1);
    manager.complete(3);

    int attempt = 0;
    while (attempt < 3) {
        auto highPriority = manager.byPriority(Priority::High);
        if (highPriority.empty()) break;
        attempt++;
    }

    try {
        manager.add("");
    } catch (const invalid_argument& err) {
        cerr << "Expected error: " << err.what() << "\\n";
    }

    printReport(manager);
    return 0;
}
`;

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
