import { afterEach, describe, expect, it, vi } from "vitest";
const PNPM_COMMAND = "echo pnpm";

let originalVercel: string | undefined;
let originalPnpmCommand: string | undefined;

afterEach(() => {
  if (originalVercel === undefined) delete process.env.VERCEL;
  else process.env.VERCEL = originalVercel;

  if (originalPnpmCommand === undefined) delete process.env.PNPM_COMMAND;
  else process.env.PNPM_COMMAND = originalPnpmCommand;
});

describe("postinstall", () => {
  it("does not run database migrations during dependency installation", async () => {
    originalVercel = process.env.VERCEL;
    originalPnpmCommand = process.env.PNPM_COMMAND;
    process.env.VERCEL = "1";
    process.env.PNPM_COMMAND = PNPM_COMMAND;

    const command = vi.fn(async () => ({
      stdout: "should not run",
      stderr: "",
    }));
    const write = vi.spyOn(console, "log").mockImplementation(() => {});
    const error = vi.spyOn(console, "error").mockImplementation(() => {});

    const { main } = await import("./postinstall");
    await main();

    expect(command).not.toHaveBeenCalled();
    expect(write).toHaveBeenCalledWith(
      "Vercel environment detected. Database migrations run during app startup, not during pnpm install.",
    );
    expect(error).not.toHaveBeenCalled();
  });
});
