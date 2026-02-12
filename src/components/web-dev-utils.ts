import { UIMessage } from "ai";

export const DEFAULT_TASK =
  "Build a responsive SaaS landing page with hero, features, pricing, and FAQ sections.";

export const DEFAULT_HTML_FILE = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Cognix Web Dev Mode</title>
    <style>
      :root {
        color-scheme: light;
      }
      * {
        box-sizing: border-box;
      }
      body {
        margin: 0;
        min-height: 100vh;
        display: grid;
        place-items: center;
        font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto;
        background: linear-gradient(135deg, #f8fafc 0%, #eef2ff 100%);
      }
      .card {
        max-width: 640px;
        background: white;
        border-radius: 16px;
        padding: 28px;
        box-shadow: 0 20px 40px rgba(15, 23, 42, 0.12);
      }
      h1 {
        margin: 0 0 10px;
        font-size: 28px;
      }
      p {
        margin: 0;
        color: #475569;
        line-height: 1.55;
      }
    </style>
  </head>
  <body>
    <div class="card">
      <h1>Web Dev Mode</h1>
      <p>Ask for a website in the left panel. The generated code appears here live.</p>
    </div>
  </body>
</html>`;

export const WEB_DEV_INSTRUCTIONS = `You are in Cognix Web Dev Mode.

Rules:
1) Build websites or web app UI based on the user's request.
2) Always return a complete runnable "index.html" in one \`\`\`html\`\`\` code block.
3) Keep external dependencies minimal and avoid package installs unless explicitly asked.
4) If user asks edits, update the full HTML and return the complete file again.
5) After the code block, add a short summary (max 4 lines).`;

const STACKBLITZ_BASE_FILES: Record<string, string> = {
  ".gitignore": "node_modules\ndist\n",
  "package.json": JSON.stringify(
    {
      name: "cognix-web-dev-mode",
      private: true,
      type: "module",
      scripts: {
        dev: "vite --host 0.0.0.0 --port 5173",
        start: "vite --host 0.0.0.0 --port 5173",
      },
      devDependencies: {
        vite: "^5.4.19",
      },
    },
    null,
    2,
  ),
  "src/main.js": "console.log(\"Cognix Web Dev Mode running in StackBlitz\");\n",
};

export function getStackBlitzEmbedOptions() {
  const shared = {
    openFile: "index.html",
    showSidebar: true,
    sidebarView: "project",
    hideNavigation: false,
    terminalHeight: 32,
    startScript: "dev",
    view: "default",
    theme: "dark",
    forceEmbedLayout: true,
  };

  return [
    {
      ...shared,
      clickToLoad: false,
      crossOriginIsolated: true,
    },
    {
      ...shared,
      clickToLoad: false,
      crossOriginIsolated: false,
    },
    {
      ...shared,
      clickToLoad: true,
      crossOriginIsolated: true,
    },
    {
      ...shared,
      clickToLoad: true,
      crossOriginIsolated: false,
    },
  ] satisfies Record<string, unknown>[];
}

export type StackBlitzVM = {
  applyFsDiff: (diff: {
    create?: Record<string, string>;
    destroy?: string[];
  }) => Promise<void>;
};

export type StackBlitzSDK = {
  openProject: (
    project: {
      title: string;
      description?: string;
      template: string;
      files: Record<string, string>;
    },
    options?: Record<string, unknown>,
  ) => void;
  embedProject: (
    element: HTMLElement,
    project: {
      title: string;
      description?: string;
      template: string;
      files: Record<string, string>;
    },
    options?: Record<string, unknown>,
  ) => Promise<StackBlitzVM>;
};

export type VirtualFile = {
  content: string;
  path: string;
};

export function createStackBlitzProject(files: Record<string, string>) {
  return {
    title: "Cognix Web Dev Mode",
    description: "AI powered web app builder in Cognix",
    template: "node",
    files: {
      ...STACKBLITZ_BASE_FILES,
      ...files,
    },
  };
}

export function toStackBlitzFileMap(files: VirtualFile[]) {
  return Object.fromEntries(files.map((file) => [file.path, file.content]));
}

