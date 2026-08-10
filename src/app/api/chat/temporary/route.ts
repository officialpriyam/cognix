import {
  UIMessage,
  convertToModelMessages,
  smoothStream,
  streamText,
} from "ai";
import { getSession } from "auth/server";
import {
  DEFAULT_AUTO_CHAT_MODEL,
  selectRecommendedModelForPrompt,
} from "lib/ai/model-recommendations";
import { customModelProvider, getAvailableModelProviders } from "lib/ai/models";
import { buildUserSystemPrompt } from "lib/ai/prompts";
import { getUserPreferences } from "lib/user/server";
import globalLogger from "logger";

import { colorize } from "consola/utils";

const logger = globalLogger.withDefaults({
  message: colorize("blackBright", `Temporary Chat API: `),
});

export async function POST(request: Request) {
  try {
    const json = await request.json();

    const session = await getSession();

    const { messages, chatModel, instructions } = json as {
      messages: UIMessage[];
      chatModel?: {
        provider: string;
        model: string;
      };
      instructions?: string;
    };
    logger.info(`model: ${chatModel?.provider}/${chatModel?.model}`);

    // Use auto-selection logic for temporary chat as well
    const resolvedChatModel = selectRecommendedModelForPrompt({
      prompt:
        messages[messages.length - 1]?.parts?.find((p) => p.type === "text")
          ?.text || "",
      providers: await getAvailableModelProviders(),
      requestedModel: chatModel ?? DEFAULT_AUTO_CHAT_MODEL,
      requireToolCall: false,
      respectRequestedModel: false,
    });
    if (!resolvedChatModel) {
      return new Response(
        "Auto mode could not find any configured model. Add at least one provider API key, or start Ollama with an installed local model.",
        {
          status: 503,
          headers: { "Content-Type": "text/plain; charset=utf-8" },
        },
      );
    }

    const model = customModelProvider.getModel(resolvedChatModel);
    const userPreferences = session?.user?.id
      ? (await getUserPreferences(session.user.id)) || undefined
      : undefined;

    return streamText({
      model,
      system: `${buildUserSystemPrompt(session?.user, userPreferences)} ${
        instructions ? `\n\n${instructions}` : ""
      }`.trim(),
      messages: convertToModelMessages(messages),
      experimental_transform: smoothStream({ chunking: "word" }),
    }).toUIMessageStreamResponse();
  } catch (error: any) {
    logger.error(error);
    return new Response(error.message || "Oops, an error occured!", {
      status: 500,
    });
  }
}
