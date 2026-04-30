import { useState } from "react";

export interface ChatPick {
  title: string;
  year: number | null;
  mediaType: "movie" | "tv";
  reason: string;
  tmdbId: number | null;
  poster: string | null;
  backdrop: string | null;
  voteAverage: number | null;
}

export interface ChatTurn {
  id: string;
  role: "user" | "assistant" | "system";
  text: string;
  picks?: ChatPick[];
  ts: number;
  upgradeCta?: boolean;
}

export interface ChatLimit {
  used: number;
  limit: number;
  resetAt: number;
}

interface SendOptions {
  mediaType?: string;
  mediaId?: string;
  title?: string;
}

const WELCOME: ChatTurn = {
  id: "welcome",
  role: "assistant",
  text:
    "I'm your AI Director. Ask me what to watch — by mood, runtime, vibe, decade, anything. Or tap the mic.",
  ts: Date.now(),
  picks: [],
};

export default function useDirectorChat() {
  const [turns, setTurns] = useState<ChatTurn[]>([WELCOME]);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [quota, setQuota] = useState<ChatLimit | null>(null);

  const send = async (text: string, ctx?: SendOptions) => {
    const trimmed = text.trim();
    if (!trimmed || pending) return;
    setError(null);
    const userTurn: ChatTurn = {
      id: crypto.randomUUID(),
      role: "user",
      text: trimmed,
      ts: Date.now(),
    };
    setTurns((t) => [...t, userTurn]);
    setPending(true);

    try {
      const r = await fetch("/api/director/chat", {
        method: "POST",
        credentials: "include",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          message: trimmed.slice(0, 800),
          context: ctx?.mediaId
            ? {
                mediaType: ctx.mediaType,
                mediaId: ctx.mediaId,
                title: ctx.title,
              }
            : undefined,
        }),
      });

      // Pull live quota info from headers regardless of status.
      const remaining = r.headers.get("x-ratelimit-remaining");
      const limit = r.headers.get("x-ratelimit-limit");
      const reset = r.headers.get("x-ratelimit-reset");
      if (limit && remaining) {
        const lim = Number(limit);
        const rem = Number(remaining);
        setQuota({
          used: Math.max(0, lim - rem),
          limit: lim,
          resetAt: reset ? Number(reset) * 1000 : 0,
        });
      }

      if (r.status === 429) {
        const data = await r.json().catch(() => ({}));
        setTurns((t) => [
          ...t,
          {
            id: crypto.randomUUID(),
            role: "system",
            text:
              data?.message ||
              "Free plan: 5 chats / day. Upgrade to Pro for unlimited.",
            ts: Date.now(),
            upgradeCta: !!data?.upgrade,
          },
        ]);
        return;
      }

      if (!r.ok) throw new Error("ai_failed");
      const data = (await r.json()) as { reply: string; picks: ChatPick[] };
      setTurns((t) => [
        ...t,
        {
          id: crypto.randomUUID(),
          role: "assistant",
          text: data.reply,
          picks: data.picks ?? [],
          ts: Date.now(),
        },
      ]);
    } catch (e) {
      setError("Director is offline. Try again in a moment.");
      setTurns((t) => [
        ...t,
        {
          id: crypto.randomUUID(),
          role: "assistant",
          text: "Hmm — couldn't reach the projector room. Try again?",
          ts: Date.now(),
        },
      ]);
    } finally {
      setPending(false);
    }
  };

  const reset = () => {
    setTurns([WELCOME]);
    setError(null);
  };

  return { turns, send, pending, error, reset, quota };
}
