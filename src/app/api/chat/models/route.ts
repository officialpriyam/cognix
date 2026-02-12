import {
  customModelProvider,
  fetchGoogleModels,
  fetchOpenRouterModels,
} from "lib/ai/models";

export async function GET() {
  const [openRouterModels, googleModels] = await Promise.all([
    fetchOpenRouterModels(),
    fetchGoogleModels(),
  ]);

  const modelsInfo = customModelProvider.modelsInfo
    .map((providerInfo) => {
      if (providerInfo.provider === "openRouter") {
        const staticNames = new Set(providerInfo.models.map((m) => m.name));
        const dynamicModels = openRouterModels.filter(
          (m) => !staticNames.has(m.name),
        );

        const allModels = [...providerInfo.models, ...dynamicModels];

        return [
          {
            ...providerInfo,
            models: allModels.filter((m) => !m.name.endsWith(":free")),
          },
          {
            ...providerInfo,
            provider: "openRouterFree",
            models: allModels.filter((m) => m.name.endsWith(":free")),
          },
        ];
      }

      if (providerInfo.provider === "google") {
        const staticNames = new Set(providerInfo.models.map((m) => m.name));
        const dynamicModels = googleModels.filter(
          (m) => !staticNames.has(m.name),
        );

        return {
          ...providerInfo,
          models: [...providerInfo.models, ...dynamicModels],
        };
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
