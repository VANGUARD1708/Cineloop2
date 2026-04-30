import { useEffect, useRef, useState } from "react";
import { Link } from "wouter";
import { Sparkles, X, Send, Mic, MicOff, Loader2, Film, Crown } from "lucide-react";
import useDirectorChat, { type ChatPick } from "@/hooks/useDirectorChat";
import useVoiceInput from "@/hooks/useVoiceInput";
import { useIdentity } from "@/hooks/useIdentity";

const SUGGESTIONS = [
  "Surprise me with a 90s sci-fi",
  "Heist movie under 2 hours",
  "Best sad ending of all time",
  "Show me a hidden gem",
];

export default function DirectorCopilot() {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const { turns, send, pending, reset, quota } = useDirectorChat();
  const { user } = useIdentity();
  const isPro = !!user?.isPro;
  // Quota from chat call wins (most live); falls back to identity snapshot.
  const liveQuota = quota
    ? { used: quota.used, limit: quota.limit }
    : user?.chatQuota
    ? { used: user.chatQuota.used, limit: user.chatQuota.limit }
    : null;
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  const voice = useVoiceInput((finalText) => {
    if (finalText) void send(finalText);
  });

  // Auto-scroll on new turn
  useEffect(() => {
    if (!open) return;
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [open, turns, pending]);

  // Focus input on open
  useEffect(() => {
    if (open) {
      const t = setTimeout(() => inputRef.current?.focus(), 200);
      return () => clearTimeout(t);
    }
  }, [open]);

  // Esc to close
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const text = input.trim();
    if (!text) return;
    setInput("");
    await send(text);
  };

  const onSuggest = (s: string) => {
    void send(s);
  };

  const toggleMic = () => {
    if (!voice.supported) return;
    if (voice.listening) voice.stop();
    else voice.start();
  };

  return (
    <>
      {/* Floating launch button */}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="fixed bottom-6 right-6 z-[60] flex h-14 w-14 items-center justify-center rounded-full border border-white/15 bg-gradient-to-br from-rose-600 via-rose-500 to-amber-500 text-white shadow-[0_10px_40px_-8px_rgba(220,20,60,0.55)] transition-transform hover:scale-105 active:scale-95"
        data-testid="button-copilot-toggle"
        aria-label={open ? "Close AI Director" : "Open AI Director"}
      >
        <span className="absolute inset-0 rounded-full bg-rose-500/40 blur-xl" aria-hidden />
        {open ? (
          <X className="relative h-5 w-5" />
        ) : (
          <Sparkles className="relative h-5 w-5" />
        )}
      </button>

      {/* Dock panel */}
      <div
        className={`fixed bottom-24 right-6 z-[60] w-[min(380px,calc(100vw-32px))] origin-bottom-right transition-all duration-200 ${
          open ? "pointer-events-auto translate-y-0 scale-100 opacity-100" : "pointer-events-none translate-y-3 scale-95 opacity-0"
        }`}
        data-testid="dock-copilot"
        aria-hidden={!open}
      >
        <div className="overflow-hidden rounded-2xl border border-white/10 bg-zinc-950/95 shadow-2xl backdrop-blur-xl">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-white/10 bg-gradient-to-r from-rose-950/40 to-zinc-950/0 px-4 py-3">
            <div className="flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-rose-500 to-amber-500 text-white">
                <Film className="h-4 w-4" />
              </div>
              <div>
                <p className="text-sm font-semibold text-white">AI Director</p>
                <p className="text-[11px] text-white/50">
                  {isPro ? "Unlimited · curated by your taste" : "Curated by your taste"}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {isPro ? (
                <span
                  className="flex items-center gap-1 rounded-full border border-amber-500/40 bg-gradient-to-r from-amber-500/15 to-rose-500/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-amber-300"
                  data-testid="badge-copilot-pro"
                >
                  <Crown className="h-3 w-3" />
                  Pro
                </span>
              ) : liveQuota ? (
                <span
                  className={`rounded-full border px-2 py-0.5 text-[10px] font-medium tabular-nums ${
                    liveQuota.used >= liveQuota.limit
                      ? "border-rose-500/50 bg-rose-500/15 text-rose-200"
                      : "border-white/10 bg-white/5 text-white/60"
                  }`}
                  data-testid="badge-copilot-quota"
                  title={`${liveQuota.limit - liveQuota.used} chat${liveQuota.limit - liveQuota.used === 1 ? "" : "s"} left today`}
                >
                  {liveQuota.used}/{liveQuota.limit}
                </span>
              ) : null}
              <button
                type="button"
                onClick={reset}
                className="text-[11px] text-white/50 hover:text-white/90"
                data-testid="button-copilot-reset"
              >
                New chat
              </button>
            </div>
          </div>

          {/* Messages */}
          <div
            ref={scrollRef}
            className="max-h-[55vh] overflow-y-auto px-4 py-3"
            data-testid="copilot-messages"
          >
            {turns.map((t) => {
              if (t.role === "system") {
                return (
                  <div key={t.id} className="mb-3" data-testid="turn-system">
                    <div className="rounded-xl border border-amber-500/30 bg-gradient-to-br from-amber-500/10 to-rose-500/10 px-3 py-2.5 text-sm text-amber-100">
                      <div className="flex items-start gap-2">
                        <Crown className="mt-0.5 h-4 w-4 flex-shrink-0 text-amber-300" />
                        <div className="flex-1">
                          <p className="leading-relaxed">{t.text}</p>
                          {t.upgradeCta && (
                            <Link
                              href="/pricing"
                              onClick={() => setOpen(false)}
                              className="mt-1.5 inline-flex items-center gap-1 rounded-md bg-amber-500/20 px-2 py-1 text-[11px] font-bold uppercase tracking-wider text-amber-200 hover:bg-amber-500/30"
                              data-testid="button-copilot-upgrade"
                            >
                              <Crown className="h-3 w-3" /> Upgrade to Pro
                            </Link>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              }
              return (
                <div key={t.id} className={`mb-3 ${t.role === "user" ? "text-right" : "text-left"}`}>
                  <div
                    className={`inline-block max-w-[85%] rounded-2xl px-3 py-2 text-sm leading-relaxed ${
                      t.role === "user"
                        ? "bg-rose-600/90 text-white"
                        : "bg-white/5 text-white/90"
                    }`}
                    data-testid={`turn-${t.role}`}
                  >
                    {t.text}
                  </div>
                  {t.role === "assistant" && t.picks && t.picks.length > 0 && (
                    <div className="mt-2 grid grid-cols-1 gap-2">
                      {t.picks.map((p, i) => (
                        <PickCard key={`${t.id}-${i}`} pick={p} />
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
            {pending && (
              <div className="mb-3 text-left">
                <div className="inline-flex items-center gap-2 rounded-2xl bg-white/5 px-3 py-2 text-sm text-white/70">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  <span>Director is thinking…</span>
                </div>
              </div>
            )}
          </div>

          {/* Suggestions */}
          {turns.length <= 1 && !pending && (
            <div className="flex flex-wrap gap-1.5 px-4 pb-2" data-testid="copilot-suggestions">
              {SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => onSuggest(s)}
                  className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[11px] text-white/75 hover:bg-white/10 hover:text-white"
                >
                  {s}
                </button>
              ))}
            </div>
          )}

          {/* Voice transcript preview */}
          {voice.listening && (
            <div className="mx-4 mb-2 rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-1.5 text-[11px] text-rose-100">
              <span className="font-medium">Listening… </span>
              {voice.transcript || "Speak now"}
            </div>
          )}
          {voice.error && !voice.listening && (
            <div className="mx-4 mb-2 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-1.5 text-[11px] text-amber-100">
              {voice.error}
            </div>
          )}

          {/* Composer */}
          <form
            onSubmit={onSubmit}
            className="flex items-center gap-2 border-t border-white/10 bg-black/40 px-3 py-2.5"
          >
            {voice.supported && (
              <button
                type="button"
                onClick={toggleMic}
                className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full border transition ${
                  voice.listening
                    ? "border-rose-400/60 bg-rose-500/30 text-rose-100"
                    : "border-white/10 bg-white/5 text-white/80 hover:bg-white/10"
                }`}
                data-testid="button-voice-toggle"
                aria-label={voice.listening ? "Stop voice input" : "Start voice input"}
                title={voice.listening ? "Stop listening" : "Voice search"}
              >
                {voice.listening ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
              </button>
            )}
            <input
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="What are you in the mood for?"
              className="flex-1 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-sm text-white placeholder:text-white/40 focus:border-rose-500/50 focus:outline-none"
              disabled={pending}
              data-testid="input-copilot"
            />
            <button
              type="submit"
              disabled={pending || !input.trim()}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-rose-500 to-amber-500 text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
              data-testid="button-copilot-send"
              aria-label="Send"
            >
              <Send className="h-4 w-4" />
            </button>
          </form>
        </div>
      </div>
    </>
  );
}

function PickCard({ pick }: { pick: ChatPick }) {
  return (
    <a
      href={pick.tmdbId ? `/discover?focus=${pick.mediaType}:${pick.tmdbId}` : "#"}
      onClick={(e) => {
        if (!pick.tmdbId) e.preventDefault();
      }}
      className="flex items-stretch gap-2 rounded-xl border border-white/10 bg-white/[0.03] p-2 text-left transition hover:border-white/20 hover:bg-white/[0.06]"
      data-testid="copilot-pick"
    >
      <div className="h-20 w-14 shrink-0 overflow-hidden rounded-md bg-zinc-900">
        {pick.poster ? (
          <img
            src={pick.poster}
            alt={pick.title}
            className="h-full w-full object-cover"
            loading="lazy"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-white/30">
            <Film className="h-5 w-5" />
          </div>
        )}
      </div>
      <div className="flex min-w-0 flex-1 flex-col justify-between">
        <div>
          <p className="truncate text-sm font-semibold text-white">
            {pick.title}
            {pick.year && <span className="ml-1 text-white/50">· {pick.year}</span>}
          </p>
          <p className="mt-0.5 line-clamp-2 text-[11px] leading-snug text-white/65">{pick.reason}</p>
        </div>
        {pick.voteAverage != null && (
          <p className="text-[10px] uppercase tracking-wide text-amber-300/80">
            ★ {pick.voteAverage.toFixed(1)}
          </p>
        )}
      </div>
    </a>
  );
}
