import { getAvailableModelProviders } from "lib/ai/models";

export async function GET() {
  const availableProviders = await getAvailableModelProviders();
  const modelsInfo = availableProviders
    .map((providerInfo) => {
      if (providerInfo.provider === "openRouter") {
        return [
          {
            ...providerInfo,
            models: providerInfo.models.filter((m) => !m.isFree),
          },
          {
            ...providerInfo,
            provider: "openRouterFree",
            models: providerInfo.models.filter((m) => m.isFree),
          },
        ];
      }

      return providerInfo;
    })
    .flat()
    .sort((a, b) => {
      if (a.hasAPIKey && !b.hasAPIKey) return -1;
      if (!a.hasAPIKey && b.hasAPIKey) return 1;
      return 0;
    });

  return Response.json(modelsInfo);
}
