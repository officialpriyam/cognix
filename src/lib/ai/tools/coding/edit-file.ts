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
        "Path to the file to edit, relative to project root (e.g. 'src/index.ts')",
    },
    oldString: {
      type: "string",
      description:
        "The exact string to find and replace. Must match exactly including whitespace and indentation.",
    },
    newString: {
      type: "string",
      description: "The string to replace it with",
    },
  },
  required: ["projectPath", "filePath", "oldString", "newString"],
};

export const editFileTool = createTool({
  description:
    "Edit a file by performing an exact string replacement. Use this for precise, targeted changes to existing files. The oldString must match exactly (including whitespace). Prefer this over rewriting entire files for small changes.",
  inputSchema: jsonSchemaToZod(schema),
  execute: async ({ projectPath, filePath, oldString, newString }) => {
    try {
      const resolved = resolveProjectPath(projectPath, filePath);
      const content = await fs.readFile(resolved, "utf-8");

      const count = content.split(oldString).length - 1;
      if (count === 0) {
        return {
          isError: true,
          error: `oldString not found in ${filePath}`,
          path: normalizeSlashes(filePath),
        };
      }
      if (count > 1) {
        return {
          isError: true,
          error: `oldString found ${count} times in ${filePath}. Provide more surrounding context to make the match unique.`,
          path: normalizeSlashes(filePath),
        };
      }

      const updated = content.replace(oldString, newString);
      await fs.writeFile(resolved, updated, "utf-8");

      return {
        success: true,
        path: normalizeSlashes(filePath),
        bytesChanged: Buffer.byteLength(updated, "utf-8") - Buffer.byteLength(content, "utf-8"),
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
