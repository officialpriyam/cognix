import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const PNG_BYTES = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

async function loadQwen(apiKey?: string) {
  vi.resetModules();
  for (const key of [
    "DASHSCOPE_API_KEY",
    "QWENCLOUD_BASE_URL",
    "DASHSCOPE_BASE_URL",
  ]) {
    vi.stubEnv(key, "");
  }
  if (apiKey) vi.stubEnv("DASHSCOPE_API_KEY", apiKey);
  // NOTE: stubs stay until afterEach — the client reads the key lazily.
  return import("./qwen");
}

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  vi.resetModules();
});

describe("qwen client", () => {
  it("throws a clear error without an API key", async () => {
    const mod = await loadQwen();
    await expect(mod.generateQwenImage({ prompt: "a cat" })).rejects.toThrow(
      /DASHSCOPE_API_KEY/,
    );
  });

  it("generates images synchronously via multimodal endpoint", async () => {
    const mod = await loadQwen("sk-test");
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: unknown) => {
        if (String(url).includes("multimodal-generation")) {
          return jsonResponse({
            output: {
              choices: [
                {
                  message: {
                    content: [{ image: "https://cdn.test/out.png" }],
                  },
                },
              ],
            },
          });
        }
        return new Response(PNG_BYTES, {
          status: 200,
          headers: { "content-type": "image/png" },
        });
      }),
    );
    const images = await mod.generateQwenImage({
      prompt: "a red panda",
      model: "qwen-image-3.0-pro",
    });
    expect(images).toHaveLength(1);
    expect(images[0].mimeType).toBe("image/png");
    expect(images[0].base64).toBe(PNG_BYTES.toString("base64"));
  });

  it("runs Wan image tasks to completion", async () => {
    const mod = await loadQwen("sk-test");
    let polls = 0;
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: unknown) => {
        const target = String(url);
        if (target.includes("image-generation/generation")) {
          return jsonResponse({ output: { task_id: "task-1" } });
        }
        if (target.includes("/tasks/")) {
          polls += 1;
          return polls < 2
            ? jsonResponse({ output: { task_status: "RUNNING" } })
            : jsonResponse({
                output: {
                  task_status: "SUCCEEDED",
                  results: [{ url: "https://cdn.test/wan.png" }],
                },
              });
        }
        return new Response(PNG_BYTES, {
          status: 200,
          headers: { "content-type": "image/png" },
        });
      }),
    );
    const images = await mod.generateQwenImage({
      prompt: "a fox",
      model: "wan2.7-image",
    });
    expect(images).toHaveLength(1);
    expect(polls).toBe(2);
  });

  it("submits video tasks and reports poll status", async () => {
    const mod = await loadQwen("sk-test");
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: unknown) => {
        const target = String(url);
        if (target.includes("video-synthesis")) {
          return jsonResponse({ output: { task_id: "vid-1" } });
        }
        return jsonResponse({
          output: {
            task_status: "SUCCEEDED",
            video_url: "https://cdn.test/v.mp4",
          },
        });
      }),
    );
    const { taskId } = await mod.submitQwenVideoTask({ prompt: "waves" });
    expect(taskId).toBe("vid-1");
    const status = await mod.getQwenVideoStatus(taskId);
    expect(status).toEqual({
      status: "succeeded",
      videoUrl: "https://cdn.test/v.mp4",
    });
  });

  it("surfaces failed video tasks", async () => {
    const mod = await loadQwen("sk-test");
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        jsonResponse({
          output: { task_status: "FAILED" },
          message: "content blocked",
        }),
      ),
    );
    const status = await mod.getQwenVideoStatus("vid-2");
    expect(status.status).toBe("failed");
  });
});
