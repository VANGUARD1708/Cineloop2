import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

const BASE = import.meta.env.BASE_URL;

export interface DirectorPick {
  mediaType: "movie" | "tv";
  tmdbId: number;
  title: string;
  year: number | null;
  posterPath: string | null;
  backdropPath: string | null;
  overview: string | null;
  voteAverage: number | null;
  take: string;
}

export interface TasteProfile {
  topGenres: string[];
  topDecades: string[];
  themes: string[];
  vibe: string;
  summary: string;
  historyCount: number;
  lastRefreshedAt: string;
}

async function fetchJson<T>(path: string): Promise<T> {
  const r = await fetch(`${BASE}${path}`, { credentials: "include" });
  if (!r.ok) throw new Error(`${r.status}`);
  return (await r.json()) as T;
}

export function useTasteProfile(enabled = true) {
  return useQuery({
    queryKey: ["taste-profile"],
    queryFn: () =>
      fetchJson<{ profile: TasteProfile | null; needsHistory: boolean }>(
        "api/recommendations/taste-profile",
      ),
    enabled,
    staleTime: 10 * 60 * 1000,
    retry: false,
  });
}

export function useForYou(enabled = true) {
  return useQuery({
    queryKey: ["for-you"],
    queryFn: () =>
      fetchJson<{
        picks: DirectorPick[];
        intro: string;
        needsHistory?: boolean;
        generatedAt?: string;
      }>("api/recommendations/for-you"),
    enabled,
    staleTime: 60 * 60 * 1000,
    retry: false,
  });
}

export function useDailyMood(enabled = true) {
  return useQuery({
    queryKey: ["daily-mood"],
    queryFn: () =>
      fetchJson<{
        title: string;
        tagline: string;
        picks: DirectorPick[];
        generatedAt: string;
      }>("api/recommendations/daily-mood"),
    enabled,
    staleTime: 12 * 60 * 60 * 1000,
    retry: false,
  });
}

export function useBecauseYouWatched(
  mediaType: "movie" | "tv" | null,
  mediaId: string | null,
) {
  return useQuery({
    queryKey: ["byw", mediaType, mediaId],
    queryFn: () =>
      fetchJson<{ picks: DirectorPick[]; sourceTitle: string | null }>(
        `api/recommendations/because-you-watched/${mediaType}/${mediaId}`,
      ),
    enabled: !!mediaType && !!mediaId,
    staleTime: 7 * 24 * 60 * 60 * 1000,
    retry: false,
  });
}

export function useRefreshDirectorMode() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const r = await fetch(`${BASE}api/recommendations/refresh`, {
        method: "POST",
        credentials: "include",
      });
      if (!r.ok) throw new Error("Refresh failed");
      return await r.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["taste-profile"] });
      qc.invalidateQueries({ queryKey: ["for-you"] });
      qc.invalidateQueries({ queryKey: ["daily-mood"] });
    },
  });
}
