import { useCallback, useEffect, useRef, useState } from "react";

const STORAGE_KEY = "cl:volume:v1";
const DEFAULT_VOLUME = 0.7;
// Throttle window for localStorage writes + cross-card broadcast during drag.
// Live state still updates synchronously per move so the slider feels instant;
// only the persistence/fan-out is rate-limited to protect feed scroll perf.
const PERSIST_THROTTLE_MS = 80;

interface VolumePref {
  muted: boolean;
  volume: number;
}

function read(): VolumePref {
  if (typeof window === "undefined") return { muted: true, volume: DEFAULT_VOLUME };
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return { muted: true, volume: DEFAULT_VOLUME };
    const parsed = JSON.parse(raw) as Partial<VolumePref>;
    const volume = typeof parsed.volume === "number" ? Math.max(0, Math.min(1, parsed.volume)) : DEFAULT_VOLUME;
    const muted = typeof parsed.muted === "boolean" ? parsed.muted : true;
    return { muted, volume };
  } catch {
    return { muted: true, volume: DEFAULT_VOLUME };
  }
}

/**
 * Cross-card persisted mute + volume preference.
 * Syncs across mounted FeedCards via a custom 'cl:volume' event so toggling
 * sound on one card immediately reflects on the next as you swipe.
 */
export default function useVolumePref(): {
  muted: boolean;
  volume: number;
  setMuted: (m: boolean) => void;
  setVolume: (v: number) => void;
  toggleMuted: () => void;
} {
  const [state, setState] = useState<VolumePref>(read);

  // Pending throttle state — coalesces rapid drag updates into one storage write.
  const pendingRef = useRef<VolumePref | null>(null);
  const throttleTimer = useRef<number | null>(null);
  const lastFlushAt = useRef(0);

  const flush = useCallback(() => {
    if (!pendingRef.current) return;
    const next = pendingRef.current;
    pendingRef.current = null;
    lastFlushAt.current = Date.now();
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      window.dispatchEvent(new CustomEvent("cl:volume", { detail: next }));
    } catch {
      /* storage may be blocked */
    }
  }, []);

  // Schedules a throttled persist + broadcast. Local state updates immediately
  // so the slider/icon never lag during a drag.
  const persist = useCallback(
    (next: VolumePref, opts?: { immediate?: boolean }) => {
      setState(next);
      pendingRef.current = next;
      if (opts?.immediate) {
        if (throttleTimer.current) {
          window.clearTimeout(throttleTimer.current);
          throttleTimer.current = null;
        }
        flush();
        return;
      }
      const elapsed = Date.now() - lastFlushAt.current;
      if (elapsed >= PERSIST_THROTTLE_MS) {
        flush();
      } else if (!throttleTimer.current) {
        throttleTimer.current = window.setTimeout(() => {
          throttleTimer.current = null;
          flush();
        }, PERSIST_THROTTLE_MS - elapsed);
      }
    },
    [flush],
  );

  useEffect(() => {
    const onSync = (e: Event) => {
      const next = (e as CustomEvent<VolumePref>).detail;
      if (!next) return;
      setState((prev) =>
        prev.muted === next.muted && prev.volume === next.volume ? prev : next,
      );
    };
    const onStorage = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY && e.newValue) {
        try {
          const next = JSON.parse(e.newValue) as VolumePref;
          setState(next);
        } catch {
          /* ignore */
        }
      }
    };
    window.addEventListener("cl:volume", onSync as EventListener);
    window.addEventListener("storage", onStorage);
    return () => {
      window.removeEventListener("cl:volume", onSync as EventListener);
      window.removeEventListener("storage", onStorage);
      // Flush any pending write so we don't lose the user's last position.
      if (throttleTimer.current) {
        window.clearTimeout(throttleTimer.current);
        throttleTimer.current = null;
      }
      flush();
    };
  }, [flush]);

  // Mute/unmute is a discrete user action — flush immediately so other tabs
  // and cards reflect it without delay.
  const setMuted = useCallback(
    (m: boolean) => persist({ ...state, muted: m }, { immediate: true }),
    [persist, state],
  );

  const setVolume = useCallback(
    (v: number) => {
      const clamped = Math.max(0, Math.min(1, v));
      // Auto-unmute when the user drags volume above 0; auto-mute at 0.
      const muted = clamped === 0 ? true : state.muted && clamped > 0 ? false : state.muted;
      // Throttled — drag updates fire many times per second.
      persist({ muted, volume: clamped });
    },
    [persist, state.muted],
  );

  const toggleMuted = useCallback(
    () => persist({ ...state, muted: !state.muted }, { immediate: true }),
    [persist, state],
  );

  return { muted: state.muted, volume: state.volume, setMuted, setVolume, toggleMuted };
}
