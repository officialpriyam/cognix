export const OPENAI_REALTIME_CLIENT_SECRETS_URL =
  "https://api.openai.com/v1/realtime/client_secrets";

export const OPENAI_REALTIME_CALLS_URL =
  "https://api.openai.com/v1/realtime/calls";

export type OpenAIRealtimeSession = {
  value: string;
  expires_at: number;
  [key: string]: any;
};

export type OpenAIRealtimeClientEvent =
  | {
      type: "session.update";
      data: Partial<OpenAIRealtimeSession>;
    }
  | {
      type: "conversation.item.create";
      previous_item_id?: string;
      item: {
        id: string;
        type: string;
        role: string;
        content: [
          {
            type: string;
            text: string;
          },
        ];
      };
    };

export type OpenAIRealtimeServerEvent =
  | {
      type:
        | "input_audio_buffer.speech_started"
        | "input_audio_buffer.speech_stopped"
        | "input_audio_buffer.committed"
        | "output_audio_buffer.stopped";
      event_id: string;
      item_id: string;
    }
  | {
      type: "conversation.item.input_audio_transcription.completed";
      event_id: string;
      item_id: string;
      content_index: number;
      transcript?: string;
    }
  | {
      type: "conversation.item.input_audio_transcription.delta";
      event_id: string;
      item_id: string;
      content_index: number;
      delta: string;
    }
  | {
      type: "response.audio_transcript.delta";
      event_id: string;
      response_id: string;
      item_id: string;
      output_index: number;
      content_index: number;
      delta: string;
    }
  | {
      type: "response.audio_transcript.done";
      event_id: string;
      response_id: string;
      item_id: string;
      output_index: number;
      content_index: number;
      transcript: string;
    }
  | {
      type: "response.audio.done";
      event_id: string;
      response_id: string;
      item_id: string;
      output_index: number;
      content_index: number;
    }
  | {
      type: "response.function_call_arguments.done";
      event_id: string;
      response_id: string;
      item_id: string;
      output_index: number;
      name: string;
      call_id: string;
      arguments: string;
    };
