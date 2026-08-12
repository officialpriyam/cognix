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
    filePath: {
      type: "string",
      description:
        "Path to the file to write, relative to project root (e.g. 'src/utils.ts')",
    },
    content: {
      type: "string",
      description: "The full content to write to the file",
    },
  },
  required: ["projectPath", "filePath", "content"],
};

export const writeFileTool = createTool({
  description:
    "Write content to a file. Creates the file and any necessary parent directories. Overwrites existing files. Use this for creating new files or completely replacing file contents.",
  inputSchema: jsonSchemaToZod(schema),
  execute: async ({ projectPath, filePath, content }) => {
    try {
      const resolved = resolveProjectPath(projectPath, filePath);
      await fs.mkdir(path.dirname(resolved), { recursive: true });
      await fs.writeFile(resolved, content, "utf-8");
      return {
        success: true,
        path: normalizeSlashes(filePath),
        bytesWritten: Buffer.byteLength(content, "utf-8"),
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
