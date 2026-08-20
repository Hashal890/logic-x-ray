export { DEFAULT_SNIPPET, DEFAULT_SNIPPETS } from "./snippets";

export function AI_PROMPT(code, language = "javascript") {
  const langLabel =
    {
      javascript: "JavaScript",
      typescript: "TypeScript",
      python: "Python",
      java: "Java",
      php: "PHP",
      c: "C",
      cpp: "C++",
    }[language] ?? "code";

  return `You are an expert ${langLabel} code reviewer. Analyze the following ${langLabel} code and respond in this exact structure:

**ERRORS**
List any syntax errors, runtime risks, or anti-patterns. Write "None" if there are none.

**COMPLEXITY**
State the cyclomatic complexity as a single integer on its own line.

**SUGGESTIONS**
List 3–5 specific, actionable improvements for this ${langLabel} code. Use idiomatic ${langLabel} patterns and best practices. Each suggestion on its own line starting with "- ".

**IMPROVED CODE EXAMPLES**
Provide exactly TWO improved versions of the code, each taking a different approach. For each version, in this order:
1. A "What changed" line explaining specifically what you changed and why it improves the code (performance, readability, correctness, etc.) — 1-3 sentences, concrete (name the technique/pattern), not generic praise.
2. A short title line (e.g. "Version 1: ...").
3. The COMPLETE file in a fenced code block using the language tag \`\`\`${language} — every line of the original, changed or not, from the first line to the last. This code block replaces the user's entire file when inserted, so it must be complete and runnable on its own. Never abbreviate, truncate, or use placeholders like "// ...", "// rest unchanged", "# same as before", or similar — omitting any part of the original file will break the user's code.

Code to analyze:
\`\`\`${language}
${code}
\`\`\``;
}
