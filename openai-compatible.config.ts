import { type OpenAICompatibleProvider } from "./src/lib/ai/create-openai-compatiable";

const providers: OpenAICompatibleProvider[] = [
  // example
  // {
  //   provider: "Groq",
  //   apiKey: "123",
  //   baseUrl: "https://api.groq.com/openai/v1",
  //   models: [
  //     {
  //       apiName: "llama3-8b-8192",
  //       uiName: "Llama 3 8B",
  //       supportsTools: true,
  //     },
  //     {
  //       apiName: "mixtral-8x7b-32768",
  //       uiName: "Mixtral 8x7B",
  //       supportsTools: true,
  //     },
  //     {
  //       apiName: "gemma-7b-it",
  //       uiName: "Gemma 7B IT",
  //       supportsTools: false,
  //     },
  //   ],
  // },

  // Example configuration for Azure OpenAI
  // {
  //   provider: "Azure OpenAI",
  //   apiKey: "YOUR_AZURE_OPENAI_API_KEY",
  //   baseUrl: "https://your-azure-resource.openai.azure.com/openai/deployments/",
  //   models: [
  //     {
  //       apiName: "your-deployment-name",
  //       uiName: "GPT-4o (Azure Example)",
  //       supportsTools: true,
  //       apiVersion: "2025-01-01-preview",
  //     },
  //   ],
  // },
];

export default providers;