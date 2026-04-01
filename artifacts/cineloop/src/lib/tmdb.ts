const API = "https://api.themoviedb.org/3";
const KEY = import.meta.env.VITE_TMDB_API_KEY;

/* TRENDING */
export async function fetchTrending(page = 1) {
  const res = await fetch(
    `${API}/trending/movie/week?api_key=${KEY}&page=${page}`
  );

  if (!res.ok) throw new Error("Failed to fetch trending");
  return res.json();
}

/* SEARCH */
export async function searchMovies(query: string) {
  const res = await fetch(
    `${API}/search/movie?api_key=${KEY}&query=${encodeURIComponent(query)}`
  );

  if (!res.ok) throw new Error("Failed to search movies");
  return res.json();
}

/* GET TRAILER */
export async function getTrailer(movieId: number) {
  try {
    const res = await fetch(
      `${API}/movie/${movieId}/videos?api_key=${KEY}`
    );

    const data = await res.json();

    const trailer = data.results?.find(
      (v: any) =>
        v.site === "YouTube" &&
        (v.type === "Trailer" || v.type === "Teaser")
    );

    if (!trailer) return null;

    return `https://www.youtube.com/embed/${trailer.key}`;
  } catch {
    return null;
  }
}

/* IMAGE HELPER (THIS FIXES YOUR ERROR) */
export function getImage(path?: string, size = "w500") {
  if (!path) return "";
  return `https://image.tmdb.org/t/p/${size}${path}`;
}

/* MAP TO FEED */
export function mapToFeedItem(movie: any) {
  return {
    film: {
      id: movie.id,
      title: movie.title,
      poster: getImage(movie.poster_path, "w500"),
    },
    episode: {
      id: movie.id,
      trailerId: movie.id,
      createdAt: movie.release_date || "2026",
      likes: Math.floor(Math.random() * 500) + 10,
      tags: buildTags(movie),
    },
  };
}

/* TAGS */
function buildTags(movie: any) {
  const tags = [];

  if (movie.genre_ids?.length) {
    tags.push(movie.genre_ids[0]);
  }

  if (movie.vote_average > 7) {
    tags.push("Trending");
  }

  tags.push("Movie");

  return tags.map((t) => String(t));
}