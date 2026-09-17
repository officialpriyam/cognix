import { afterEach, describe, expect, it, vi } from "vitest";

const EXA_KEYS = [
  "EXA_API_KEY",
  "EXA_API_KEY_1",
  "EXA_API_KEY_2",
  "EXA_API_KEY_3",
  "EXA_API_KEY_4",
  "EXA_API_KEY_5",
];

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  vi.resetModules();
});

async function loadBrowse(exaKey?: string) {
  vi.resetModules();
  for (const key of EXA_KEYS) vi.stubEnv(key, "");
  if (exaKey) vi.stubEnv("EXA_API_KEY", exaKey);
  return import("./browse-page");
}

const htmlPage = (body: string, title = "Test Page") =>
  new Response(
    `<html><head><title>${title}</title><style>.x{color:red}</style><script>evil()</script></head><body><nav>menu</nav><main>${body}</main></body></html>`,
    { status: 200, headers: { "content-type": "text/html" } },
  );

const exaPayload = (text: string, title = "Exa Title") =>
  new Response(
    JSON.stringify({ results: [{ url: "https://x.test", title, text }] }),
    {
      status: 200,
      headers: { "content-type": "application/json" },
    },
  );

async function runExecute(
  mod: Awaited<ReturnType<typeof loadBrowse>>,
  input: Record<string, unknown>,
) {
  const tool = mod.browsePageTool as unknown as {
    execute: (input: unknown, options: unknown) => Promise<unknown>;
  };
  return tool.execute(input, { toolCallId: "test-call", messages: [] });
}

describe("browse-page helpers", () => {
  it("extracts title and drops scripts/styles/nav", async () => {
    const mod = await loadBrowse();
    const { title, text } = mod.extractTextFromHtml(
      `<html><head><title>Hi</title><script>var a=1;</script></head><body><nav>links</nav><p>Hello <b>world</b> &amp; friends</p></body></html>`,
    );
    expect(title).toBe("Hi");
    expect(text).toContain("Hello world & friends");
    expect(text).not.toContain("var a");
    expect(text).not.toContain("links");
  });

  it("rejects non-public URLs", async () => {
    const mod = await loadBrowse();
    for (const bad of [
      "http://localhost:11434/api/tags",
      "http://127.0.0.1/admin",
      "http://10.0.0.5/",
      "http://192.168.1.1/",
      "ftp://example.com/file",
      "not-a-url",
    ]) {
      expect(() => mod.assertPublicHttpUrl(bad)).toThrow();
    }
    expect(
      mod.assertPublicHttpUrl("https://example.com/article").hostname,
    ).toBe("example.com");
  });
});

describe("browsePageTool execute", () => {
  it("reads via direct fetch when no Exa keys are configured", async () => {
    const mod = await loadBrowse();
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => htmlPage("<p>Direct content here</p>", "Direct")),
    );
    const result = (await runExecute(mod, {
      url: "https://example.com/a",
    })) as { source: string; text: string; title?: string };
    expect(result.source).toBe("direct-fetch");
    expect(result.title).toBe("Direct");
    expect(result.text).toContain("Direct content here");
  });

  it("prefers Exa when keys are configured", async () => {
    const mod = await loadBrowse("sk-exa-test");
    const fetchMock = vi.fn(async (url: unknown) =>
      String(url).includes("api.exa.ai")
        ? exaPayload("Exa extracted text")
        : htmlPage("<p>should not be reached</p>"),
    );
    vi.stubGlobal("fetch", fetchMock);
    const result = (await runExecute(mod, {
      url: "https://example.com/a",
    })) as { source: string; text: string };
    expect(result.source).toBe("exa");
    expect(result.text).toBe("Exa extracted text");
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("falls back to direct fetch when Exa fails", async () => {
    const mod = await loadBrowse("sk-exa-test");
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: unknown) =>
        String(url).includes("api.exa.ai")
          ? new Response("oops", { status: 500 })
          : htmlPage("<p>Fallback content</p>"),
      ),
    );
    const result = (await runExecute(mod, {
      url: "https://example.com/a",
    })) as { source: string; text: string };
    expect(result.source).toBe("direct-fetch");
    expect(result.text).toContain("Fallback content");
  });

  it("returns isError when every strategy fails", async () => {
    const mod = await loadBrowse();
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response("nope", { status: 404 })),
    );
    const result = (await runExecute(mod, {
      url: "https://example.com/a",
    })) as { isError?: boolean };
    expect(result.isError).toBe(true);
  });
});
