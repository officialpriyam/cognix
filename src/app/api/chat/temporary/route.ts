import { getSession } from "auth/server";
import {
  UIMessage,
  convertToModelMessages,
  smoothStream,
  streamText,
} from "ai";
import { customModelProvider } from "lib/ai/models";
import { selectRecommendedModelForPrompt } from "lib/ai/model-recommendations";
import globalLogger from "logger";
import { buildUserSystemPrompt } from "lib/ai/prompts";
import { getUserPreferences } from "lib/user/server";

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
      prompt: messages[messages.length - 1]?.parts?.find((p) => p.type === "text")?.text || "",
      providers: customModelProvider.modelsInfo,
      requestedModel: chatModel,
      requireToolCall: false,
      respectRequestedModel: false,
    });
    
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
