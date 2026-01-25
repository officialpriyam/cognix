import { customModelProvider, fetchGoogleModels, fetchOpenRouterModels } from "lib/ai/models";

export const GET = async () => {
  const [openRouterModels, googleModels] = await Promise.all([
    fetchOpenRouterModels(),
    fetchGoogleModels(),
  ]);

  const modelsInfo = customModelProvider.modelsInfo.map((providerInfo) => {
    if (providerInfo.provider === "openRouter") {
      // Merge dynamic OpenRouter models, avoiding duplicates from static list
      const staticNames = new Set(providerInfo.models.map(m => m.name));
      const dynamicModels = openRouterModels.filter(m => !staticNames.has(m.name));
      return {
        ...providerInfo,
        models: [...providerInfo.models, ...dynamicModels],
      };
    }
    if (providerInfo.provider === "google") {
      // Merge dynamic Google models
      const staticNames = new Set(providerInfo.models.map(m => m.name));
      const dynamicModels = googleModels.filter(m => !staticNames.has(m.name));
      return {
        ...providerInfo,
        models: [...providerInfo.models, ...dynamicModels],
      };
    }
    return providerInfo;
  });

  return Response.json(
    modelsInfo.sort((a, b) => {
      if (a.hasAPIKey && !b.hasAPIKey) return -1;
      if (!a.hasAPIKey && b.hasAPIKey) return 1;
      return 0;
    }),
  );
};
