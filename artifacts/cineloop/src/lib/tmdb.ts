// All TMDB calls go through our server proxy — no client-side API key needed.

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

export function mapToFeedItem(movie: RawTmdbItem) {
  const isTV = !movie.title || movie.media_type === "tv";
  return {
    film: {
      id: movie.id,
      title: movie.title || movie.name || "Untitled",
      poster: getImage(movie.poster_path, "w500"),
      backdrop: getImage(movie.backdrop_path, "w1280"),
      overview: movie.overview || "",
      rating: movie.vote_average || 0,
      year: (movie.release_date || movie.first_air_date || "").slice(0, 4),
      type: isTV ? "tv" : "movie",
    },
    episode: {
      id: String(movie.id),
      trailerId: movie.id,
      createdAt: movie.release_date || movie.first_air_date || "2026",
      likes: Math.floor(Math.random() * 9000) + 500,
      tags: buildTags(movie),
      videoUrl: null as string | null,
    },
  };
}

function buildTags(movie: RawTmdbItem) {
  const tags: string[] = [];
  if (movie.vote_average && movie.vote_average > 7.5) tags.push("Top Rated");
  if (movie.genre_ids?.includes(28)) tags.push("Action");
  if (movie.genre_ids?.includes(35)) tags.push("Comedy");
  if (movie.genre_ids?.includes(27)) tags.push("Horror");
  if (movie.genre_ids?.includes(878)) tags.push("Sci-Fi");
  if (movie.genre_ids?.includes(16)) tags.push("Animation");
  tags.push(movie.title ? "Movie" : "Series");
  return tags;
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
  return (data.results || []).map(mapToFeedItem);
}
