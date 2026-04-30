import { useQuery } from "@tanstack/react-query";

export interface MediaDetails {
  title: string;
  year: number | null;
  runtime: number | null;
  overview: string;
  genres: string[];
  voteAverage: number | null;
  voteCount: number | null;
  tagline: string | null;
  seasons: number | null;
  episodes: number | null;
}

export default function useMediaDetails(mediaType: string | undefined, mediaId: string | undefined) {
  const enabled = Boolean(mediaType && mediaId);
  return useQuery<MediaDetails | null>({
    queryKey: ["media-details", mediaType, mediaId],
    queryFn: async () => {
      const r = await fetch(`/api/media/${mediaType}/${mediaId}/details`);
      if (!r.ok) return null;
      return (await r.json()) as MediaDetails;
    },
    enabled,
    staleTime: 24 * 60 * 60 * 1000,
  });
}
