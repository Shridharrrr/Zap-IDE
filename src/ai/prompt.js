// ─── Prompt Templates ─────────────────────────────────────────

export function buildPrompt(type, code, userMessage, errorContext = "") {
  const codeBlock = code?.trim()
    ? `\`\`\`javascript\n${code}\n\`\`\``
    : "_(no code yet)_";

  switch (type) {
    case "write":
      return `You are an expert Node.js developer helping with a browser-based JavaScript sandbox (AlmostNode).
The user has this code:
${codeBlock}

User request: ${userMessage}

Write clean, well-commented Node.js compatible JavaScript. If writing new code, replace the entire editor content.
Wrap your code in a single \`\`\`javascript code block.
After the code block, briefly explain what it does in 1-2 sentences.`;

    case "fix":
      return `You are an expert Node.js developer debugging code in a browser sandbox.
Current code:
${codeBlock}

${errorContext ? `Error output:\n\`\`\`\n${errorContext}\n\`\`\`\n` : ""}
${userMessage ? `User message: ${userMessage}\n` : ""}
Diagnose and fix the bug. Show the corrected full code in a single \`\`\`javascript block.
After the block, explain what was wrong and what you fixed (max 2 sentences).`;

    case "explain":
      return `You are a patient Node.js educator. Explain the following code clearly:
${codeBlock}

${userMessage ? `The user specifically asks: ${userMessage}\n` : ""}
Explain what the code does step by step. Be clear and concise. Use plain language.
Do NOT rewrite the code unless asked.`;

    case "refactor":
      return `You are an expert Node.js developer. Refactor the following code for better readability, performance, and modern JS practices:
${codeBlock}

${userMessage ? `Focus on: ${userMessage}\n` : ""}
Show the refactored code in a single \`\`\`javascript block.
Then list 2-3 key improvements you made.`;

    case "tests":
      return `You are a Node.js testing expert. Write comprehensive tests for this code:
${codeBlock}

${userMessage ? `Additional requirements: ${userMessage}\n` : ""}
Use a simple test framework compatible with the browser sandbox (no jest/mocha imports — write self-contained assertions using try/catch or a simple assert helper).
Wrap tests in a single \`\`\`javascript block. The tests should run when the code is executed.`;

    case "vite":
      return `You are an expert React developer. Generate a complete, multi-file React Vite project for the following request:

${userMessage}

Required files to produce (plus any additional component files you need):
- index.html
- src/main.jsx
- src/App.jsx
- src/App.css
- src/index.css

For each file, output it EXACTLY in this format (no variations):

FILE: path/to/file.ext
\`\`\`ext
file content
\`\`\`

Rules you MUST follow:
1. Use React 18 with ReactDOM.createRoot (in src/main.jsx).
2. Use classic JSX — add \`import React from 'react'\` at the top of every JSX file that uses JSX syntax.
3. Use ONLY react and react-dom — no other npm packages.
4. Make the result visually polished, responsive, and fully functional.
5. Every file must be complete and correct — no placeholders, no TODOs.
6. After all FILE blocks, write 1-2 sentences describing what you built.`;

    case "chat":
    default:
      return `You are a helpful Node.js and JavaScript expert assistant embedded in Antigravity IDE — a browser-based code playground.
Current editor code:
${codeBlock}

User: ${userMessage}

Be concise and helpful. If you write code, wrap it in a \`\`\`javascript code block.
If there's no code involved, just answer the question conversationally.`;
  }
}

export const PROMPT_TYPES = {
  write: "write",
  fix: "fix",
  explain: "explain",
  refactor: "refactor",
  tests: "tests",
  chat: "chat",
  vite: "vite",
};
