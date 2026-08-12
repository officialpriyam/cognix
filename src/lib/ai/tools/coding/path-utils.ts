import path from "node:path";

export function resolveProjectPath(
  projectPath: string,
  filePath: string,
): string {
  const resolved = path.resolve(projectPath, filePath);
  if (!resolved.startsWith(path.resolve(projectPath))) {
    throw new Error(
      `Path traversal detected: "${filePath}" resolves outside project root`,
    );
  }
  return resolved;
}

export function normalizeSlashes(p: string): string {
  return p.replace(/\\/g, "/");
}
