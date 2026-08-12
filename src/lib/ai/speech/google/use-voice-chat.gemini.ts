"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import {
  DEFAULT_VOICE_TOOLS,
  UIMessageWithCompleted,
  VoiceChatOptions,
  VoiceChatSession,
} from "..";
import { generateUUID } from "lib/utils";

const GEMINI_WS_URL =
  "wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1alpha.GenerativeService.BidiGenerateContentConstrained";

type GeminiServerMessage = {
  setupComplete?: {};
  serverContent?: {
    modelTurn?: {
      parts?: Array<{
        text?: string;
        inlineData?: { mimeType: string; data: string };
        functionCall?: { name: string; args: any };
      }>;
    };
    turnComplete?: boolean;
    interrupted?: boolean;
  };
  toolCall?: {
    functionCalls: Array<{
      id: string;
      name: string;
      args: any;
    }>;
  };
};

export function useGeminiVoiceChat(props?: VoiceChatOptions): VoiceChatSession {
  const { voice = "Kore" } = props || {};

  const [isUserSpeaking] = useState(false);
  const [isAssistantSpeaking, setIsAssistantSpeaking] = useState(false);
  const [isActive, setIsActive] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [messages, setMessages] = useState<UIMessageWithCompleted[]>([]);

  const wsRef = useRef<WebSocket | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const audioStreamRef = useRef<MediaStream | null>(null);
  const playbackContextRef = useRef<AudioContext | null>(null);
  const audioQueueRef = useRef<Float32Array[]>([]);
  const isPlayingRef = useRef(false);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);

  const createUIMessage = (m: {
    id?: string;
    role: "user" | "assistant";
    text: string;
    completed?: boolean;
  }): UIMessageWithCompleted => ({
    id: m.id ?? generateUUID(),
    role: m.role,
    parts: [{ type: "text", text: m.text }],
    completed: m.completed ?? false,
  });

  const sendAudioChunk = useCallback((float32Data: Float32Array) => {
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return;
    const int16Data = new Int16Array(float32Data.length);
    for (let i = 0; i < float32Data.length; i++) {
      const s = Math.max(-1, Math.min(1, float32Data[i]));
      int16Data[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
    }
    const bytes = new Uint8Array(int16Data.buffer);
    let binary = "";
    const chunkSize = 8192;
    for (let i = 0; i < bytes.length; i += chunkSize) {
      binary += String.fromCharCode.apply(null, bytes.subarray(i, i + chunkSize));
    }
    const base64 = btoa(binary);
    wsRef.current.send(
      JSON.stringify({
        realtimeInput: {
          audio: {
            mimeType: "audio/pcm;rate=16000",
            data: base64,
          },
        },
      }),
    );
  }, []);

  const playAudioChunk = useCallback(async (base64Data: string) => {
    if (!playbackContextRef.current) {
      playbackContextRef.current = new AudioContext({ sampleRate: 24000 });
    }
    const ctx = playbackContextRef.current;
    const raw = atob(base64Data);
    const bytes = new Uint8Array(raw.length);
    for (let i = 0; i < raw.length; i++) bytes[i] = raw.charCodeAt(i);
    const int16 = new Int16Array(bytes.buffer);
    const float32 = new Float32Array(int16.length);
    for (let i = 0; i < int16.length; i++) {
      float32[i] = int16[i] / (int16[i] < 0 ? 0x8000 : 0x7fff);
    }
    audioQueueRef.current.push(float32);
    if (!isPlayingRef.current) {
      isPlayingRef.current = true;
      while (audioQueueRef.current.length > 0) {
        const chunk = audioQueueRef.current.shift()!;
        const buffer = ctx.createBuffer(1, chunk.length, 24000);
        buffer.getChannelData(0).set(chunk);
        const source = ctx.createBufferSource();
        source.buffer = buffer;
        source.connect(ctx.destination);
        await new Promise<void>((resolve) => {
          source.onended = () => resolve();
          source.start();
        });
      }
      isPlayingRef.current = false;
    }
  }, []);

  const createSession = useCallback(async (): Promise<{
    token: string;
    model: string;
    systemPrompt: string;
    voice: string;
  }> => {
    console.log("[Gemini] fetch session from /api/chat/gemini-realtime");
    const response = await fetch("/api/chat/gemini-realtime", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        voice,
        agentId: props?.agentId,
        mentions: props?.toolMentions,
      }),
    });
    console.log("[Gemini] session response status:", response.status);
    if (response.status !== 200) {
      const text = await response.text();
      console.error("[Gemini] session error:", text);
      throw new Error(`Server error (${response.status}): ${text}`);
    }
    const data = await response.json();
    console.log("[Gemini] session data:", { model: data.model, hasToken: !!data.token, hasPrompt: !!data.systemPrompt });
    if (data.error) {
      throw new Error(data.error);
    }
    return data;
  }, [voice, props?.toolMentions, props?.agentId]);

  const handleServerMessage = useCallback(
    (msg: GeminiServerMessage) => {
      if (msg.setupComplete) {
        setIsActive(true);
        setIsLoading(false);
        setIsListening(true);
        return;
      }

      if (msg.serverContent) {
        const parts = msg.serverContent.modelTurn?.parts;
        if (parts) {
          for (const part of parts) {
            if (part.text) {
              setMessages((prev) => {
                const lastAssistant = prev.findLast(
                  (m) => m.role === "assistant" && !m.completed,
                );
                if (lastAssistant) {
                  return prev.map((m) =>
                    m.id === lastAssistant.id
                      ? {
                          ...m,
                          parts: [
                            {
                              type: "text",
                              text: ((m.parts[0] as any).text || "") + part.text,
                            },
                          ],
                        }
                      : m,
                  );
                }
                return [
                  ...prev,
                  createUIMessage({ role: "assistant", text: part.text ?? "" }),
                ];
              });
              setIsAssistantSpeaking(true);
            }
            if (part.inlineData) {
              playAudioChunk(part.inlineData.data);
            }
          }
        }

        if (msg.serverContent.interrupted) {
          audioQueueRef.current = [];
          isPlayingRef.current = false;
        }

        if (msg.serverContent.turnComplete) {
          setMessages((prev) =>
            prev.map((m) =>
              m.role === "assistant" && !m.completed
                ? { ...m, completed: true }
                : m,
            ),
          );
          setIsAssistantSpeaking(false);
        }
      }

      if (msg.toolCall) {
        for (const fc of msg.toolCall.functionCalls) {
          if (DEFAULT_VOICE_TOOLS.some((t) => t.name === fc.name)) {
            const result: any = "success";
            if (fc.name === "endConversation") {
              stop();
            }
            if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
              wsRef.current.send(
                JSON.stringify({
                  toolResponse: {
                    functionResponses: [
                      {
                        id: fc.id,
                        name: fc.name,
                        response: result,
                      },
                    ],
                  },
                }),
              );
            }
          }
        }
      }
    },
    [playAudioChunk],
  );

  const start = useCallback(async () => {
    if (isActive || isLoading) {
      console.log("[Gemini] start skipped:", { isActive, isLoading });
      return;
    }
    console.log("[Gemini] start called");
    setIsLoading(true);
    setError(null);
    setMessages([]);

    try {
      console.log("[Gemini] creating session...");
      const { token, model: geminiModel, systemPrompt, voice: sessionVoice } = await createSession();
      console.log("[Gemini] session created, model:", geminiModel, "voice:", sessionVoice);

      const wsUrl = `${GEMINI_WS_URL}?access_token=${token}`;
      console.log("[Gemini] connecting WebSocket...");

      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        console.log("[Gemini] WebSocket opened, sending setup...");
        const setupMsg = {
          setup: {
            model: `models/${geminiModel}`,
            generationConfig: {
              responseModalities: ["AUDIO"],
              speechConfig: {
                voiceConfig: {
                  prebuiltVoiceConfig: {
                    voiceName: sessionVoice,
                  },
                },
              },
            },
            systemInstruction: {
              parts: [{ text: systemPrompt }],
            },
          },
        };
        ws.send(JSON.stringify(setupMsg));
        console.log("[Gemini] setup sent");
      };

      ws.onmessage = async (event) => {
        try {
          const raw = event.data instanceof Blob
            ? await event.data.text()
            : event.data;
          const msg = JSON.parse(raw) as GeminiServerMessage;
          console.log("[Gemini] received:", msg.setupComplete ? "setupComplete" : msg.serverContent?.turnComplete ? "turnComplete" : "other");
          handleServerMessage(msg);
        } catch (err) {
          console.error("[Gemini] WS parse error:", err);
        }
      };

      ws.onerror = (event) => {
        console.error("[Gemini] WS error:", event);
        setError(new Error("WebSocket connection error"));
        setIsActive(false);
        setIsLoading(false);
      };

      ws.onclose = (event) => {
        console.log("[Gemini] WS closed:", event.code, event.reason, "wasClean:", event.wasClean);
        if (!event.wasClean) {
          setError(
            new Error(`WebSocket closed: ${event.code} ${event.reason}`),
          );
        }
        setIsActive(false);
        setIsListening(false);
        setIsLoading(false);
      };

      console.log("[Gemini] requesting microphone...");
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          sampleRate: 16000,
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
        },
      });
      console.log("[Gemini] microphone acquired, setting up audio...");
      audioStreamRef.current = stream;

      const ctx = new AudioContext({ sampleRate: 16000 });
      audioContextRef.current = ctx;
      const source = ctx.createMediaStreamSource(stream);
      sourceRef.current = source;

      const processor = ctx.createScriptProcessor(4096, 1, 1);
      processorRef.current = processor;
      processor.onaudioprocess = (e) => {
        if (ws.readyState === WebSocket.OPEN) {
          sendAudioChunk(e.inputBuffer.getChannelData(0));
        }
      };
      source.connect(processor);
      processor.connect(ctx.destination);
      console.log("[Gemini] audio pipeline ready, waiting for setupComplete...");
    } catch (err) {
      console.error("[Gemini] start error:", err);
      setError(err instanceof Error ? err : new Error(String(err)));
      setIsActive(false);
      setIsLoading(false);
    }
  }, [
    isActive,
    isLoading,
    createSession,
    handleServerMessage,
    sendAudioChunk,
    voice,
  ]);

  const stop = useCallback(async () => {
    try {
      if (processorRef.current) {
        processorRef.current.disconnect();
        processorRef.current = null;
      }
      if (sourceRef.current) {
        sourceRef.current.disconnect();
        sourceRef.current = null;
      }
      if (audioContextRef.current) {
        await audioContextRef.current.close();
        audioContextRef.current = null;
      }
      if (audioStreamRef.current) {
        audioStreamRef.current.getTracks().forEach((t) => t.stop());
        audioStreamRef.current = null;
      }
      if (playbackContextRef.current) {
        await playbackContextRef.current.close();
        playbackContextRef.current = null;
      }
      audioQueueRef.current = [];
      isPlayingRef.current = false;
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
    } finally {
      setIsActive(false);
      setIsListening(false);
      setIsLoading(false);
    }
  }, []);

  const startListening = useCallback(async () => {
    if (audioStreamRef.current && audioContextRef.current) {
      const source = audioContextRef.current.createMediaStreamSource(
        audioStreamRef.current,
      );
      sourceRef.current = source;
      const processor = audioContextRef.current.createScriptProcessor(
        4096,
        1,
        1,
      );
      processorRef.current = processor;
      processor.onaudioprocess = (e) => {
        if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
          sendAudioChunk(e.inputBuffer.getChannelData(0));
        }
      };
      source.connect(processor);
      processor.connect(audioContextRef.current.destination);
    }
    setIsListening(true);
  }, [sendAudioChunk]);

  const stopListening = useCallback(async () => {
    if (processorRef.current) {
      processorRef.current.disconnect();
      processorRef.current = null;
    }
    if (sourceRef.current) {
      sourceRef.current.disconnect();
      sourceRef.current = null;
    }
    setIsListening(false);
  }, []);

  useEffect(() => {
    return () => {
      stop();
    };
  }, [stop]);

  return {
    isActive,
    isUserSpeaking,
    isAssistantSpeaking,
    isListening,
    isLoading,
    error,
    messages,
    start,
    stop,
    startListening,
    stopListening,
  };
}
