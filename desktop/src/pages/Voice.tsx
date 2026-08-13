import { useState, useRef, useCallback } from 'react';
import { Mic, MicOff, Phone, PhoneOff, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { fetch as tauriFetch } from '@tauri-apps/plugin-http';

const API_BASE = 'https://cognix.iampriyam.me';

type Provider = 'openai' | 'gemini';
const VOICES: Record<Provider, string[]> = {
  openai: ['alloy', 'ash', 'ballad', 'coral', 'echo', 'sage', 'shimmer', 'verse'],
  gemini: ['Puck', 'Charon', 'Kore', 'Fenrir', 'Aoede', 'Orus', 'Zephyr'],
};

export default function Voice() {
  const [provider, setProvider] = useState<Provider>('openai');
  const [voice, setVoice] = useState(VOICES.openai[0]);
  const [connected, setConnected] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const peerRef = useRef<RTCPeerConnection | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const connect = useCallback(async () => {
    setConnecting(true);
    try {
      const res = await tauriFetch(`${API_BASE}/api/chat/${provider === 'openai' ? 'openai-realtime' : 'gemini-realtime'}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ voice, model: provider === 'openai' ? 'gpt-realtime' : undefined }),
      });

      if (!res.ok) throw new Error('Failed to get session');

      if (provider === 'openai') {
        const { token, model } = await res.json();
        const pc = new RTCPeerConnection();
        const audio = document.createElement('audio');
        audio.autoplay = true;
        audioRef.current = audio;

        pc.ontrack = (e) => {
          audio.srcObject = e.streams[0];
          setSpeaking(true);
        };

        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        stream.getTracks().forEach((t) => pc.addTrack(t, stream));

        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);

        const sdpRes = await fetch('https://api.openai.com/v1/realtime/calls', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: (() => {
            const fd = new FormData();
            fd.append('model', model);
            fd.append('sdp', offer.sdp!);
            return fd;
          })(),
        });

        const { sdp } = await sdpRes.json();
        await pc.setRemoteDescription({ type: 'answer', sdp });
        peerRef.current = pc;
      } else {
        const { token, model, systemPrompt } = await res.json();
        const wsUrl = `wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1alpha.GenerativeService.BidiGenerateContentConstrained?key=${token}`;
        const ws = new WebSocket(wsUrl);

        ws.onopen = () => {
          ws.send(JSON.stringify({
            setup: {
              model: `models/${model}`,
              generationConfig: { responseModalities: ['AUDIO'], speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: voice } } } },
              systemInstruction: { parts: [{ text: systemPrompt || 'You are a helpful assistant.' }] },
            },
          }));
        };

        ws.onmessage = async (e) => {
          const data = JSON.parse(typeof e.data === 'string' ? e.data : await e.data.text());
          if (data.serverContent?.modelTurn) {
            const parts = data.serverContent.modelTurn.parts || [];
            for (const p of parts) {
              if (p.inlineData?.data) {
                const audioCtx = new AudioContext({ sampleRate: 24000 });
                const audioData = Uint8Array.from(atob(p.inlineData.data), (c) => c.charCodeAt(0));
                const buffer = await audioCtx.decodeAudioData(audioData.buffer);
                const source = audioCtx.createBufferSource();
                source.buffer = buffer;
                source.connect(audioCtx.destination);
                source.start();
                setSpeaking(true);
              }
            }
          }
        };

        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        const audioCtx = new AudioContext({ sampleRate: 16000 });
        const source = audioCtx.createMediaStreamSource(stream);
        const processor = audioCtx.createScriptProcessor(4096, 1, 1);

        processor.onaudioprocess = (e) => {
          if (ws.readyState === WebSocket.OPEN) {
            const inputData = e.inputBuffer.getChannelData(0);
            const resampled = new Int16Array(inputData.length);
            for (let i = 0; i < inputData.length; i++) {
              resampled[i] = Math.max(-32768, Math.min(32767, inputData[i] * 32768));
            }
            ws.send(new Blob([resampled], { type: 'audio/pcm' }));
          }
        };

        source.connect(processor);
        processor.connect(audioCtx.destination);
      }

      setConnected(true);
    } catch (e) {
      console.error('Voice connect error:', e);
    } finally {
      setConnecting(false);
    }
  }, [provider, voice]);

  const disconnect = useCallback(() => {
    peerRef.current?.close();
    peerRef.current = null;
    if (audioRef.current) {
      audioRef.current.srcObject = null;
      audioRef.current = null;
    }
    setConnected(false);
    setSpeaking(false);
  }, []);

  return (
    <div className="max-w-2xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Voice Chat</h1>
        <p className="text-muted-foreground mt-1">Talk to AI using your microphone</p>
      </div>

      {/* Provider select */}
      <div className="p-6 rounded-xl border border-border bg-card space-y-4">
        <h2 className="text-lg font-semibold text-foreground">Provider</h2>
        <div className="flex gap-2">
          {(['openai', 'gemini'] as const).map((p) => (
            <button
              key={p}
              onClick={() => { setProvider(p); setVoice(VOICES[p][0]); }}
              disabled={connected}
              className={cn(
                'px-4 py-2 rounded-lg text-sm font-medium border transition-colors',
                provider === p
                  ? 'bg-primary text-primary-foreground border-primary'
                  : 'bg-background text-foreground border-border hover:bg-accent'
              )}
            >
              {p === 'openai' ? 'OpenAI' : 'Google Gemini'}
            </button>
          ))}
        </div>
      </div>

      {/* Voice select */}
      <div className="p-6 rounded-xl border border-border bg-card space-y-4">
        <h2 className="text-lg font-semibold text-foreground">Voice</h2>
        <div className="flex flex-wrap gap-2">
          {VOICES[provider].map((v) => (
            <button
              key={v}
              onClick={() => setVoice(v)}
              disabled={connected}
              className={cn(
                'px-3 py-1.5 rounded-lg text-sm border transition-colors',
                voice === v
                  ? 'bg-primary text-primary-foreground border-primary'
                  : 'bg-background text-foreground border-border hover:bg-accent'
              )}
            >
              {v}
            </button>
          ))}
        </div>
      </div>

      {/* Controls */}
      <div className="flex flex-col items-center gap-6 py-8">
        <div
          className={cn(
            'w-32 h-32 rounded-full flex items-center justify-center transition-all',
            connected
              ? speaking
                ? 'bg-primary/20 ring-4 ring-primary/30 animate-pulse'
                : 'bg-primary/10 ring-2 ring-primary/20'
              : 'bg-muted'
          )}
        >
          {connected ? (
            <Mic className="h-12 w-12 text-primary" />
          ) : (
            <MicOff className="h-12 w-12 text-muted-foreground" />
          )}
        </div>

        <p className="text-sm text-muted-foreground">
          {connected ? (speaking ? 'AI is speaking...' : 'Connected — speak now') : 'Click to connect'}
        </p>

        <button
          onClick={connected ? disconnect : connect}
          disabled={connecting}
          className={cn(
            'flex items-center gap-2 px-6 py-3 rounded-full text-sm font-medium transition-colors',
            connected
              ? 'bg-destructive text-destructive-foreground hover:bg-destructive/90'
              : 'bg-primary text-primary-foreground hover:bg-primary/90'
          )}
        >
          {connecting ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : connected ? (
            <PhoneOff className="h-5 w-5" />
          ) : (
            <Phone className="h-5 w-5" />
          )}
          {connecting ? 'Connecting...' : connected ? 'Disconnect' : 'Start Voice Chat'}
        </button>
      </div>
    </div>
  );
}