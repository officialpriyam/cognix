import { getAvailableModelProviders } from "lib/ai/models";

export const GET = async () => {
  const availableProviders = await getAvailableModelProviders();
  return Response.json(
    availableProviders.sort((a, b) => {
      if (a.hasAPIKey && !b.hasAPIKey) return -1;
      if (!a.hasAPIKey && b.hasAPIKey) return 1;
      return 0;
    }),
  );
};
