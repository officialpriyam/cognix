import { JSONSchema7 } from "json-schema";
import { tool as createTool } from "ai";
import { jsonSchemaToZod } from "lib/json-schema-to-zod";
import fs from "node:fs/promises";
import { resolveProjectPath, normalizeSlashes } from "./path-utils";

const schema: JSONSchema7 = {
  type: "object",
  properties: {
    projectPath: {
      type: "string",
      description: "Absolute path to the project root directory",
    },
    filePath: {
      type: "string",
      description:
        "Path to the file to read, relative to project root (e.g. 'src/index.ts')",
    },
    startLine: {
      type: "number",
      description: "Line number to start reading from (1-indexed, optional)",
    },
    endLine: {
      type: "number",
      description: "Line number to stop reading at (inclusive, optional)",
    },
  },
  required: ["projectPath", "filePath"],
};

export const readFileTool = createTool({
  description:
    "Read the contents of a file. Returns the full file content or a specific line range. Use this to examine source code, configuration files, or any text file in the project.",
  inputSchema: jsonSchemaToZod(schema),
  execute: async ({ projectPath, filePath, startLine, endLine }) => {
    try {
      const resolved = resolveProjectPath(projectPath, filePath);
      const raw = await fs.readFile(resolved, "utf-8");
      const lines = raw.split("\n");

      if (startLine != null || endLine != null) {
        const start = Math.max(1, startLine ?? 1) - 1;
        const end = Math.min(lines.length, endLine ?? lines.length);
        const sliced = lines.slice(start, end);
        const numbered = sliced
          .map((l, i) => `${start + i + 1}: ${l}`)
          .join("\n");
        return {
          content: numbered,
          totalLines: lines.length,
          startLine: start + 1,
          endLine: end,
          path: normalizeSlashes(filePath),
        };
      }

      return {
        content: raw,
        totalLines: lines.length,
        path: normalizeSlashes(filePath),
      };
    } catch (err: any) {
      return {
        isError: true,
        error: err.message,
        path: normalizeSlashes(filePath),
      };
    }
  },
});
