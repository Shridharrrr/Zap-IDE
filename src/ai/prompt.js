// ─── Prompt Templates ─────────────────────────────────────────

export function buildPrompt(type, code, userMessage, errorContext = "", history = []) {
  const codeBlock = code?.trim()
    ? `\`\`\`javascript\n${code}\n\`\`\``
    : "_(no code yet)_";
    
  let historyContext = "";
  if (history && history.length > 0) {
    const recent = history.slice(-6); // last 6 turns (3 pairs)
    const historyText = recent.map(msg => {
      let content = msg.content;
      // Truncate massively long generated code from previous AI answers to save tokens
      if (msg.role === "assistant" && content.length > 1500) {
        content = content.substring(0, 1500) + "\n... (code truncated to save tokens)";
      }
      return `${msg.role.toUpperCase()}: ${content}`;
    }).join("\n\n");
    
    historyContext = `\n--- RECENT CHAT HISTORY ---\nThe following is the recent conversation context:\n${historyText}\n---------------------------\n`;
  }

  const strictCodeOnlyRules = `STRICT OUTPUT CONTRACT (HIGHEST PRIORITY):
You must obey this contract exactly. If any other instruction conflicts, this contract wins.

ALLOWED OUTPUT SHAPES:
1) SINGLE_FILE mode:
   - Output must be exactly one fenced block:
     \`\`\`javascript
     ...code...
     \`\`\`
   - No text before or after the block.

2) MULTI_FILE mode:
   - Output must be one or more repeated FILE blocks:
     FILE: path/to/file.ext
     \`\`\`ext
     ...file content...
     \`\`\`
   - No text before, between (except valid FILE blocks), or after FILE blocks.

FORBIDDEN CONTENT:
- Any prose explanation, summaries, headings, bullet points, or conversational text.
- Any shell/terminal/install commands or CLI guidance.
- Any command strings containing: npm, pnpm, yarn, pip, bash, sh, powershell, curl, wget.
- Placeholders/TODOs like: "add later", "rest of code", "...".

QUALITY REQUIREMENTS:
- Return complete code only (no partial snippets).
- Preserve valid syntax and imports.
- Do not truncate output intentionally.
- If the request is ambiguous, choose the most reasonable full code implementation and still follow output shape strictly.
- **CRITICAL FOR REACT**: If generating React components, you MUST use MULTI_FILE mode. You MUST explicitly create 'index.html' and 'src/main.jsx' to mount the root component securely (using ReactDOM.createRoot), along with any other required React components. DO NOT output a single file for React, always output the full mountable project.
- **AESTHETICS**: Make any generated UI look incredibly premium, modern, and beautiful. Use colorful aesthetics, glassmorphism, or sleek minimal designs with standard CSS or inline styles. Do NOT output plain HTML; it must look professionally designed.`;

  switch (type) {
    case "write":
      return `You are an expert Node.js developer helping with a browser-based JavaScript sandbox (AlmostNode).
${strictCodeOnlyRules}
MODE: SINGLE_FILE

The user has this code:
${codeBlock}
${historyContext}
User request: ${userMessage}

Write clean, well-commented Node.js compatible JavaScript. If writing new code, replace the entire editor content.
Wrap your code in a single \`\`\`javascript code block.`;

    case "fix":
      return `You are an expert Node.js developer debugging code in a browser sandbox.
${strictCodeOnlyRules}
MODE: SINGLE_FILE

Current code:
${codeBlock}
${historyContext}
${errorContext ? `Error output:\n\`\`\`\n${errorContext}\n\`\`\`\n` : ""}
${userMessage ? `User message: ${userMessage}\n` : ""}
Diagnose and fix the bug. Show the corrected full code in a single \`\`\`javascript block.`;

    case "explain":
      return `You are a patient Node.js educator.
${strictCodeOnlyRules}
MODE: SINGLE_FILE
${historyContext}
The user asked for an explanation. Provide explanation as inline code comments only, not prose.
Return a single \`\`\`javascript block containing the code with clear explanatory comments.

Code to explain:
${codeBlock}

${userMessage ? `The user specifically asks: ${userMessage}\n` : ""}`;

    case "refactor":
      return `You are an expert Node.js developer.
${strictCodeOnlyRules}
MODE: SINGLE_FILE

Refactor the following code for better readability, performance, and modern JS practices:
${codeBlock}
${historyContext}
${userMessage ? `Focus on: ${userMessage}\n` : ""}
Show the refactored code in a single \`\`\`javascript block.`;

    case "tests":
      return `You are a Node.js testing expert.
${strictCodeOnlyRules}
MODE: SINGLE_FILE

Write comprehensive tests for this code:
${codeBlock}
${historyContext}
${userMessage ? `Additional requirements: ${userMessage}\n` : ""}
Use a simple test framework compatible with the browser sandbox (no jest/mocha imports — write self-contained assertions using try/catch or a simple assert helper).
Wrap tests in a single \`\`\`javascript block. The tests should run when the code is executed.`;

    case "vite":
      return `You are an expert React developer.
${strictCodeOnlyRules}
MODE: MULTI_FILE
${historyContext}
Generate a complete, multi-file React Vite project for the following request:

${userMessage}

Required files to produce (plus any additional component files you need):
- package.json
- vite.config.js
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
6. Output ONLY FILE blocks. Do NOT include any summary text before or after the FILE blocks.`;

    case "chat":
    default:
      return `You are a helpful Node.js and JavaScript expert assistant embedded in Zap-IDE — a browser-based code playground.
${strictCodeOnlyRules}
MODE: SINGLE_FILE

Current editor code:
${codeBlock}
${historyContext}
User: ${userMessage}

Return only a single \`\`\`javascript code block that best satisfies the request.`;
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
