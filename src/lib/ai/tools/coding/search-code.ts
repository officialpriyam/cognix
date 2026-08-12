import { JSONSchema7 } from "json-schema";
import { tool as createTool } from "ai";
import { jsonSchemaToZod } from "lib/json-schema-to-zod";
import fs from "node:fs/promises";
import path from "node:path";
import { normalizeSlashes } from "./path-utils";

const schema: JSONSchema7 = {
  type: "object",
  properties: {
    projectPath: {
      type: "string",
      description: "Absolute path to the project root directory",
    },
    query: {
      type: "string",
      description: "Search query (regex pattern for grep, or glob pattern)",
    },
    mode: {
      type: "string",
      enum: ["grep", "glob"],
      description:
        "Search mode: 'grep' for content search (regex), 'glob' for filename search",
    },
    include: {
      type: "string",
      description:
        "File pattern to include (e.g. '*.ts', '*.tsx'). Only used in grep mode.",
    },
    maxResults: {
      type: "number",
      description: "Maximum number of results to return (default: 50)",
      default: 50,
    },
  },
  required: ["projectPath", "query", "mode"],
};

async function grepSearch(
  projectPath: string,
  query: string,
  include: string | undefined,
  maxResults: number,
): Promise<{ file: string; line: number; content: string }[]> {
  const results: { file: string; line: number; content: string }[] = [];
  const regex = new RegExp(query, "gm");

  async function walkDir(dir: string) {
    if (results.length >= maxResults) return;
    try {
      const items = await fs.readdir(dir, { withFileTypes: true });
      for (const item of items) {
        if (results.length >= maxResults) return;
        if (item.name.startsWith(".") || item.name === "node_modules") continue;
        const fullPath = path.join(dir, item.name);
        if (item.isDirectory()) {
          await walkDir(fullPath);
        } else if (item.isFile()) {
          if (include && !matchGlob(item.name, include)) continue;
          try {
            const content = await fs.readFile(fullPath, "utf-8");
            const lines = content.split("\n");
            for (let i = 0; i < lines.length; i++) {
              if (results.length >= maxResults) return;
              regex.lastIndex = 0;
              if (regex.test(lines[i])) {
                results.push({
                  file: normalizeSlashes(path.relative(projectPath, fullPath)),
                  line: i + 1,
                  content: lines[i].trim(),
                });
              }
            }
          } catch {
            // binary file or permission error
          }
        }
      }
    } catch {
      // permission error
    }
  }

  await walkDir(projectPath);
  return results;
}

function matchGlob(filename: string, pattern: string): boolean {
  const regex = new RegExp(
    `^${pattern.replace(/\./g, "\\.").replace(/\*/g, ".*").replace(/\?/g, ".")}$`,
  );
  return regex.test(filename);
}

async function globSearch(
  projectPath: string,
  pattern: string,
  maxResults: number,
): Promise<string[]> {
  const results: string[] = [];
  const regex = new RegExp(
    `^${pattern.replace(/\./g, "\\.").replace(/\*/g, ".*").replace(/\?/g, ".")}$`,
  );

  async function walkDir(dir: string) {
    if (results.length >= maxResults) return;
    try {
      const items = await fs.readdir(dir, { withFileTypes: true });
      for (const item of items) {
        if (results.length >= maxResults) return;
        if (item.name.startsWith(".") || item.name === "node_modules") continue;
        const fullPath = path.join(dir, item.name);
        if (item.isDirectory()) {
          await walkDir(fullPath);
        } else if (item.isFile()) {
          if (regex.test(item.name)) {
            results.push(
              normalizeSlashes(path.relative(projectPath, fullPath)),
            );
          }
        }
      }
    } catch {
      // permission error
    }
  }

  await walkDir(projectPath);
  return results;
}

export const searchCodeTool = createTool({
  description:
    "Search for files or content within a project. Use 'grep' mode to search file contents with regex patterns, or 'glob' mode to find files by name pattern.",
  inputSchema: jsonSchemaToZod(schema),
  execute: async ({
    projectPath,
    query,
    mode,
    include,
    maxResults = 50,
  }) => {
    try {
      if (mode === "grep") {
        const matches = await grepSearch(
          projectPath,
          query,
          include,
          maxResults,
        );
        return { matches, count: matches.length, mode };
      } else {
        const files = await globSearch(projectPath, query, maxResults);
        return { files, count: files.length, mode };
      }
    } catch (err: any) {
      return {
        isError: true,
        error: err.message,
      };
    }
  },
});
