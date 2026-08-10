import { appStore } from "@/app/store";
import { DEFAULT_AUTO_CHAT_MODEL } from "lib/ai/model-recommendations";
import { fetcher } from "lib/utils";
import useSWR, { SWRConfiguration } from "swr";

export const useChatModels = (options?: SWRConfiguration) => {
  return useSWR<
    {
      provider: string;
      hasAPIKey: boolean;
      models: {
        name: string;
        isFree: boolean;
        isToolCallUnsupported: boolean;
        isImageInputUnsupported: boolean;
        supportedFileMimeTypes: string[];
      }[];
    }[]
  >("/api/chat/models", fetcher, {
    dedupingInterval: 60_000 * 5,
    revalidateOnFocus: false,
    fallbackData: [],
    onSuccess: () => {
      const status = appStore.getState();
      if (!status.chatModel) {
        appStore.setState({
          chatModel: DEFAULT_AUTO_CHAT_MODEL,
          chatModelPinned: false,
        });
      }
    },
    ...options,
  });
};
