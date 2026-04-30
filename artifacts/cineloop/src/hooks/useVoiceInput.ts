import { useCallback, useEffect, useRef, useState } from "react";

type SpeechRecognitionType = any;

declare global {
  interface Window {
    SpeechRecognition?: { new (): SpeechRecognitionType };
    webkitSpeechRecognition?: { new (): SpeechRecognitionType };
  }
}

export interface VoiceInput {
  supported: boolean;
  listening: boolean;
  transcript: string;
  start: () => void;
  stop: () => void;
  reset: () => void;
  error: string | null;
}

export default function useVoiceInput(onFinal?: (text: string) => void): VoiceInput {
  const [supported, setSupported] = useState(false);
  const [listening, setListening] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [error, setError] = useState<string | null>(null);
  const recRef = useRef<SpeechRecognitionType | null>(null);
  const onFinalRef = useRef(onFinal);
  onFinalRef.current = onFinal;

  useEffect(() => {
    if (typeof window === "undefined") return;
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) {
      setSupported(false);
      return;
    }
    setSupported(true);
    const rec: any = new SR();
    rec.continuous = false;
    rec.interimResults = true;
    rec.lang = "en-US";
    rec.onresult = (e: any) => {
      let finalText = "";
      let interimText = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const r = e.results[i];
        if (r.isFinal) finalText += r[0].transcript;
        else interimText += r[0].transcript;
      }
      const combined = (finalText + interimText).trim();
      if (combined) setTranscript(combined);
      if (finalText && onFinalRef.current) onFinalRef.current(finalText.trim());
    };
    rec.onerror = (e: any) => {
      const code = e?.error || "unknown";
      if (code === "not-allowed" || code === "service-not-allowed") {
        setError("Microphone permission denied.");
      } else if (code === "no-speech") {
        setError("Didn't catch that — try again.");
      } else {
        setError("Voice input failed.");
      }
      setListening(false);
    };
    rec.onend = () => setListening(false);
    rec.onstart = () => {
      setError(null);
      setListening(true);
    };
    recRef.current = rec;
    return () => {
      try {
        rec.abort();
      } catch {
        /* noop */
      }
    };
  }, []);

  const start = useCallback(() => {
    if (!recRef.current || listening) return;
    setTranscript("");
    setError(null);
    try {
      recRef.current.start();
    } catch {
      // start can throw if already started — ignore
    }
  }, [listening]);

  const stop = useCallback(() => {
    if (!recRef.current) return;
    try {
      recRef.current.stop();
    } catch {
      /* noop */
    }
  }, []);

  const reset = useCallback(() => {
    setTranscript("");
    setError(null);
  }, []);

  return { supported, listening, transcript, start, stop, reset, error };
}
