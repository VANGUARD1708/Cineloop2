import { useQuery } from "@tanstack/react-query";

export interface Presence {
  viewersNow: number;
  friendsWatching: number;
  bucket: number;
  refreshIn: number;
}

const fallback: Presence = { viewersNow: 0, friendsWatching: 0, bucket: 0, refreshIn: 0 };

export default function usePresence(
  mediaType: string | undefined,
  mediaId: string | undefined,
  options?: { enabled?: boolean },
) {
  const enabled = Boolean(mediaType && mediaId) && options?.enabled !== false;
  const q = useQuery<Presence>({
    queryKey: ["presence", mediaType, mediaId],
    queryFn: async () => {
      const r = await fetch(`/api/director/presence/${mediaType}/${mediaId}`);
      if (!r.ok) return fallback;
      return (await r.json()) as Presence;
    },
    enabled,
    staleTime: 60_000,
    refetchInterval: 5 * 60 * 1000,
    refetchIntervalInBackground: false,
  });
  return q.data ?? fallback;
}
