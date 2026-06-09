import { appStore } from "@/app/store";
import { DEFAULT_CHAT_MODEL } from "lib/ai/model-recommendations";
import { fetcher } from "lib/utils";
import useSWR, { SWRConfiguration } from "swr";

export const useChatModels = (options?: SWRConfiguration) => {
  return useSWR<
    {
      provider: string;
      hasAPIKey: boolean;
      models: {
        name: string;
        isToolCallUnsupported: boolean;
        isImageInputUnsupported: boolean;
        supportedFileMimeTypes: string[];
      }[];
    }[]
  >("/api/chat/models", fetcher, {
    dedupingInterval: 60_000 * 5,
    revalidateOnFocus: false,
    fallbackData: [],
    onSuccess: (data) => {
      const status = appStore.getState();
      if (!status.chatModel) {
        const defaultProvider = data.find(
          (provider) => provider.provider === DEFAULT_CHAT_MODEL.provider,
        );
        const hasDefaultModel = defaultProvider?.models.some(
          (model) => model.name === DEFAULT_CHAT_MODEL.model,
        );

        if (hasDefaultModel) {
          appStore.setState({
            chatModel: DEFAULT_CHAT_MODEL,
            chatModelPinned: false,
          });
          return;
        }

        const firstProvider = data[0]?.provider;
        const model = data[0]?.models[0]?.name;
        if (firstProvider && model) {
          appStore.setState({
            chatModel: { provider: firstProvider, model },
            chatModelPinned: false,
          });
        }
      }
    },
    ...options,
  });
};
