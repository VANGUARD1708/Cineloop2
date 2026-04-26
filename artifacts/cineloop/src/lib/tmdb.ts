export function getImage(path?: string, size = "w780") {
  if (!path) return "";
  return `https://image.tmdb.org/t/p/${size}${path}`;
}

export interface RawTmdbItem {
  id: number;
  title?: string;
  name?: string;
  overview?: string;
  poster_path?: string;
  backdrop_path?: string;
  release_date?: string;
  first_air_date?: string;
  vote_average?: number;
  genre_ids?: number[];
  media_type?: string;
}

async function fetchTrailer(id: number, type: string) {
  try {
    const res = await fetch(`/api/tmdb/videos?id=${id}&type=${type}`);
    if (!res.ok) return null;

    const data = await res.json();

    const video =
      data?.results?.find(
        (v: any) => v.site === "YouTube" && v.type === "Trailer"
      ) ||
      data?.results?.find((v: any) => v.site === "YouTube");

    return video?.key || null;
  } catch {
    return null;
  }
}

export async function mapToFeedItem(movie: RawTmdbItem) {
  const isTV = !movie.title || movie.media_type === "tv";
  const title = movie.title || movie.name || "Untitled";

  const trailerKey = await fetchTrailer(
    movie.id,
    isTV ? "tv" : "movie"
  );

  return {
    film: {
      id: movie.id,
      tmdbId: movie.id,
      title,
      poster: getImage(movie.poster_path, "w500"),
      backdrop: getImage(movie.backdrop_path, "w1280"),
      overview: movie.overview || "",
      rating: movie.vote_average || 0,
      year: (movie.release_date || movie.first_air_date || "").slice(0, 4),
      type: isTV ? "tv" : "movie",
    },
    episode: {
      id: String(movie.id),
      trailerId: trailerKey,
      youtubeFallback: null,
      videoUrl: null,
      createdAt:
        movie.release_date ||
        movie.first_air_date ||
        new Date().toISOString(),
      likes: Math.floor(Math.random() * 9000) + 500,
      tags: [],
    },
  };
}

export async function fetchFeed(category: string, page = 1) {
  const endpoints: Record<string, string> = {
    foryou: `/api/tmdb/trending/all?page=${page}`,
    trending: `/api/tmdb/trending/movie?page=${page}`,
    movies: `/api/tmdb/trending/movie?page=${page}`,
    series: `/api/tmdb/trending-tv?page=${page}`,
    anime: `/api/tmdb/anime?page=${page}`,
  };

  const url = endpoints[category] || endpoints.foryou;
  const res = await fetch(url);

  if (!res.ok) throw new Error("Failed to fetch feed");

  const data = await res.json();

  const mapped = await Promise.all(
    (data.results || []).slice(0, 20).map(mapToFeedItem)
  );

  return mapped;
}

export async function searchMovies(query: string) {
  if (!query) return [];

  const res = await fetch(
    `/api/tmdb/search?q=${encodeURIComponent(query)}`
  );

  if (!res.ok) return [];

  const data = await res.json();

  const mapped = await Promise.all(
    (data.results || []).map(mapToFeedItem)
  );

  return mapped;
}