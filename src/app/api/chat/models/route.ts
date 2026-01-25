const modelsInfo = customModelProvider.modelsInfo
  .map((providerInfo) => {
    if (providerInfo.provider === "openRouter") {
      const staticNames = new Set(providerInfo.models.map((m) => m.name));
      const dynamicModels = openRouterModels.filter(
        (m) => !staticNames.has(m.name),
      );

      const allOpenRouterModels = [
        ...providerInfo.models,
        ...dynamicModels,
      ];

      const freeModels = allOpenRouterModels.filter((m) =>
        m.name.endsWith(":free"),
      );
      const paidModels = allOpenRouterModels.filter(
        (m) => !m.name.endsWith(":free"),
      );

      return [
        {
          ...providerInfo,
          models: paidModels,
        },
        {
          ...providerInfo,
          provider: "openRouterFree",
          models: freeModels,
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
  .flat();