export function getMessageText(message: UIMessage) {
  return message.parts
    .filter((part): part is Extract<typeof part, { type: "text" }> => {
      return part.type === "text";
    })
    .map((part) => part.text)
    .join("\n")
    .trim();
}

function hasCodeBlock(text: string) {
  return /```[\s\S]*?```/.test(text);
}

export function getAssistantDisplayText(
  messages: UIMessage[],
  messageIndex: number,
  text: string,
) {
  const summary = text.replace(/```[\s\S]*?```/g, "").trim();
  if (summary) {
    return summary;
  }

  return getAssistantProgressLabel(messages, messageIndex, text);
}

function inferWorkingFileName(text: string) {
  const fileHint = /(?:^|\n)\s*(?:file|filename)\s*[:=-]\s*([^\n`]+)/i.exec(
    text,
  );
  if (fileHint?.[1]?.trim()) {
    return fileHint[1].trim();
  }

  if (/```css/i.test(text)) {
    return "styles.css";
  }

  if (/```(?:js|javascript|ts|typescript)/i.test(text)) {
    return "script.js";
  }

  return "index.html";
}

export function getAssistantProgressLabel(
  messages: UIMessage[],
  messageIndex: number,
  text: string,
) {
  const fileName = inferWorkingFileName(text);
  if (!hasCodeBlock(text)) {
    return `Writing ${fileName}...`;
  }

  let codeMessageCount = 0;
  for (let i = 0; i <= messageIndex; i += 1) {
    const message = messages[i];
    if (message.role !== "assistant") continue;

    const assistantText = getMessageText(message);
    if (assistantText && hasCodeBlock(assistantText)) {
      codeMessageCount += 1;
    }
  }

  const action = codeMessageCount <= 1 ? "Creating" : "Editing";
  return `${action} ${fileName}...`;
}

export function extractLatestHtml(messages: UIMessage[]) {
  for (let i = messages.length - 1; i >= 0; i -= 1) {
    const message = messages[i];
    if (message.role !== "assistant") continue;

    const text = getMessageText(message);
    if (!text) continue;

    const htmlMatch = /```html\s*([\s\S]*?)```/i.exec(text);
    if (htmlMatch?.[1]?.trim()) {
      return htmlMatch[1].trim();
    }

    const anyCodeMatch = /```(?:[\w-]+)?\s*([\s\S]*?)```/i.exec(text);
    if (anyCodeMatch?.[1]?.trim()) {
      const code = anyCodeMatch[1].trim();
      if (/<html|<!doctype html|<body|<head/i.test(code)) {
        return code;
      }
    }
  }

  return "";
}

function collectInlineMatches(html: string, matcher: RegExp) {
  const matches: string[] = [];
  for (const match of html.matchAll(matcher)) {
    const content = match[1]?.trim();
    if (content) {
      matches.push(content);
    }
  }
  return matches;
}

export function buildVirtualFiles(html: string): VirtualFile[] {
  const normalizedHtml = html || DEFAULT_HTML_FILE;
  const files: VirtualFile[] = [
    {
      path: "index.html",
      content: normalizedHtml,
    },
  ];

  const inlineCss = collectInlineMatches(
    normalizedHtml,
    /<style\b[^>]*>([\s\S]*?)<\/style>/gi,
  );
  if (inlineCss.length > 0) {
    files.push({
      path: "styles.css",
      content: inlineCss.join("\n\n"),
    });
  }

  const inlineScripts = collectInlineMatches(
    normalizedHtml,
    /<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/gi,
  );
  if (inlineScripts.length > 0) {
    files.push({
      path: "script.js",
      content: inlineScripts.join("\n\n"),
    });
  }

  return files;
}

export function getFileMapFingerprint(fileMap: Record<string, string>) {
  return JSON.stringify(
    Object.entries(fileMap).sort(([left], [right]) =>
      left.localeCompare(right),
    ),
  );
}

export async function waitForContainerLayout(
  container: HTMLElement,
  timeoutMs = 4500,
) {
  const start = Date.now();
  while (Date.now() - start <= timeoutMs) {
    const rect = container.getBoundingClientRect();
    if (rect.width > 40 && rect.height > 40) {
      return true;
    }

    await new Promise<void>((resolve) => {
      setTimeout(resolve, 60);
    });
  }

  return false;
}
