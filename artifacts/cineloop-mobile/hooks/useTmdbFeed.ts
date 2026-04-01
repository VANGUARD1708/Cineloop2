import { useQuery } from "@tanstack/react-query";
import type { FeedItem } from "@/components/FeedCard";
import type { Category } from "@/components/CategoryTabs";

const API_BASE = process.env.EXPO_PUBLIC_DOMAIN
  ? `https://${process.env.EXPO_PUBLIC_DOMAIN}/api`
  : "/api";

async function fetchTmdbPage(path: string, page: number): Promise<FeedItem[]> {
  const sep = path.includes("?") ? "&" : "?";
  const url = `${API_BASE}${path}${sep}page=${page}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error("TMDB fetch failed");
  const data = await res.json();
  return (data.results || []).map((item: any) => ({
    id: String(item.id),
    title: item.title || item.name || "Untitled",
    overview: item.overview || "",
    poster_path: item.poster_path || null,
    backdrop_path: item.backdrop_path || null,
    media_type: item.media_type || (item.title ? "movie" : "tv"),
    vote_average: item.vote_average || 0,
    genre_ids: item.genre_ids || [],
    release_date: item.release_date,
    first_air_date: item.first_air_date,
  }));
}

const ENDPOINTS: Record<Category, string> = {
  foryou: "/tmdb/trending/all",
  trending: "/tmdb/trending/movie",
  movies: "/tmdb/trending/movie",
  series: "/tmdb/trending-tv",
  anime: "/tmdb/anime",
};

export function useTmdbFeed(category: Category) {
  return useQuery<FeedItem[]>({
    queryKey: ["tmdb-feed", category],
    queryFn: () => fetchTmdbPage(ENDPOINTS[category], 1),
    staleTime: 5 * 60 * 1000,
    retry: 2,
  });
}
