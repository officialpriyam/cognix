import { JSONSchema7 } from "json-schema";
import { tool as createTool } from "ai";
import { jsonSchemaToZod } from "lib/json-schema-to-zod";
import fs from "node:fs/promises";
import path from "node:path";
import { resolveProjectPath, normalizeSlashes } from "./path-utils";

const schema: JSONSchema7 = {
  type: "object",
  properties: {
    projectPath: {
      type: "string",
      description: "Absolute path to the project root directory",
    },
    dirPath: {
      type: "string",
      description:
        "Directory path relative to project root (default: '' for project root)",
      default: "",
    },
    maxDepth: {
      type: "number",
      description: "Maximum directory depth to traverse (default: 1)",
      default: 1,
    },
  },
  required: ["projectPath"],
};

interface Entry {
  name: string;
  path: string;
  type: "file" | "directory";
}

async function listDir(
  dir: string,
  projectRoot: string,
  depth: number,
  maxDepth: number,
): Promise<Entry[]> {
  if (depth > maxDepth) return [];
  const entries: Entry[] = [];
  try {
    const items = await fs.readdir(dir, { withFileTypes: true });
    for (const item of items) {
      if (item.name.startsWith(".") || item.name === "node_modules") continue;
      const fullPath = path.join(dir, item.name);
      const relPath = normalizeSlashes(path.relative(projectRoot, fullPath));
      entries.push({
        name: item.name,
        path: relPath,
        type: item.isDirectory() ? "directory" : "file",
      });
      if (item.isDirectory() && depth < maxDepth) {
        const children = await listDir(fullPath, projectRoot, depth + 1, maxDepth);
        entries.push(...children);
      }
    }
  } catch {
    // permission error or not found
  }
  return entries;
}

export const listDirectoryTool = createTool({
  description:
    "List files and directories in a project directory. Shows the file tree structure. Skips hidden files and node_modules.",
  inputSchema: jsonSchemaToZod(schema),
  execute: async ({ projectPath, dirPath = "", maxDepth = 1 }) => {
    try {
      const resolved = resolveProjectPath(projectPath, dirPath);
      const entries = await listDir(resolved, projectPath, 1, maxDepth);
      return {
        entries,
        path: normalizeSlashes(dirPath) || ".",
        count: entries.length,
      };
    } catch (err: any) {
      return {
        isError: true,
        error: err.message,
        path: normalizeSlashes(dirPath),
      };
    }
  },
});
