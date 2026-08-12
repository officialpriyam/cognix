import { NextRequest } from "next/server";
import { getSession } from "auth/server";
import { GoogleGenAI } from "@google/genai";
import { loadMcpTools, mergeSystemPrompt } from "../shared.chat";
import { buildSpeechSystemPrompt } from "lib/ai/prompts";
import { getUserPreferences } from "lib/user/server";
import { rememberAgentAction } from "../actions";

const GEMINI_LIVE_MODELS = [
  "gemini-3.1-flash-live-preview",
  "gemini-live-2.5-flash-native-audio",
];

export async function POST(request: NextRequest) {
  try {
    if (!process.env.GOOGLE_GENERATIVE_AI_API_KEY) {
      return new Response(
        JSON.stringify({ error: "GOOGLE_GENERATIVE_AI_API_KEY is not set" }),
        { status: 500 },
      );
    }

    const session = await getSession();
    if (!session?.user.id) {
      return new Response("Unauthorized", { status: 401 });
    }

    const { voice, mentions, agentId } = (await request.json()) as {
      voice: string;
      agentId?: string;
      mentions: any[];
    };

    const agent = await rememberAgentAction(agentId, session.user.id);

    const enabledMentions = agent ? agent.instructions.mentions : mentions;

    const allowedMcpTools = await loadMcpTools({ mentions: enabledMentions });

    const userPreferences = await getUserPreferences(session.user.id);

    const systemPrompt = mergeSystemPrompt(
      buildSpeechSystemPrompt(
        session.user,
        userPreferences ?? undefined,
        agent,
      ),
      "",
    );

    const geminiTools = Object.entries(allowedMcpTools ?? {}).map(
      ([name, tool]) => ({
        name,
        description: tool.description ?? "",
        parameters: (tool.inputSchema as any)?.jsonSchema ?? {
          type: "object",
          properties: {},
        },
      }),
    );

    const genai = new GoogleGenAI({
      apiKey: process.env.GOOGLE_GENERATIVE_AI_API_KEY,
      apiVersion: "v1alpha",
    });

    let token;
    let model;

    for (const m of GEMINI_LIVE_MODELS) {
      try {
        console.log(`[Gemini] trying model: ${m}`);
        token = await genai.authTokens.create({
          config: {
            uses: 1,
            expireTime: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
            newSessionExpireTime: new Date(
              Date.now() + 2 * 60 * 1000,
            ).toISOString(),
            liveConnectConstraints: {
              model: m,
              config: {
                sessionResumption: {},
                responseModalities: ["AUDIO" as any],
                speechConfig: {
                  voiceConfig: {
                    prebuiltVoiceConfig: {
                      voiceName: voice || "Kore",
                    },
                  },
                },
                systemInstruction: {
                  parts: [{ text: systemPrompt }],
                },
                ...(geminiTools.length > 0
                  ? {
                      tools: [
                        {
                          functionDeclarations: geminiTools.map((t) => ({
                            name: t.name,
                            description: t.description,
                            parameters: t.parameters,
                          })),
                        },
                      ],
                    }
                  : {}),
              },
            },
          },
        });
        model = m;
        console.log(`[Gemini] token created with model: ${m}`);
        break;
      } catch (err: any) {
        console.log(`[Gemini] model ${m} failed:`, err.message);
        continue;
      }
    }

    if (!token || !model) {
      throw new Error("All Gemini Live models failed");
    }

    return new Response(
      JSON.stringify({
        token: token.name,
        model,
        systemPrompt,
        voice: voice || "Kore",
      }),
      { status: 200, headers: { "Content-Type": "application/json" } },
    );
  } catch (error: any) {
    console.error("[Gemini] token error:", error?.message);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
    });
  }
}
