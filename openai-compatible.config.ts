import { type OpenAICompatibleProvider } from "./src/lib/ai/create-openai-compatiable";

const providers: OpenAICompatibleProvider[] = [
  {
    provider: "MagicX Coder",
    apiKey: process.env.MAGICX_CODER_API_KEY || "",
    baseUrl: "http://185.172.175.223:1234/v1",
    models: [
      {
        apiName: "qwen2.5-coder-1.5b-instruct",
        uiName: "qwen2.5-coder-1.5b-instruct",
        supportsTools: true,
      },
    ],
  },
  {
    provider: "MagicX",
    apiKey: process.env.MAGICX_API_KEY || "",
    baseUrl: "http://185.172.175.223:1234/api/v1",
    models: [
      {
        apiName: "google/gemma-3-1b",
        uiName: "google/gemma-3-1b",
        supportsTools: true,
      },
    ],
  },
];

export default providers;