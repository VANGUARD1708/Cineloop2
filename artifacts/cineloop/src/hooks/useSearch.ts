import { useEffect, useState } from "react";
import { searchMovies, getImage } from "@/lib/tmdb";

export interface SearchResult {
  id: string;
  type: "post" | "user" | "tag";
  title: string;
  subtitle?: string;
  image?: string;
}

export default function useSearch() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!query) {
      setResults([]);
      return;
    }

    const timeout = setTimeout(async () => {
      try {
        setLoading(true);

        const data = await searchMovies(query);

        const mapped: SearchResult[] =
          data.results.slice(0, 8).map((movie: any) => ({
            id: String(movie.id),
            type: "post",
            title: movie.title,
            subtitle: movie.release_date?.split("-")[0],
            image: getImage(movie.poster_path, "w92"),
          }));

        setResults(mapped);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    }, 300);

    return () => clearTimeout(timeout);
  }, [query]);

  return {
    query,
    setQuery,
    results,
    loading,
  };
}