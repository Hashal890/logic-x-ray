// Re-export snippets so the rest of the app only needs one import
export { DEFAULT_SNIPPET, DEFAULT_SNIPPETS } from "./snippets";

/**
 * Build a language-aware AI analysis prompt.
 * @param {string} code
 * @param {string} language
 */
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
Provide 1–2 improved versions of the code. For each, write a short title line then the full improved code in a fenced code block using the language tag \`\`\`${language}.

Code to analyze:
\`\`\`${language}
${code}
\`\`\``;
}
