import { JSONSchema7 } from "json-schema";
import { tool as createTool } from "ai";
import { jsonSchemaToZod } from "lib/json-schema-to-zod";
import { exec as execCb } from "node:child_process";
import { promisify } from "node:util";

const execAsync = promisify(execCb);

const schema: JSONSchema7 = {
  type: "object",
  properties: {
    projectPath: {
      type: "string",
      description: "Absolute path to the project root directory (cwd for command)",
    },
    command: {
      type: "string",
      description: "Shell command to execute",
    },
    timeout: {
      type: "number",
      description: "Timeout in milliseconds (default: 30000)",
      default: 30000,
    },
  },
  required: ["projectPath", "command"],
};

export const execCommandTool = createTool({
  description:
    "Execute a shell command in the project directory. Returns stdout, stderr, and exit code. Use this for running build commands, tests, git operations, package manager commands, etc. Timeout defaults to 30s.",
  inputSchema: jsonSchemaToZod(schema),
  execute: async ({ projectPath, command, timeout = 30000 }) => {
    try {
      const { stdout, stderr } = await execAsync(command, {
        cwd: projectPath,
        timeout,
        maxBuffer: 1024 * 1024 * 5, // 5MB
        windowsHide: true,
      });
      return {
        stdout: stdout.slice(0, 50000),
        stderr: stderr.slice(0, 50000),
        exitCode: 0,
      };
    } catch (err: any) {
      return {
        stdout: (err.stdout ?? "").slice(0, 50000),
        stderr: (err.stderr ?? err.message ?? "").slice(0, 50000),
        exitCode: err.code ?? 1,
        isError: true,
      };
    }
  },
});
