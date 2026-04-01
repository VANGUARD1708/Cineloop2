import { useEffect, useState } from "react";
import FeedCard from "@/components/feed/FeedCard";
import { fetchTrending, mapToFeedItem, getTrailer } from "@/lib/tmdb";

export default function FeedPage() {
  const [items, setItems] = useState<any[]>([]);

  useEffect(() => {
    async function load() {
      const data = await fetchTrending(1);

      const valid: any[] = [];

      for (const movie of data.results) {
        const trailer = await getTrailer(movie.id);

        // only include movies that actually have video
        if (trailer) {
          valid.push(mapToFeedItem(movie));
        }

        // stop when we have enough
        if (valid.length >= 10) break;
      }

      setItems(valid);
    }

    load();
  }, []);

  return (
    <div className="h-screen w-full overflow-y-scroll snap-y snap-mandatory bg-black">
      {items.map((item) => (
        <FeedCard key={item.episode.id} item={item} />
      ))}
    </div>
  );
}