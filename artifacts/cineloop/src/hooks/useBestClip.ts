import { useQuery } from "@tanstack/react-query";

export interface BestClip {
  youtubeId: string | null;
  kind: string | null;
  name: string | null;
  reason: string | null;
  aiCurated?: boolean;
}

const empty: BestClip = { youtubeId: null, kind: null, name: null, reason: null, aiCurated: false };

export default function useBestClip(
  mediaType: string | undefined,
  mediaId: string | undefined,
  options?: { enabled?: boolean },
) {
  const enabled = Boolean(mediaType && mediaId) && options?.enabled !== false;
  const q = useQuery<BestClip>({
    queryKey: ["best-clip", mediaType, mediaId],
    queryFn: async () => {
      const r = await fetch(`/api/director/best-clip/${mediaType}/${mediaId}`);
      if (!r.ok) return empty;
      return (await r.json()) as BestClip;
    },
    enabled,
    staleTime: 7 * 24 * 60 * 60 * 1000, // best clip won't change often
  });
  return q.data ?? empty;
}
